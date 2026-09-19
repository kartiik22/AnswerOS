const jwt = require("jsonwebtoken");
const { Admin, CommonUser } = require("../models");

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      tenantId: user.tenantId || "default",
    },
    process.env.JWT_SECRET || "default_secret_key",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

// Find user in either Admin or CommonUser collection
async function findUserByEmail(email, selectPassword = false) {
  const normalizedEmail = email.toLowerCase();
  
  let adminQuery = Admin.findOne({ email: normalizedEmail });
  if (selectPassword) adminQuery = adminQuery.select("+password");
  const admin = await adminQuery;
  if (admin) return admin;

  let commonQuery = CommonUser.findOne({ email: normalizedEmail });
  if (selectPassword) commonQuery = commonQuery.select("+password");
  const common = await commonQuery;
  if (common) return common;

  return null;
}

// Find user by ID across both models
async function findUserById(id) {
  const admin = await Admin.findById(id);
  if (admin) return admin;
  const common = await CommonUser.findById(id);
  if (common) return common;
  return null;
}

// Signup Controller
async function signup(req, res) {
  try {
    const { name, email, password, role = "common", tenantId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!["admin", "common"].includes(role)) {
      return res.status(400).json({ error: "Role must be either 'admin' or 'common'." });
    }

    // Ensure email is not already registered in either collection
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    let user;
    if (role === "admin") {
      user = await Admin.create({
        name,
        email,
        password,
      });
    } else {
      user = await CommonUser.create({
        name,
        email,
        password,
        tenantId: tenantId || "default",
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      ok: true,
      message: `${role.toUpperCase()} registered successfully.`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || "default",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Login Controller
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Search across Admin and CommonUser models
    const user = await findUserByEmail(email, true);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user);

    res.json({
      ok: true,
      message: "Logged in successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || "default",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get Profile Controller
async function getMe(req, res) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({
      ok: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || "default",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  signup,
  login,
  getMe,
  generateToken,
};
