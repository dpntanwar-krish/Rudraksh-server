const crypto = require("crypto");
const Admin = require("../Modal/AdminModal");
const {
  AUTH_COOKIE,
  issueAdminToken,
  buildAuthCookieOptions,
} = require("../Middleware/adminAuthMiddleware");

function hashPassword(password, saltHex) {
  return crypto.pbkdf2Sync(password, saltHex, 100000, 64, "sha512").toString("hex");
}

function buildPasswordFields(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
  };
}

function serializeAdmin(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    hasPassword: Boolean(admin.passwordHash),
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

exports.signupAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await Admin.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: "Admin already exists with this email." });
    }

    const created = await Admin.create({
      name: String(name).trim(),
      email: normalizedEmail,
      ...buildPasswordFields(password),
    });

    return res.status(201).json({
      success: true,
      message: "Signup successful.",
      admin: serializeAdmin(created),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Signup failed." });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const computedHash = hashPassword(password, admin.passwordSalt);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(admin.passwordHash, "hex")
    );
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const token = issueAdminToken({
      adminId: String(admin._id),
      email: admin.email,
      role: admin.role,
    });

    res.cookie(AUTH_COOKIE, token, buildAuthCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      expiresInMs: 30 * 60 * 1000,
      admin: serializeAdmin(admin),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Login failed." });
  }
};

exports.getAdminSession = async (req, res) => {
  try {
    const { adminId, expMs } = req.adminAuth || {};
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await Admin.findById(adminId).lean();
    if (!admin) {
      return res.status(401).json({ success: false, message: "Admin account not found" });
    }

    return res.status(200).json({
      success: true,
      admin: serializeAdmin(admin),
      expiresAt: expMs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch session" });
  }
};

exports.listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).sort({ createdAt: 1 }).lean();
    return res.status(200).json({
      success: true,
      data: admins.map(serializeAdmin),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch admins." });
  }
};

exports.createAdminUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, user ID and password are required." });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await Admin.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: "Admin already exists with this user ID." });
    }

    const created = await Admin.create({
      name: String(name).trim(),
      email: normalizedEmail,
      role: String(role || "admin").trim() || "admin",
      ...buildPasswordFields(String(password)),
    });

    return res.status(201).json({
      success: true,
      message: "Admin user created.",
      admin: serializeAdmin(created),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create admin user." });
  }
};

exports.updateAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin user not found." });
    }

    if (name !== undefined) admin.name = String(name).trim();
    if (role !== undefined) admin.role = String(role || "admin").trim() || "admin";
    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!normalizedEmail) {
        return res.status(400).json({ success: false, message: "User ID is required." });
      }

      const existing = await Admin.findOne({ email: normalizedEmail, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Another admin already uses this user ID." });
      }
      admin.email = normalizedEmail;
    }

    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
      }
      Object.assign(admin, buildPasswordFields(String(password)));
    }

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Admin user updated.",
      admin: serializeAdmin(admin),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to update admin user." });
  }
};

exports.deleteAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (String(req.adminAuth?.adminId) === String(id)) {
      return res.status(400).json({ success: false, message: "You cannot delete the account you are signed in with." });
    }

    const adminCount = await Admin.countDocuments();
    if (adminCount <= 1) {
      return res.status(400).json({ success: false, message: "At least one admin user must remain." });
    }

    const deleted = await Admin.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Admin user not found." });
    }

    return res.status(200).json({ success: true, message: "Admin user deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete admin user." });
  }
};

exports.logoutAdmin = async (req, res) => {
  const cookieOptions = buildAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
  });
  return res.status(200).json({ success: true, message: "Logged out successfully." });
};
