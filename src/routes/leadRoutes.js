const express = require("express");
const leadController = require("../controllers/leadController");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.post("/", asyncHandler(leadController.create));

module.exports = router;
