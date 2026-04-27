import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(__dirname, "../../uploads"); // adjust depth to reach project root
fs.mkdirSync(uploadDir, { recursive: true }); // auto-create if missing

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const valid = /doc|docx/.test(path.extname(file.originalname).toLowerCase());
    valid ? cb(null, true) : cb(new Error("Only .doc and .docx files are allowed!"));
  },
});

export default upload;