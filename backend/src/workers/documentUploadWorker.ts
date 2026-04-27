import fs from "fs";
import mammoth from "mammoth";
import connectDB from "../Config/database";
import Document from "../Models/documentModel";

type UploadQueueJob = {
  documentId: string;
  filePath: string;
  originalName: string;
};

const failUpload = async (documentId: string, error: unknown) => {
  const message = error instanceof Error ? error.message : "Upload processing failed";

  await Document.findByIdAndUpdate(documentId, {
    uploadStatus: "failed",
    uploadError: message,
  });

  if (process.send) {
    process.send({ type: "failed", documentId, error: message });
  }
};

const cleanupUploadFile = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

process.on("message", async (job: UploadQueueJob) => {
  try {
    await connectDB();

    await Document.findByIdAndUpdate(job.documentId, {
      uploadStatus: "processing",
      uploadError: null,
    });

    const fileContent = fs.readFileSync(job.filePath);
    const { value: text } = await mammoth.extractRawText({ buffer: fileContent });

    await Document.findByIdAndUpdate(job.documentId, {
      title: job.originalName,
      sourceFileName: job.originalName,
      content: text,
      uploadStatus: "completed",
      uploadError: null,
    });

    if (process.send) {
      process.send({ type: "completed", documentId: job.documentId });
    }

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
