
import React from "react";
import "./help.css";

function Help() {
  const helpTopics = [
    {
      title: "Products",
      description:
        "Get help with products, prices, and product availability.",
    },
    {
      title: "Orders",
      description:
        "View your orders and get information about your order status.",
    },
    {
      title: "Payments",
      description:
        "Get assistance with online payments and payment-related issues.",
    },
    {
      title: "Delivery",
      description:
        "Find information about shipping and delivery.",
    },
  ];

  return (
    <div className="help-page">
      <div className="help-header">
        <h1>Help & Support</h1>
        <p>We are here to help you.</p>
      </div>

      <div className="help-container">
        {helpTopics.map((topic, index) => (
          <div className="help-card" key={index}>
            <h2>{topic.title}</h2>
            <p>{topic.description}</p>
          </div>
        ))}
      </div>

      <div className="help-contact">
        <h2>Need More Help?</h2>
        <p>
          For information about your orders, please visit the My Orders page.
        </p>

        <a href="/orders" className="help-button">
          My Orders
        </a>
      </div>
    </div>
  );
}

export default Help;