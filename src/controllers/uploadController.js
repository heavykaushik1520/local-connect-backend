const { created } = require("../utils/apiResponse");

function uploadFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Use the 'file' field." });
  }

  const url = `/uploads/${req.file.filename}`;

  return created(res, {
    url,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
}

function uploadKycFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Use the 'file' field." });
  }

  const url = `/uploads/kyc/${req.file.filename}`;

  return created(res, {
    url,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    purpose: "kyc"
  });
}

module.exports = { uploadFile, uploadKycFile };
