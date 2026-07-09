const express = require("express");
const communityController = require("../controllers/communityController");
const { asyncHandler } = require("../middleware/errorHandler");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", asyncHandler(communityController.list));
router.post("/join", optionalAuth, asyncHandler(communityController.join));
router.post("/posts", optionalAuth, asyncHandler(communityController.createPost));
router.get("/:id", optionalAuth, asyncHandler(communityController.getById));

module.exports = router;
