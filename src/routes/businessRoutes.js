const express = require("express");
const businessController = require("../controllers/businessController");
const { optionalAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/", asyncHandler(businessController.list));
router.get("/:slug", asyncHandler(businessController.getBySlug));
router.post("/listings", optionalAuth, asyncHandler(businessController.createListing));

module.exports = router;
