const express = require("express");
const ownerController = require("../controllers/ownerController");
const { authenticate, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.use(authenticate, requireRole("business_owner", "super_admin"));

router.get("/analytics", asyncHandler(ownerController.analytics));
router.get("/workspace", asyncHandler(ownerController.workspace));
router.patch("/businesses/:id", asyncHandler(ownerController.updateBusiness));
router.post("/offerings", asyncHandler(ownerController.createOffering));
router.patch("/offerings/:id", asyncHandler(ownerController.updateOffering));
router.delete("/offerings/:id", asyncHandler(ownerController.deleteOffering));

module.exports = router;
