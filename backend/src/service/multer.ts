import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(__dirname, "../../uploads"); // adjust depth to reach project root
fs.mkdirSync(uploadDir, { recursive: true }); // auto-create if missing

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

export const INVALID_FILE_TYPE_MESSAGE = "Only .doc and .docx files are allowed!";
export const MAX_DOCX_UPLOAD_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_DOCX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const valid = /doc|docx/.test(path.extname(file.originalname).toLowerCase());
    valid ? cb(null, true) : cb(Object.assign(new Error(INVALID_FILE_TYPE_MESSAGE), { code: "INVALID_FILE_TYPE" }));
  },
});

export default upload;