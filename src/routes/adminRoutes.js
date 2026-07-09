const express = require("express");
const adminController = require("../controllers/adminController");
const adminKycController = require("../controllers/adminKycController");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", asyncHandler(adminController.dashboard));
router.get("/kyc/stats", asyncHandler(adminKycController.stats));
router.get("/kyc", asyncHandler(adminKycController.list));
router.get("/kyc/:id", asyncHandler(adminKycController.getById));
router.patch("/kyc/:id/review", asyncHandler(adminKycController.review));
router.patch("/:table/:id", asyncHandler(adminController.patch));
router.delete("/:table/:id", asyncHandler(adminController.remove));
router.post("/testimonials", asyncHandler(adminController.createTestimonial));
router.post("/communities", asyncHandler(adminController.createCommunity));
router.post("/ads", asyncHandler(adminController.createAd));
router.post("/offerings", asyncHandler(adminController.createOffering));

module.exports = router;
