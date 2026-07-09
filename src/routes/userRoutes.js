const express = require("express");
const userController = require("../controllers/userController");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/", asyncHandler(userController.list));
router.get("/:id", asyncHandler(userController.getById));
router.post("/", asyncHandler(userController.create));
router.patch("/:id", asyncHandler(userController.update));
router.delete("/:id", asyncHandler(userController.remove));
router.post("/:id/reset-password", asyncHandler(userController.resetPassword));

module.exports = router;
