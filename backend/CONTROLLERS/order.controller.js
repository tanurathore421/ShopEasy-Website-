
const mongoose = require("mongoose");
const Order = require("../MODELS/order.model");
const Product = require("../MODELS/product.model");
const {
  refundOnlineOrderIfNeeded,
} = require("../SERVICES/orderRefund");

// Restore stock for a list of reserved items
async function restoreStock(items) {
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.productId },
      { $inc: { stock: item.quantity } }
    );

    if (result.matchedCount !== 1) {
      throw new Error(
        `Unable to restore stock for product ${item.productId}`
      );
    }
  }
}

// Reserve stock atomically to prevent overselling
async function reserveStock(items) {
  const reserved = [];

  try {
    for (const item of items) {
      const result = await Product.updateOne(
        {
          _id: item.productId,
          isActive: { $ne: false },
          stock: { $gte: item.quantity },
        },
        {
          $inc: { stock: -item.quantity },
        }
      );

      if (result.modifiedCount !== 1) {
        await restoreStock(reserved);

        return {
          success: false,
          productId: item.productId,
        };
      }

      reserved.push(item);
    }

    return {
      success: true,
      reserved,
    };
  } catch (error) {
    if (reserved.length > 0) {
      try {
        await restoreStock(reserved);
      } catch (restoreError) {
        console.error("Stock rollback error:", restoreError);
      }
    }

    throw error;
  }
}

// ==========================================
// COD ORDER
// ==========================================
const placeCodOrder = async (req, res) => {
  let reservedItems = [];

  try {
    const userId = req.userId;
    const { items } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    if (items.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Too many products in cart",
      });
    }

    // Combine duplicate products
    const quantityMap = new Map();

    for (const item of items) {
      if (
        !item ||
        !mongoose.Types.ObjectId.isValid(item.productId) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID or quantity",
        });
      }

      const productId = String(item.productId);
      const quantity =
        (quantityMap.get(productId) || 0) + item.quantity;

      if (quantity > 100) {
        return res.status(400).json({
          success: false,
          message: "Maximum quantity per product is 100",
        });
      }

      quantityMap.set(productId, quantity);
    }

    const productIds = [...quantityMap.keys()].sort();

    // Load active products and calculate prices from database
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: { $ne: false },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some products are unavailable",
      });
    }

    const productMap = new Map(
      products.map((product) => [
        String(product._id),
        product,
      ])
    );

    const validatedItems = [];

    for (const [productId, quantity] of quantityMap) {
      const product = productMap.get(productId);
      const price = Number(product.price);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product price",
        });
      }

      validatedItems.push({
        productId: product._id,
        quantity,
        price,
        totalAmount: price * quantity,
      });
    }

    // Deduct stock before creating the orders
    const reservation = await reserveStock(validatedItems);

    if (!reservation.success) {
      return res.status(409).json({
        success: false,
        message: "Insufficient stock. Please update your cart.",
        productId: reservation.productId,
      });
    }

    reservedItems = reservation.reserved;

    // Generate IDs so a partial insert can be cleaned up safely
    const orderIds = validatedItems.map(
      () => new mongoose.Types.ObjectId()
    );

    try {
      const orders = await Order.insertMany(
        validatedItems.map((item, index) => ({
          _id: orderIds[index],
          userId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          totalAmount: item.totalAmount,
          status: "Processing",
          stockDeducted: true,
        })),
        { ordered: true }
      );

      // Orders saved successfully; stock remains deducted
      reservedItems = [];

      return res.status(201).json({
        success: true,
        message: "COD order placed successfully",
        orders,
      });
    } catch (insertError) {
      // Remove any partially inserted orders before restoring stock
      try {
        await Order.deleteMany({
          _id: { $in: orderIds },
        });
      } catch (cleanupError) {
        console.error("COD partial-order cleanup failed:", cleanupError);
        reservedItems = [];

        throw new Error(
          "Order cleanup failed. Stock was kept deducted for safety. Manual review is required."
        );
      }

      try {
        await restoreStock(reservedItems);
        reservedItems = [];
      } catch (restoreError) {
        reservedItems = [];
        console.error("COD stock rollback failed:", restoreError);
        throw new Error(
          "Order creation failed and stock restoration needs manual review."
        );
      }

      throw insertError;
    }
  } catch (error) {
    console.error("COD ORDER ERROR:", error);

    // Roll back reservations made before an unexpected error
    if (reservedItems.length > 0) {
      try {
        await restoreStock(reservedItems);
      } catch (restoreError) {
        console.error("COD stock rollback error:", restoreError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to place COD order",
    });
  }
};

// ==========================================
// PLACE ORDER OR INCREASE EXISTING PENDING ORDER
// This creates a pending order; it does not reserve stock.
// ==========================================
const placeOrder = async (req, res) => {
  try {
    const { productId } = req.body;
    const quantity = Number(req.body.quantity);

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      return res.status(400).json({
        message: "Invalid product ID or quantity",
      });
    }

    if (!req.userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: { $ne: false },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or unavailable",
      });
    }

    const price = Number(product.price);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        message: "Invalid product price",
      });
    }

    const existingOrder = await Order.findOne({
      userId: req.userId,
      productId,
      status: "Pending",
    });

    const newQuantity =
      (existingOrder ? existingOrder.quantity : 0) + quantity;

    if (newQuantity > 100) {
      return res.status(400).json({
        message: "Maximum quantity per product is 100",
      });
    }

    if (
      !Number.isFinite(Number(product.stock)) ||
      Number(product.stock) < newQuantity
    ) {
      return res.status(409).json({
        message: "Insufficient stock",
      });
    }

    if (existingOrder) {
      existingOrder.quantity = newQuantity;
      existingOrder.price = price;
      existingOrder.totalAmount = newQuantity * price;

      await existingOrder.save();

      return res.status(200).json({
        message: "Order quantity increased",
        order: existingOrder,
      });
    }

    const order = new Order({
      userId: req.userId,
      productId,
      quantity,
      price,
      totalAmount: quantity * price,
      status: "Pending",
      stockDeducted: false,
    });

    await order.save();

    return res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Place order error:", error);

    return res.status(500).json({
      message: "Failed in placing order",
    });
  }
};

// ==========================================
// GET ALL ORDERS OF LOGGED-IN USER
// ==========================================
const getOrder = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.userId,
    })
      .populate("productId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
};

// ==========================================
// CANCEL ORDER AND RESTORE DEDUCTED STOCK
// ==========================================

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    if (["Shipped", "Delivered"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order that is ${order.status}`,
      });
    }

    // Refund a confirmed Razorpay payment before cancellation.
    try {
      await refundOnlineOrderIfNeeded(order);
    } catch (refundError) {
      console.error("Customer order refund error:", refundError);

      return res.status(502).json({
        success: false,
        message:
          "Refund could not be confirmed. Order was not cancelled. Contact support before retrying.",
      });
    }

    const cancelledOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        userId: req.userId,
        status: { $nin: ["Cancelled", "Shipped", "Delivered"] },
      },
      {
        $set: { status: "Cancelled" },
      },
      { new: true }
    );

    if (!cancelledOrder) {
      return res.status(409).json({
        success: false,
        message: "Order status changed. Please refresh.",
      });
    }

    if (cancelledOrder.stockDeducted) {
      const result = await Product.updateOne(
        { _id: cancelledOrder.productId },
        { $inc: { stock: cancelledOrder.quantity } }
      );

      if (result.matchedCount !== 1) {
        console.error("Cancelled order stock restoration needs review:", order._id);

        return res.status(500).json({
          success: false,
          message: "Order cancelled, but stock restoration needs manual review.",
        });
      }

      await Order.updateOne(
        {
          _id: cancelledOrder._id,
          status: "Cancelled",
          stockDeducted: true,
        },
        {
          $set: {
            stockDeducted: false,
            stockRestoredAt: new Date(),
          },
        }
      );
    }

    const updatedOrder = await Order.findById(order._id)
      .populate("productId");

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel order",
    });
  }
};


// ==========================================
// REMOVE ORDER
// ==========================================
const removeOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      order.status === "Shipped" ||
      order.status === "Delivered"
    ) {
      return res.status(400).json({
        message: `Cannot remove an order that is ${order.status}`,
      });
    }

    // A deducted order must be cancelled first so inventory is restored.
    if (order.stockDeducted) {
      return res.status(409).json({
        message: "Please cancel this order before removing it.",
      });
    }

    await Order.deleteOne({
      _id: order._id,
      userId: req.userId,
    });

    return res.status(200).json({
      message: "Order removed successfully",
    });
  } catch (error) {
    console.error("Remove order error:", error);

    return res.status(500).json({
      message: "Failed to remove order",
    });
  }
};

module.exports = {
  placeOrder,
  getOrder,
  cancelOrder,
  removeOrder,
  placeCodOrder,
};

/* const Order = require("../MODELS/order.model");

const Product = require("../MODELS/product.model");


  // ==========================================
    //COD ORDER
    // ==========================================
const placeCodOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { items } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    // Validate all products before creating any orders
    const validatedItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (
        !item.productId ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 100
      ) {
        return res.status(400).json({
          message: "Invalid product ID or quantity",
        });
      }

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.productId}`,
        });
      }

      const price = Number(product.price);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          message: "Invalid product price",
        });
      }

      validatedItems.push({
        productId: product._id,
        quantity,
        price,
        totalAmount: price * quantity,
      });
    }

    const orders = await Order.insertMany(
      validatedItems.map((item) => ({
        userId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        totalAmount: item.totalAmount,
        status: "Processing",
      }))
    );

    return res.status(201).json({
      success: true,
      message: "COD order placed successfully",
      orders,
    });
  } catch (error) {
    console.error("COD ORDER ERROR:", error);

    return res.status(500).json({
      message: "Failed to place COD order",
      error: error.message,
    });
  }
};

  // ==========================================
    // PLACE ORDER OR INCREASE EXISTING ORDER
    // ==========================================
const placeOrder = async (req, res) => {
  try {
    const { productId, quantity, price } = req.body;

    if (!productId || !price) {
      return res.status(400).json({
        message: "Product ID & Price is required",
      });
    }

    if (!req.userId) {
      return res.status(401).json({
        message: "User is not authenticated",
      });
    }

    // Find existing pending order
    const existingOrder = await Order.findOne({
      userId: req.userId,
      productId: productId,
      status: "Pending",
    });

  
    // IF ORDER ALREADY EXISTS

    if (existingOrder) {
      existingOrder.quantity += Number(quantity);

      // Keep latest price
      existingOrder.price = Number(price);

      // Recalculate total
      existingOrder.totalAmount = existingOrder.quantity * existingOrder.price;

      await existingOrder.save();

      return res.status(200).json({
        message: "Order quantity increased",
        order: existingOrder,
      });
    }


    // CREATE NEW ORDER
 
    const totalAmount = Number(quantity) * Number(price);

    const order = new Order({
      userId: req.userId,
      productId: productId,
      quantity: Number(quantity),
      price: Number(price),
      totalAmount: totalAmount,
      status: "Pending",
    });

    await order.save();

    return res.status(201).json({
      message: "Order placed successfully",
      order: order,
    });
  } catch (error) {
    console.error("Place order error:", error);

    return res.status(500).json({
      message: "Failed in placing order",
      error: error.message,
    });
  }
};



  // ==========================================
    //GET ALL ORDERS OF LOGGED IN USER
    // ==========================================
const getOrder = async (req, res) => {
  try {
    const userId = req.userId;

    const orders = await Order.find({ userId })
      .populate("productId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
};

  // ==========================================
    //CANCEL ORDER
    // ==========================================
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({
        message: "Order is already cancelled",
      });
    }

    if (
      order.status === "Shipped" ||
      order.status === "Delivered"
    ) {
      return res.status(400).json({
        message: `Cannot cancel an order that is ${order.status}`,
      });
    }

    // Update only the status
    await Order.updateOne(
      {
        _id: req.params.id,
        userId: req.userId,
      },
      {
        $set: {
          status: "Cancelled",
        },
      }
    );

    // Return updated order
    const updatedOrder = await Order.findById(
      req.params.id
    ).populate("productId");

    return res.status(200).json({
      message: "Order cancelled successfully",
      order: updatedOrder,
    });

  } catch (error) {
    console.error("Cancel order error:", error);

    return res.status(500).json({
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};



  // ==========================================
  // REMOVE order
  // ==========================================
const removeOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Don't allow removing shipped/delivered orders
    if (
      order.status === "Shipped" ||
      order.status === "Delivered"
    ) {
      return res.status(400).json({
        message: `Cannot remove an order that is ${order.status}`,
      });
    }

    await Order.findByIdAndDelete(order._id);

    return res.status(200).json({
      message: "Order removed successfully",
    });

  } catch (error) {
    console.error("Remove order error:", error);

    return res.status(500).json({
      message: "Failed to remove order",
      error: error.message,
    });
  }
};


module.exports = {
  placeOrder,
  getOrder,
  cancelOrder,
  removeOrder,
  placeCodOrder,

};






 */