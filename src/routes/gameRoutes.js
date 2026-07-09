const express = require("express");
const gameController = require("../controllers/gameController");
const { asyncHandler } = require("../middleware/errorHandler");
const { optionalAuth, authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/hub", optionalAuth, asyncHandler(gameController.hub));
router.post("/claim", authenticate, asyncHandler(gameController.claim));

module.exports = router;
