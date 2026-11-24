import fs from "fs";
import { docxToTiptap } from "../utils/docxImport";
import connectDB from "../Config/database";
import Document from "../Models/documentModel";

type UploadQueueJob = {
  documentId: string;
  filePath: string;
  originalName: string;
};

// process.exit can drop an IPC message that is still in flight, so wait for the send to finish.
const report = (message: object) =>
  new Promise<void>((resolve) => {
    if (!process.send) return resolve();
    process.send(message, () => resolve());
  });

// The stored message reaches the user. Parser errors can contain internals, so they are only logged.
const UPLOAD_FAILED_MESSAGE = "Could not read this .docx file. It may be corrupted or unsupported.";

const failUpload = async (documentId: string, error: unknown) => {
  const detail = error instanceof Error ? error.message : "Upload processing failed";

  await Document.findByIdAndUpdate(documentId, {
    uploadStatus: "failed",
    uploadError: UPLOAD_FAILED_MESSAGE,
    uploadFilePath: null,
  });

  await report({ type: "failed", documentId, error: detail });
};

const cleanupUploadFile = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

process.on("message", async (job: UploadQueueJob) => {
  try {
    await connectDB();

    const fileContent = fs.readFileSync(job.filePath);
    const content = await docxToTiptap(fileContent);

    await Document.findByIdAndUpdate(job.documentId, {
      title: job.originalName,
      sourceFileName: job.originalName,
      content,
      editedAt: new Date(),
      uploadStatus: "completed",
      uploadError: null,
      uploadFilePath: null,
    });

    await report({ type: "completed", documentId: job.documentId });

    cleanupUploadFile(job.filePath);
    process.exit(0);
  } catch (error) {
    try {
      await failUpload(job.documentId, error);
    } finally {
      cleanupUploadFile(job.filePath);
      process.exit(1);
    }
  }
});
