import fs from "fs";
import path from "path";
import { ChildProcess, fork } from "child_process";
import Document from "../Models/documentModel";
import { AppError } from "../utils/appError";

type UploadQueueJob = {
  documentId: string;
  filePath: string;
  originalName: string;
};

type UploadedFile = {
  path: string;
  originalname: string;
};

type WorkerMessage =
  | { type: "completed"; documentId: string }
  | { type: "failed"; documentId: string; error: string };

/** A job that dies without reporting (worker crash, server restart) is tried this many times in total. */
export const MAX_UPLOAD_ATTEMPTS = 3;

const uploadQueue: UploadQueueJob[] = [];
let draining: Promise<void> | null = null;

const resolveWorkerPath = () => {
  const isCompiledRuntime = __filename.endsWith(".js");

  return isCompiledRuntime
    ? path.resolve(__dirname, "../workers/documentUploadWorker.js")
    : path.resolve(__dirname, "../workers/documentUploadWorker.ts");
};

const createWorker = (): ChildProcess => {
  const workerPath = resolveWorkerPath();
  const isTypeScriptWorker = workerPath.endsWith(".ts");

  return fork(workerPath, [], {
    execArgv: isTypeScriptWorker ? ["-r", "ts-node/register"] : [],
    stdio: ["inherit", "inherit", "inherit", "ipc"],
    env: process.env,
  });
};

const removeFile = (filePath: string) => {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Already gone; nothing to clean up.
  }
};

const failDocument = async (job: Pick<UploadQueueJob, "documentId" | "filePath">, message: string) => {
  await Document.findByIdAndUpdate(job.documentId, { uploadStatus: "failed", uploadError: message });
  removeFile(job.filePath);
};

/** Runs one worker and resolves true if it reported a result (success or a deliberate failure). */
const runWorker = (job: UploadQueueJob) =>
  new Promise<boolean>((resolve) => {
    let reported = false;
    let settled = false;
    // "error" (spawn failure, failed send) can arrive with no "exit", so every path settles through here.
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve(reported);
    };

    let worker: ChildProcess;
    try {
      worker = createWorker();
    } catch (error) {
      console.error(`Document upload worker could not start for ${job.documentId}:`, error);
      return settle();
    }

    worker.on("message", (message: WorkerMessage) => {
      reported = true;
      if (message.type === "failed") {
        console.error(`Document upload worker failed for ${message.documentId}: ${message.error}`);
      }
    });
    worker.once("error", (error) => {
      console.error(`Document upload worker could not run for ${job.documentId}: ${error.message}`);
      worker.kill();
      settle();
    });
    worker.once("exit", (code) => {
      if (!reported) console.error(`Document upload worker exited with code ${code} without a result for ${job.documentId}`);
      settle();
    });

    try {
      worker.send(job, (error) => {
        if (error) {
          console.error(`Document upload worker did not receive ${job.documentId}: ${error.message}`);
          worker.kill();
          settle();
        }
      });
    } catch (error) {
      console.error(`Document upload worker did not receive ${job.documentId}:`, error);
      worker.kill();
      settle();
    }
  });

const runJob = async (job: UploadQueueJob) => {
  // Claim the job and count the attempt before any work, so a crash loop cannot run forever.
  const claimed = await Document.findOneAndUpdate(
    { _id: job.documentId, uploadStatus: { $in: ["queued", "processing"] } },
    { $set: { uploadStatus: "processing", uploadError: null }, $inc: { uploadAttempts: 1 } },
    { new: true }
  ).select("+uploadAttempts");

  // The document was deleted or already finished while the job waited.
  if (!claimed) {
    removeFile(job.filePath);
    return;
  }

  const reported = await runWorker(job);
  if (reported) return;

  // No result: the worker crashed or was killed. Retry, then give up with a message the user can act on.
  // Only touch the document if it is still "processing": a result that was written but not reported must stand.
  const stillProcessing = { _id: job.documentId, uploadStatus: "processing" };
  if (claimed.uploadAttempts < MAX_UPLOAD_ATTEMPTS) {
    const requeued = await Document.findOneAndUpdate(stillProcessing, { uploadStatus: "queued" });
    if (requeued) uploadQueue.push(job);
  } else {
    const failed = await Document.findOneAndUpdate(stillProcessing, {
      uploadStatus: "failed",
      uploadError: "Import was interrupted several times. Please upload the file again.",
    });
    if (failed) removeFile(job.filePath);
  }
};

/** Processes queued jobs one at a time. Resolves when the queue is empty. Safe to call repeatedly. */
export const processUploadQueue = () => {
  // `draining` is cleared in a .finally() attached after the assignment. Clearing it inside the async
  // function would run synchronously when the queue is empty and then be overwritten by the assignment,
  // leaving a finished promise in place and blocking every later job.
  draining ??= (async () => {
    for (let job = uploadQueue.shift(); job; job = uploadQueue.shift()) {
      try {
        await runJob(job);
      } catch (error) {
        // A database error must not stop the queue; startup recovery picks this document up again.
        console.error(`Document upload job failed for ${job.documentId}:`, error);
      }
    }
  })().finally(() => {
    draining = null;
  });
  return draining;
};

export const enqueueDocumentUpload = async (userId: string, file: UploadedFile) => {
  if (!file.path) throw new AppError(400, "Uploaded file path is missing");

  const absolutePath = path.resolve(file.path);

  const document = await Document.create({
    user_id: userId,
    title: file.originalname,
    sourceFileName: file.originalname,
    uploadStatus: "queued",
    uploadFilePath: absolutePath,
  });

  uploadQueue.push({
    documentId: document._id.toString(),
    filePath: absolutePath,
    originalName: file.originalname,
  });

  void processUploadQueue();

  // The server path is bookkeeping for recovery and must not reach the client.
  const { uploadFilePath: _path, uploadAttempts: _attempts, ...publicDocument } = document.toObject();
  return { success: true, message: "document upload queued", document: publicDocument };
};

/**
 * Call once at startup. Imports left "queued" or "processing" by a restart are put back on the queue
 * if their file is still on disk and they have attempts left; otherwise they are marked failed so
 * the user is not left looking at "Importing…" forever.
 */
export const recoverStuckUploads = async () => {
  const stuck = await Document.find({ uploadStatus: { $in: ["queued", "processing"] } }).select(
    "+uploadFilePath +uploadAttempts title sourceFileName"
  );
  let requeued = 0;
  let failed = 0;

  for (const document of stuck) {
    const documentId = document._id.toString();
    const filePath = document.uploadFilePath;

    if (!filePath || !fs.existsSync(filePath)) {
      await failDocument({ documentId, filePath: filePath ?? "" }, "The uploaded file was lost during a restart. Please upload it again.");
      failed++;
    } else if ((document.uploadAttempts ?? 0) >= MAX_UPLOAD_ATTEMPTS) {
      await failDocument({ documentId, filePath }, "Import was interrupted several times. Please upload the file again.");
      failed++;
    } else {
      await Document.findByIdAndUpdate(documentId, { uploadStatus: "queued" });
      uploadQueue.push({ documentId, filePath, originalName: document.sourceFileName ?? document.title ?? "document.docx" });
      requeued++;
    }
  }

  void processUploadQueue();
  return { requeued, failed };
};
