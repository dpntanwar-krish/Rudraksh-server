const express = require("express");
const upload = require("../Middleware/upload");
const { requireAdminAuth } = require("../Middleware/adminAuthMiddleware");
const {
  saveTeamMember,
  fetchAllTeamMembers,
  fetchActiveTeamMembers,
  deleteTeamMember,
  updateTeamMember,
  updateTeamSequence,
} = require("../controller/Teamcontroller");

const router = express.Router();

router.post("/save", requireAdminAuth, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: false, msg: err.message });
    }
    next();
  });
}, saveTeamMember);

router.get("/all", fetchAllTeamMembers);
router.get("/active", fetchActiveTeamMembers);
router.delete("/delete/:id", requireAdminAuth, deleteTeamMember);

router.put("/update/:id", requireAdminAuth, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: false, msg: err.message });
    }
    next();
  });
}, updateTeamMember);

router.put("/sequence", requireAdminAuth, updateTeamSequence);

module.exports = router;
