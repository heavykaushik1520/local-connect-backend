const express = require("express");
const authRoutes = require("./authRoutes");
const businessRoutes = require("./businessRoutes");
const businessController = require("../controllers/businessController");
const adminController = require("../controllers/adminController");
const ownerRoutes = require("./ownerRoutes");
const adminRoutes = require("./adminRoutes");
const communityRoutes = require("./communityRoutes");
const adRoutes = require("./adRoutes");
const leadRoutes = require("./leadRoutes");
const uploadRoutes = require("./uploadRoutes");
const userRoutes = require("./userRoutes");
const contactRoutes = require("./contactRoutes");
const gameRoutes = require("./gameRoutes");
const kycRoutes = require("./kycRoutes");
const paymentRoutes = require("./paymentRoutes");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { createModel } = require("../models/GenericModel");
const { success } = require("../utils/apiResponse");
const Testimonial = createModel("testimonials");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, database: "mysql", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/businesses", businessRoutes);
router.use("/owner", ownerRoutes);
router.use("/admin", adminRoutes);
router.use("/communities", communityRoutes);
router.use("/ads", adRoutes);
router.use("/leads", leadRoutes);
router.use("/upload", uploadRoutes);
router.use("/users", userRoutes);
router.use("/contact", contactRoutes);
router.use("/games", gameRoutes);
router.use("/kyc", kycRoutes);
router.use("/payments", paymentRoutes);

router.get("/testimonials", asyncHandler(async (_req, res) => {
  const rows = await Testimonial.findAll();
  return success(res, rows.filter((t) => t.status === "Published").map((t) => ({
    id: t.id,
    name: t.name,
    city: t.city,
    quote: t.quote,
    status: t.status
  })));
}));

// Legacy aliases for older clients
router.post("/owner-listings", asyncHandler(businessController.createListing));
router.get("/admin-data", authenticate, requireAdmin, asyncHandler(adminController.dashboard));

module.exports = router;
