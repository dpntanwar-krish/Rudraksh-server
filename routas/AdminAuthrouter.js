const express = require("express");
const {
  loginAdmin,
  signupAdmin,
  getAdminSession,
  logoutAdmin,
  listAdmins,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} = require("../controller/AdminAuthController");
const { requireAdminAuth } = require("../Middleware/adminAuthMiddleware");

const router = express.Router();

router.post("/signup", signupAdmin);
router.post("/login", loginAdmin);
router.get("/me", requireAdminAuth, getAdminSession);
router.get("/users", requireAdminAuth, listAdmins);
router.post("/users", requireAdminAuth, createAdminUser);
router.put("/users/:id", requireAdminAuth, updateAdminUser);
router.delete("/users/:id", requireAdminAuth, deleteAdminUser);
router.post("/logout", logoutAdmin);

module.exports = router;
