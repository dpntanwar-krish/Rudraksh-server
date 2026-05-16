const crypto = require("crypto");
const Admin = require("../Modal/AdminModal");

function hashPassword(password, saltHex) {
  return crypto.pbkdf2Sync(password, saltHex, 100000, 64, "sha512").toString("hex");
}

function createAuthToken() {
  return crypto.randomBytes(32).toString("hex");
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

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);

    const created = await Admin.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      passwordSalt: salt,
    });

    return res.status(201).json({
      success: true,
      message: "Signup successful.",
      admin: { id: created._id, name: created.name, email: created.email, role: created.role },
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

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token: createAuthToken(),
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Login failed." });
  }
};
