const express = require("express");
const contactController = require("../controllers/contactController");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.post("/", asyncHandler(contactController.create));

module.exports = router;
