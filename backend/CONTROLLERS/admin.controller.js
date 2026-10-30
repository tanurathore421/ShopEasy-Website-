
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Auth = require("../MODELS/auth.model");
const Product = require("../MODELS/product.model");
const Order = require("../MODELS/order.model");

// Escape special characters before using user input in a regular expression.
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Validate a MongoDB document ID.
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Return account data without the password.
const publicUser = (user) => {
  const data = user.toObject();
  delete data.password;
  return data;
};

// Create a wholesaler account.
const createWholesaler = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      address,
      businessName,
      gstNumber,
    } = req.body;

    // Validate required fields.
    const requiredFields = {
      name,
      email,
      password,
      phone,
      address,
      businessName,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailPattern = new RegExp(
      `^${escapeRegex(normalizedEmail)}$`,
      "i"
    );

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });
    }

    // Check whether this email is already registered.
    const existingUser = await Auth.findOne({
      email: emailPattern,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Hash the password before storing it.
    const hashedPassword = await bcrypt.hash(password, 12);

    const wholesaler = await Auth.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone.trim(),
      address: address.trim(),
      businessName: businessName.trim(),
      gstNumber:
        typeof gstNumber === "string"
          ? gstNumber.trim().toUpperCase()
          : "",
      role: "wholesaler",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Wholesaler created successfully",
      wholesaler: publicUser(wholesaler),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Please check the wholesaler details",
      });
    }

    console.error("Create wholesaler error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not create wholesaler",
    });
  }
};

// Get the wholesaler list with optional search and pagination.
const getWholesalers = async (req, res) => {
  try {
    const parsedPage = Number.parseInt(req.query.page, 10) || 1;
    const parsedLimit = Number.parseInt(req.query.limit, 10) || 10;

    const page = Math.max(1, parsedPage);
    const limit = Math.min(100, Math.max(1, parsedLimit));

    const filter = {
      role: "wholesaler",
    };

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const searchPattern = new RegExp(
        escapeRegex(req.query.search.trim()),
        "i"
      );

      filter.$or = [
        { name: searchPattern },
        { email: searchPattern },
        { businessName: searchPattern },
        { phone: searchPattern },
      ];
    }

    const [wholesalers, total] = await Promise.all([
      Auth.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Auth.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      wholesalers,
    });
  } catch (error) {
    console.error("Get wholesalers error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve wholesalers",
    });
  }
};

// Edit wholesaler contact and business details.
const updateWholesaler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wholesaler ID",
      });
    }

    const wholesaler = await Auth.findOne({
      _id: id,
      role: "wholesaler",
    });

    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    // Only these fields may be edited through this endpoint.
    const editableFields = [
      "name",
      "email",
      "phone",
      "address",
      "businessName",
      "gstNumber",
    ];

    const updates = {};

    for (const field of editableFields) {
      if (req.body[field] === undefined) {
        continue;
      }

      if (typeof req.body[field] !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be text`,
        });
      }

      const value = req.body[field].trim();

      // GST number is optional.
      if (field !== "gstNumber" && !value) {
        return res.status(400).json({
          success: false,
          message: `${field} cannot be empty`,
        });
      }

      updates[field] =
        field === "email"
          ? value.toLowerCase()
          : field === "gstNumber"
            ? value.toUpperCase()
            : value;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No editable details were provided",
      });
    }

    if (updates.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }

      const emailPattern = new RegExp(
        `^${escapeRegex(updates.email)}$`,
        "i"
      );

      const duplicate = await Auth.findOne({
        email: emailPattern,
        _id: { $ne: wholesaler._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists",
        });
      }
    }

    Object.assign(wholesaler, updates);
    await wholesaler.save();

    return res.status(200).json({
      success: true,
      message: "Wholesaler updated successfully",
      wholesaler: publicUser(wholesaler),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Please check the wholesaler details",
      });
    }

    console.error("Update wholesaler error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update wholesaler",
    });
  }
};

// Activate or deactivate a wholesaler account.
const updateWholesalerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wholesaler ID",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const wholesaler = await Auth.findOneAndUpdate(
      { _id: id, role: "wholesaler" },
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!wholesaler) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Wholesaler activated successfully"
        : "Wholesaler deactivated successfully",
      wholesaler,
    });
  } catch (error) {
    console.error("Update wholesaler status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update wholesaler status",
    });
  }
};

// Get dashboard statistics for the admin panel.
const getDashboardStats = async (req, res) => {
  try {
    const customerFilter = {
      $or: [
        { role: "customer" },
        { role: { $exists: false } },
      ],
    };

    const [
      totalProducts,
      totalOrders,
      totalCustomers,
      totalWholesalers,
      activeWholesalers,
      pendingOrders,
      deliveredRevenueResult,
    ] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Auth.countDocuments(customerFilter),
      Auth.countDocuments({ role: "wholesaler" }),
      Auth.countDocuments({
        role: "wholesaler",
        isActive: { $ne: false },
      }),
      Order.countDocuments({ status: "Pending" }),
      Order.aggregate([
        { $match: { status: "Delivered" } },
        {
          $group: {
            _id: null,
            total: {
              $sum: { $ifNull: ["$totalAmount", 0] },
            },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalProducts,
        totalOrders,
        totalCustomers,
        totalWholesalers,
        activeWholesalers,
        pendingOrders,
        deliveredRevenue:
          deliveredRevenueResult[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load dashboard statistics",
    });
  }
};

// Get the customer list with optional search and pagination.

const getCustomers = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    // Include customers created before the role field was introduced.
    const filter = {
      $or: [
        { role: "customer" },
        { role: { $exists: false } },
      ],
    };

    if (
      typeof req.query.search === "string" &&
      req.query.search.trim()
    ) {
      const escapedSearch = req.query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchPattern = new RegExp(escapedSearch, "i");

      filter.$and = [
        {
          $or: [
            { name: searchPattern },
            { email: searchPattern },
            { phone: searchPattern },
          ],
        },
      ];
    }

    const [customers, total] = await Promise.all([
      Auth.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Auth.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      customers,
    });
  } catch (error) {
    console.error("Get customers error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve customers",
    });
  }
};

// Activate or deactivate a customer account.

const updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    // This endpoint can only change customer accounts.
    const customer = await Auth.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { role: "customer" },
          { role: { $exists: false } },
        ],
      },
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Customer activated successfully"
        : "Customer deactivated successfully",
      customer,
    });
  } catch (error) {
    console.error("Update customer status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update customer status",
    });
  }
};

// Get all order list 

const getAdminOrders = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const allowedStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    const filter = {};
    const status =
      typeof req.query.status === "string"
        ? req.query.status.trim()
        : "";

    if (status && status !== "all") {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status",
        });
      }

      filter.status = status;
    }

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchPattern = new RegExp(escapedSearch, "i");
      const searchConditions = [];

      // Search by exact order ID when the supplied value is an ObjectId.
      if (mongoose.Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: search });
      }

      // Search by customer or account contact details.
      const matchingUsers = await Auth.find({
        $or: [
          { name: searchPattern },
          { email: searchPattern },
          { phone: searchPattern },
        ],
      })
        .select("_id")
        .limit(100)
        .lean();

      if (matchingUsers.length) {
        searchConditions.push({
          userId: {
            $in: matchingUsers.map((user) => user._id),
          },
        });
      }

      // Search by product name.
      const matchingProducts = await Product.find({
        name: searchPattern,
      })
        .select("_id")
        .limit(100)
        .lean();

      if (matchingProducts.length) {
        searchConditions.push({
          productId: {
            $in: matchingProducts.map((product) => product._id),
          },
        });
      }

      if (!searchConditions.length) {
        return res.status(200).json({
          success: true,
          total: 0,
          page,
          pages: 0,
          orders: [],
        });
      }

      filter.$or = searchConditions;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("userId", "name email phone")
        .populate("productId", "name price category image")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      orders,
    });
  } catch (error) {
    console.error("Admin get orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve orders",
    });
  }
};

// Update the status of an order.

const updateAdminOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;
    await order.save();

    const updatedOrder = await Order.findById(id)
      .populate("userId", "name email phone")
      .populate("productId", "name price category image")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Admin update order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update order status",
    });
  }
};



// ==========================================
// GET PRODUCT
// ==========================================

const getAdminProducts = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const filter = {};

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const pattern = new RegExp(escaped, "i");

      filter.$or = [
        { name: pattern },
        { category: pattern },
      ];
    }

    const status = req.query.status;

    if (status === "active") {
      filter.isActive = { $ne: false };
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    // Optional inventory filter
    if (req.query.stockStatus === "out") {
      filter.$or = [
        ...(filter.$or || []),
      ];

      filter.$expr = {
        $lte: [{ $ifNull: ["$stock", 0] }, 0],
      };
    } else if (req.query.stockStatus === "low") {
      filter.$expr = {
        $and: [
          { $gt: [{ $ifNull: ["$stock", 0] }, 0] },
          {
            $lte: [
              { $ifNull: ["$stock", 0] },
              { $ifNull: ["$lowStockThreshold", 5] },
            ],
          },
        ],
      };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    // Older products may not contain stock fields yet.
    const normalizedProducts = products.map((product) => ({
      ...product,
      stock: Number.isInteger(product.stock) ? product.stock : 0,
      lowStockThreshold: Number.isInteger(product.lowStockThreshold)
        ? product.lowStockThreshold
        : 5,
    }));

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      products: normalizedProducts,
    });
  } catch (error) {
    console.error("Admin get products error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve products",
    });
  }
};


// ==========================================
// CREATE PRODUCT
// ==========================================

const createAdminProduct = async (req, res) => {
  try {
    const { image, name, price, category } = req.body;

    const stock =
      req.body.stock === undefined || req.body.stock === ""
        ? 0
        : Number(req.body.stock);

    const lowStockThreshold =
      req.body.lowStockThreshold === undefined ||
      req.body.lowStockThreshold === ""
        ? 5
        : Number(req.body.lowStockThreshold);

    if (
      typeof image !== "string" ||
      !image.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Image, name, price and category are required",
      });
    }

    const productPrice = Number(price);

    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid product price",
      });
    }

    if (!Number.isSafeInteger(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative whole number",
      });
    }

    if (
      !Number.isSafeInteger(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Low stock threshold must be a non-negative whole number",
      });
    }

    const product = await Product.create({
      image: image.trim(),
      name: name.trim(),
      price: productPrice,
      category: category.trim(),
      stock,
      lowStockThreshold,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("Admin create product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not add product",
    });
  }
};



// ==========================================
// UPDATE PRODUCT
// ==========================================

const updateAdminProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const updates = {};
    const allowedFields = ["image", "name", "category"];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (
          typeof req.body[field] !== "string" ||
          !req.body[field].trim()
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} cannot be empty`,
          });
        }

        updates[field] = req.body[field].trim();
      }
    }

    if (req.body.price !== undefined) {
      const price = Number(req.body.price);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid price",
        });
      }

      updates.price = price;
    }

    if (req.body.stock !== undefined) {
      const stock = Number(req.body.stock);

      if (!Number.isSafeInteger(stock) || stock < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock must be a non-negative whole number",
        });
      }

      updates.stock = stock;
    }

    if (req.body.lowStockThreshold !== undefined) {
      const threshold = Number(req.body.lowStockThreshold);

      if (!Number.isSafeInteger(threshold) || threshold < 0) {
        return res.status(400).json({
          success: false,
          message: "Low stock threshold must be a non-negative whole number",
        });
      }

      updates.lowStockThreshold = threshold;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No product details provided for update",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product and inventory updated successfully",
      product,
    });
  } catch (error) {
    console.error("Admin update product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update product",
    });
  }
};


// ==========================================
// ACTIVATE / DEACTIVATE PRODUCT
// ==========================================
const updateAdminProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Product activated successfully"
        : "Product deactivated successfully",
      product,
    });
  } catch (error) {
    console.error("Admin product status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update product status",
    });
  }
};

// ==========================================
// GET INVENTORY STATS
// ==========================================

const getInventoryStats = async (req, res) => {
  try {
    const [totalProducts, summary] = await Promise.all([
      Product.countDocuments({
        isActive: { $ne: false },
      }),

      Product.aggregate([
        {
          $match: {
            isActive: { $ne: false },
          },
        },
        {
          $group: {
            _id: null,

            totalStock: {
              $sum: { $ifNull: ["$stock", 0] },
            },

            lowStockProducts: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $gt: [
                          { $ifNull: ["$stock", 0] },
                          0,
                        ],
                      },
                      {
                        $lte: [
                          { $ifNull: ["$stock", 0] },
                          { $ifNull: ["$lowStockThreshold", 5] },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            outOfStockProducts: {
              $sum: {
                $cond: [
                  {
                    $lte: [
                      { $ifNull: ["$stock", 0] },
                      0,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const inventory = summary[0] || {
      totalStock: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    };

    return res.status(200).json({
      success: true,
      inventory: {
        totalProducts,
        totalStock: inventory.totalStock,
        lowStockProducts: inventory.lowStockProducts,
        outOfStockProducts: inventory.outOfStockProducts,
      },
    });
  } catch (error) {
    console.error("Inventory stats error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load inventory statistics",
    });
  }
};

module.exports = {
  createWholesaler,
  getWholesalers,
  updateWholesaler,
  updateWholesalerStatus,
  getDashboardStats,
  getCustomers,
  updateCustomerStatus,
  getAdminOrders,
  updateAdminOrderStatus,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  updateAdminProductStatus,
  getInventoryStats,
};
