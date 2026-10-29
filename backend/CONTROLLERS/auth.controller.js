
const bcrypt = require("bcryptjs");
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
      captcha.trim().toUpperCase() !==
        req.session.captcha.toUpperCase()
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

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

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

module.exports = {
  registerUser,
  loginUser,
  getProfile,
};

/* const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Auth = require("../MODELS/auth.model");

// Register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password || !phone || !address) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // user already registered
    const existingUser = await Auth.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await Auth.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

// Login
const loginUser = async (req, res) => {
  try {
    const { email, password, captcha } = req.body;

    if (!email || !password || !captcha) {
      return res.status(400).json({
        message: "Email, password, and captcha are required",
      });
    }

    // Check if captcha matches
    if (captcha.toUpperCase() !== req.session.captcha) {
      return res.status(400).json({
        message: "Invalid captcha",
      });
    }

    // Clear captcha from session after validation
    delete req.session.captcha;

    // Find registered user
    const user = await Auth.findOne({ email });

    // User must be registered
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password or User not registered",
      });
    }

    // Compare  password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    

    // Store user ID and login status in session
    req.session.userId = user._id;
    req.session.isLoggedIn = true;

    // Login successful
    res.status(200).json({
      message: "Login successful",
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
      },
      token: token,
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

//get profile
const getProfile = async (req, res) => {
  try {
    // req.userId came from authMiddleware
    const user = await Auth.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Could not get profile",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
};
 */