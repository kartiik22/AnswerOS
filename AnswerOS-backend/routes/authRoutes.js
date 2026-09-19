const express = require("express");
const { signup, login, getMe } = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

// Public routes
router.post("/signup", signup); // POST /auth/signup
router.post("/login", login);   // POST /auth/login

// Protected routes
router.get("/me", authenticate, getMe); // GET /auth/me
router.get("/userdetails", authenticate, getMe); // GET /auth/userdetails (alias)

module.exports = router;
