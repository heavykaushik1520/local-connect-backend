const express = require("express");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.post("/login", asyncHandler(authController.login));
router.post("/register", asyncHandler(authController.register));
router.post("/register-customer", asyncHandler(authController.registerCustomer));
router.get("/me", authenticate, asyncHandler(authController.me));
router.patch("/profile", authenticate, asyncHandler(authController.updateProfile));
router.post("/change-password", authenticate, asyncHandler(authController.changePassword));

module.exports = router;
