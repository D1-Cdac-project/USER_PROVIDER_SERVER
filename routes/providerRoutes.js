const express = require("express");
const router = express.Router();

const { createMandap } = require("../controllers/providerControllers");

router.post("/mandap" , createMandap)

module.exports = router;