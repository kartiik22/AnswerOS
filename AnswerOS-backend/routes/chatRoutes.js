const express = require("express");
const { chat } = require("../controllers/chatController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();
router.post("/", authenticate, chat); // POST /chat (requires Bearer token, accessible by common and admin)

module.exports = router;
