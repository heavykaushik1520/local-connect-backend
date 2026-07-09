const express = require("express");
const paymentController = require("../controllers/paymentController");
const { authenticate, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.post(
  "/create-order",
  authenticate,
  requireRole("business_owner", "super_admin"),
  asyncHandler(paymentController.createOrder)
);

router.post(
  "/verify",
  authenticate,
  requireRole("business_owner", "super_admin"),
  asyncHandler(paymentController.verify)
);

router.get(
  "/subscriptions/:businessId",
  authenticate,
  requireRole("business_owner", "super_admin"),
  asyncHandler(paymentController.listForBusiness)
);

module.exports = router;
