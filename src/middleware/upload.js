const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm"
]);

const KYC_MIME_TYPES = new Set([
  ...ALLOWED_MIME_TYPES,
  "application/pdf"
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const KYC_MAX_FILE_SIZE = 8 * 1024 * 1024;

const KYC_UPLOAD_DIR = path.join(UPLOAD_DIR, "kyc");
if (!fs.existsSync(KYC_UPLOAD_DIR)) {
  fs.mkdirSync(KYC_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || "";
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 40) || "file";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  }
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error("Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, or WebM."), { statusCode: 400 }));
  }
}

function kycFileFilter(_req, file, cb) {
  if (KYC_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error("Unsupported KYC file. Use JPEG, PNG, WebP, PDF, or MP4."), { statusCode: 400 })
    );
  }
}

const kycStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, KYC_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || "";
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 40) || "kyc";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 }
});

const kycUpload = multer({
  storage: kycStorage,
  fileFilter: kycFileFilter,
  limits: { fileSize: KYC_MAX_FILE_SIZE, files: 1 }
});

module.exports = {
  upload,
  kycUpload,
  UPLOAD_DIR,
  KYC_UPLOAD_DIR,
  MAX_FILE_SIZE,
  KYC_MAX_FILE_SIZE
};
