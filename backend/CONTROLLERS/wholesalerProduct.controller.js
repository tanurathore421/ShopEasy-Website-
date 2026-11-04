
const mongoose = require("mongoose");
const Product = require("../MODELS/product.model");

// ======================================
// GET PRODUCTS SUBMITTED BY WHOLESALERS
// ======================================
const getSupplierProducts = async (req, res) => {
  try {
    const filter = {
      supplierId: { $ne: null },
    };

    if (req.query.status) {
      const allowed = ["pending", "approved", "rejected"];

      if (!allowed.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid approval status",
        });
      }

      filter.approvalStatus = req.query.status;
    }

    const products = await Product.find(filter)
      .populate("supplierId", "name email businessName phone")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Get supplier products:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load supplier products",
    });
  }
};

// ======================================
// APPROVE WHOLESALER PRODUCT
// ======================================
const approveSupplierProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sellingPrice = Number(req.body.sellingPrice);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid customer selling price",
      });
    }

    const product = await Product.findOne({
      _id: id,
      supplierId: { $ne: null },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Supplier product not found",
      });
    }

    if (product.approvalStatus === "approved") {
      return res.status(409).json({
        success: false,
        message: "This product is already approved",
      });
    }

    product.price = sellingPrice;
    product.approvalStatus = "approved";
    product.rejectionReason = "";
    product.isActive = true;

    await product.save();

    return res.json({
      success: true,
      message: "Product approved and published successfully",
      product,
    });
  } catch (error) {
    console.error("Approve supplier product:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not approve product",
    });
  }
};

// ======================================
// REJECT WHOLESALER PRODUCT
// ======================================
const rejectSupplierProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body.reason || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a rejection reason",
      });
    }

    const product = await Product.findOne({
      _id: id,
      supplierId: { $ne: null },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Supplier product not found",
      });
    }

    product.approvalStatus = "rejected";
    product.rejectionReason = reason;
    product.isActive = false;

    await product.save();

    return res.json({
      success: true,
      message: "Product rejected successfully",
      product,
    });
  } catch (error) {
    console.error("Reject supplier product:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not reject product",
    });
  }
};

module.exports = {
  getSupplierProducts,
  approveSupplierProduct,
  rejectSupplierProduct,
};
