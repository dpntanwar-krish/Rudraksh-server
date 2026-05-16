const express = require("express");
const { loginAdmin, signupAdmin } = require("../controller/AdminAuthController");

const router = express.Router();

router.post("/signup", signupAdmin);
router.post("/login", loginAdmin);

module.exports = router;
