
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Auth = require("../MODELS/auth.model");

// ======================================
// VALIDATION HELPERS
// ======================================

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
};

const isValidPhone = (phone) => {
  return /^[6-9]\d{9}$/.test(phone);
};

// ======================================
// REGISTER USER
// ======================================


const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      phone,
      address,
    } = req.body;

    // Required fields
    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !confirmPassword ||
      !phone ||
      !address?.trim()
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Email validation
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    // Phone validation
    const phoneNumber = phone.trim();

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({
        message: "Enter a valid 10 digit mobile number",
      });
    }

    // Password validation
    if (
      typeof password !== "string" ||
      password.length < 6
    ) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    // Check duplicate email
    const existingUser = await Auth.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await Auth.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phoneNumber,
      address: address.trim(),
      role: "customer",
      isActive: true,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    return res.status(500).json({
      message: "Registration failed",
    });
  }
};


// ======================================
// LOGIN USER
// ======================================

const loginUser = async (req, res) => {
  try {
    const { email, password, captcha } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof captcha !== "string" ||
      !email.trim() ||
      !password ||
      !captcha.trim()
    ) {
      return res.status(400).json({
        message: "Email, password, and captcha are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Email validation
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Validate CAPTCHA
    if (
      typeof req.session?.captcha !== "string" ||
      captcha.trim().toUpperCase() !==
        req.session.captcha.toUpperCase()
    ) {
      return res.status(400).json({
        message: "Invalid captcha",
      });
    }

    // One-time CAPTCHA
    delete req.session.captcha;

    // Find user
    const user = await Auth.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check account status
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Your account is deactivated. Please contact support.",
      });
    }

    const role = user.role || "customer";

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Authentication service is not configured",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    req.session.userId = user._id.toString();
    req.session.isLoggedIn = true;

    return res.status(200).json({
      message: "Login successful",

      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role,
      },

      token,
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed",
    });
  }
};

// ======================================
// GET PROFILE
// ======================================

const getProfile = async (req, res) => {
  try {
    const user = await Auth.findById(req.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);

  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      message: "Could not get profile",
    });
  }
};

// ======================================
// UPDATE PROFILE
// ======================================

const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    // Required fields
    if (
      !name?.trim() ||
      !email?.trim()
    ) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    // Find user
    const user = await Auth.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Email validation
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    // Check duplicate email
    const existingEmail = await Auth.findOne({
      email: normalizedEmail,
      _id: { $ne: req.userId },
    });

    if (existingEmail) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Phone validation
    const phoneNumber = phone?.trim() || "";

    if (!isValidPhone(phoneNumber)) {
      return res.status(400).json({
        message: "Please enter a valid 10 digit Indian mobile number",
      });
    }

    // Update user details
    user.name = name.trim();
    user.email = normalizedEmail;
    user.phone = phoneNumber;
    user.address = address?.trim() || "";

    await user.save();

    const updatedUser = await Auth.findById(req.userId)
      .select("-password");

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    return res.status(500).json({
      message: "Unable to update profile",
    });
  }
};

// ======================================
// CHANGE PASSWORD
// ======================================

const changePassword = async (req, res) => {
  try {
    const {
      oldPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // Required fields
    if (
      typeof oldPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !oldPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "All password fields are required",
      });
    }

    // Minimum password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    // Confirm password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match",
      });
    }

    // Prevent same old and new password
    if (oldPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from old password",
      });
    }

    // Find user
    const user = await Auth.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(
      oldPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Old password is incorrect",
      });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 12);

    await user.save();

    return res.status(200).json({
      message: "Password changed successfully",
    });

  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Unable to change password",
    });
  }
};

// ======================================
// EXPORT FUNCTIONS
// ======================================

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
};


/* const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Auth = require("../MODELS/auth.model");

// Register a normal customer
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password || !phone || !address) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await Auth.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await Auth.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      address,

      // Never accept privileged roles from public registration.
      role: "customer",
      isActive: true,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "User already registered",
      });
    }

    return res.status(500).json({
      message: "Registration failed",
    });
  }
};

// Login
const loginUser = async (req, res) => {
  try {
    const { email, password, captcha } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof captcha !== "string" ||
      !email.trim() ||
      !password ||
      !captcha.trim()
    ) {
      return res.status(400).json({
        message: "Email, password, and captcha are required",
      });
    }

    // Validate CAPTCHA
    if (
      typeof req.session.captcha !== "string" ||
      captcha.trim().toUpperCase() !== req.session.captcha.toUpperCase()
    ) {
      return res.status(400).json({
        message: "Invalid captcha",
      });
    }

    // One-time CAPTCHA
    delete req.session.captcha;

    const normalizedEmail = email.trim().toLowerCase();

    const user = await Auth.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Do not allow deactivated accounts to log in.
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Your account is deactivated. Please contact support.",
      });
    }

    const role = user.role || "customer";

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Authentication service is not configured",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    req.session.userId = user._id.toString();
    req.session.isLoggedIn = true;

    return res.status(200).json({
      message: "Login successful",
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed",
    });
  }
};

// Get profile
const getProfile = async (req, res) => {
  try {
    const user = await Auth.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      message: "Could not get profile",
    });
  }
};

// ======================================
// UPDATE PROFILE
// ======================================
const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    const user = await Auth.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingEmail = await Auth.findOne({
      email: normalizedEmail,
      _id: { $ne: req.userId },
    });

    if (existingEmail) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Phone number validation
    const phoneNumber = phone?.trim() || "";

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({
        message: "Please enter a valid 10 digit Indian mobile number",
      });
    }

    user.name = name.trim();
    user.email = normalizedEmail;
    user.phone = phoneNumber;
    user.address = address?.trim() || "";

    await user.save();

    const updatedUser = await Auth.findById(req.userId).select("-password");

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    res.status(500).json({
      message: "Unable to update profile",
    });
  }
};

// ======================================
// CHANGE PASSWORD
// ======================================
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All password fields are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match",
      });
    }

    const user = await Auth.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Old password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    await user.save();

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);

    res.status(500).json({
      message: "Unable to change password",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
};

 */