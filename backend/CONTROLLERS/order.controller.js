const Order = require("../MODELS/order.model");

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
};






