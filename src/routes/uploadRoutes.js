const express = require("express");
const uploadController = require("../controllers/uploadController");
const { optionalAuth } = require("../middleware/auth");
const { authenticate, requireRole } = require("../middleware/auth");
const { upload, kycUpload } = require("../middleware/upload");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.post(
  "/",
  optionalAuth,
  upload.single("file"),
  asyncHandler(uploadController.uploadFile)
);

router.post(
  "/kyc",
  authenticate,
  requireRole("business_owner", "super_admin"),
  kycUpload.single("file"),
  asyncHandler(uploadController.uploadKycFile)
);

module.exports = router;
