
const express = require("express");
const router = express.Router();

const {
  chatWithCustomer,
} = require("../CONTROLLERS/helpChat.controller");

router.post("/", chatWithCustomer);

module.exports = router;
