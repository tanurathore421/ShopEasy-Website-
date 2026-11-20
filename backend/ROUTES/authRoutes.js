const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
 
} = require("../CONTROLLERS/auth.controller");

const authMiddleware = require("../MIDDLEWARE/authMiddleware");


// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// get PROFILE
router.get(
  "/profile", authMiddleware,getProfile)

  // Protected profile update
router.put("/profile", authMiddleware, updateProfile);

// Protected password change
router.put("/change-password", authMiddleware, changePassword);
 

module.exports = router;
