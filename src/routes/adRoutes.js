const express = require("express");
const adController = require("../controllers/adController");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/", asyncHandler(adController.serve));
router.post("/:id/event", asyncHandler(adController.recordEvent));

module.exports = router;
