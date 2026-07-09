const express = require("express");
const kycController = require("../controllers/kycController");
const { authenticate, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.use(authenticate, requireRole("business_owner", "super_admin"));

router.get("/me", asyncHandler(kycController.getMine));
router.put("/me", asyncHandler(kycController.saveDraft));
router.post("/me/submit", asyncHandler(kycController.submit));

module.exports = router;
