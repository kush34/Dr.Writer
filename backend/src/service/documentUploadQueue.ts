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

const uploadQueue: UploadQueueJob[] = [];
let activeWorker: ChildProcess | null = null;

const resolveWorkerPath = () => {
  const isCompiledRuntime = __filename.endsWith(".js");

  return isCompiledRuntime
    ? path.resolve(__dirname, "../workers/documentUploadWorker.js")
    : path.resolve(__dirname, "../workers/documentUploadWorker.ts");
};

const createWorker = (job: UploadQueueJob) => {
  const workerPath = resolveWorkerPath();
  const isTypeScriptWorker = workerPath.endsWith(".ts");

  return fork(workerPath, [], {
    execArgv: isTypeScriptWorker ? ["-r", "ts-node/register"] : [],
    stdio: ["inherit", "inherit", "inherit", "ipc"],
    env: process.env,
  });
};

const processNextUpload = () => {
  if (activeWorker || uploadQueue.length === 0) {
    return;
  }

  const nextJob = uploadQueue.shift();
  if (!nextJob) {
    return;
  }

  const worker = createWorker(nextJob);
  activeWorker = worker;

  const finalizeWorker = () => {
    activeWorker = null;
    processNextUpload();
  };

  worker.once("message", async (message: WorkerMessage) => {
    if (message.type === "failed") {
      console.error(
        `Document upload worker failed for ${message.documentId}: ${message.error}`
      );
    }
  });

  worker.once("exit", (code) => {
    if (code !== 0) {
      console.error(
        `Document upload worker exited with code ${code} for ${nextJob.documentId}`
      );
    }
    finalizeWorker();
  });

  worker.send(nextJob);
};

// In enqueueDocumentUpload, resolve absolute path before queuing
export const enqueueDocumentUpload = async (userId: string, file: UploadedFile) => {
  if (!file.path) throw new AppError(400, "Uploaded file path is missing");

  const absolutePath = path.resolve(file.path); // ← add this

  const document = await Document.create({
    user_id: userId,
    title: file.originalname,
    sourceFileName: file.originalname,
    uploadStatus: "queued",
  });

  uploadQueue.push({
    documentId: document._id.toString(),
    filePath: absolutePath, // ← use absolute path
    originalName: file.originalname,
  });

  processNextUpload();
  return { success: true, message: "document upload queued", document };
};
