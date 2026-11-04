
const mongoose = require("mongoose");
const Auth = require("../MODELS/auth.model");
const Product = require("../MODELS/product.model");

// ======================================
// WHOLESALER DASHBOARD
// ======================================
const getWholesalerDashboard = async (req, res) => {
  try {
    const supplierId = req.userId;

    const [total, pending, approved, rejected] = await Promise.all([
      Product.countDocuments({ supplierId }),
      Product.countDocuments({ supplierId, approvalStatus: "pending" }),
      Product.countDocuments({ supplierId, approvalStatus: "approved" }),
      Product.countDocuments({ supplierId, approvalStatus: "rejected" })
    ]);

    res.json({
      success: true,
      stats: { total, pending, approved, rejected }
    });
  } catch (error) {
    console.error("Wholesaler dashboard:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load dashboard"
    });
  }
};

// ======================================
// GET MY PRODUCTS
// ======================================
const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      supplierId: req.userId
    }).sort({ createdAt: -1 });

    res.json({ success: true, products });
  } catch (error) {
    console.error("Wholesaler products:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load your products"
    });
  }
};

// ======================================
// SUBMIT NEW PRODUCT
// ======================================
const submitProduct = async (req, res) => {
  try {
    const {
      name,
      image,
      category,
      supplyPrice,
      stock,
      lowStockThreshold
    } = req.body;

    if (![name, image, category].every(
      value => typeof value === "string" && value.trim()
    )) {
      return res.status(400).json({
        success: false,
        message: "Product name, image URL and category are required"
      });
    }

    const amount = Number(supplyPrice);
    const quantity = Number(stock);
    const threshold =
      lowStockThreshold === undefined ? 5 : Number(lowStockThreshold);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid supply price"
      });
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      !Number.isSafeInteger(threshold) ||
      threshold < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a valid whole number"
      });
    }

    const product = await Product.create({
      name: name.trim(),
      image: image.trim(),
      category: category.trim(),
      price: 0,
      supplyPrice: amount,
      stock: quantity,
      lowStockThreshold: threshold,
      supplierId: req.userId,
      approvalStatus: "pending",
      isActive: false
    });

    res.status(201).json({
      success: true,
      message: "Product submitted for admin approval",
      product
    });
  } catch (error) {
    console.error("Submit supplier product:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not submit product"
    });
  }
};

// ======================================
// UPDATE MY PENDING / REJECTED PRODUCT
// ======================================
const updateMyProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findOne({
      _id: id,
      supplierId: req.userId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (product.approvalStatus === "approved") {
      return res.status(409).json({
        success: false,
        message: "Contact admin to change an approved product"
      });
    }

    const { name, image, category, supplyPrice, stock } = req.body;

    if (name !== undefined) product.name = String(name).trim();
    if (image !== undefined) product.image = String(image).trim();
    if (category !== undefined) product.category = String(category).trim();
    if (supplyPrice !== undefined) product.supplyPrice = Number(supplyPrice);
    if (stock !== undefined) product.stock = Number(stock);

    if (
      !product.name ||
      !product.image ||
      !product.category ||
      !Number.isFinite(product.supplyPrice) ||
      product.supplyPrice <= 0 ||
      !Number.isSafeInteger(product.stock) ||
      product.stock < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid product details"
      });
    }

    product.approvalStatus = "pending";
    product.rejectionReason = "";
    product.isActive = false;
    product.price = 0;

    await product.save();

    res.json({
      success: true,
      message: "Product updated and submitted for approval",
      product
    });
  } catch (error) {
    console.error("Update supplier product:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not update product"
    });
  }
};

// ======================================
// GET WHOLESALER PROFILE
// ======================================
const getMyProfile = async (req, res) => {
  try {
    const user = await Auth.findOne({
      _id: req.userId,
      role: "wholesaler"
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Wholesaler profile not found"
      });
    }

    res.json({ success: true, profile: user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load profile"
    });
  }
};

module.exports = {
  getWholesalerDashboard,
  getMyProducts,
  submitProduct,
  updateMyProduct,
  getMyProfile
};
