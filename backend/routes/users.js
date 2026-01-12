const express = require("express");
const UserMongo = require("../models/User");
const UserMock = require("../mockdb/userDB");
const {
  validateProfileUpdate,
  checkValidation,
} = require("../middleware/validationMiddleware");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const JWT_SECRET =
  process.env.JWT_SECRET || "college_media_secret_key";

/* =====================================================
   🔐 AUTH + AUTHZ MIDDLEWARE (IDOR SAFE)
===================================================== */
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;

    // 🔥 Fetch current user (for role-based access)
    const db = req.app.get("dbConnection");
    req.currentUser = db?.useMongoDB
      ? await UserMongo.findById(req.userId)
      : await UserMock.findById(req.userId);

    if (!req.currentUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid user",
      });
    }

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

/* =====================================================
   🔒 OBJECT OWNERSHIP CHECK (IDOR FIX)
===================================================== */
const authorizeSelfOrAdmin = (paramKey = "userId") => {
  return (req, res, next) => {
    const targetId = req.params[paramKey];

    // Admin override
    if (req.currentUser.role === "admin") return next();

    // Owner-only access
    if (targetId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to access this resource",
      });
    }

    next();
  };
};

/* ------------------
   📦 MULTER SETUP
------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

if (!fs.existsSync("uploads/")) fs.mkdirSync("uploads/");

/* =====================================================
   👤 GET OWN PROFILE (IDOR SAFE)
===================================================== */
router.get("/profile", verifyToken, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.currentUser,
    });
  } catch (err) {
    next(err);
  }
});

/* =====================================================
   ✏️ UPDATE OWN PROFILE (IDOR + CONCURRENT SAFE)
===================================================== */
router.put(
  "/profile",
  verifyToken,
  validateProfileUpdate,
  checkValidation,
  async (req, res, next) => {
    try {
      const { firstName, lastName, bio } = req.body;
      const db = req.app.get("dbConnection");

      if (db?.useMongoDB) {
        req.currentUser.firstName = firstName;
        req.currentUser.lastName = lastName;
        req.currentUser.bio = bio;

        const updatedUser = await req.currentUser.safeSave();

        return res.json({
          success: true,
          data: updatedUser,
          message: "Profile updated successfully",
        });
      }

      const updatedUser = await UserMock.update(req.userId, {
        firstName,
        lastName,
        bio,
      });

      res.json({
        success: true,
        data: updatedUser,
        message: "Profile updated successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

/* =====================================================
   ⚙️ UPDATE OWN SETTINGS (IDOR SAFE)
===================================================== */
router.put("/profile/settings", verifyToken, async (req, res, next) => {
  try {
    const { email, isPrivate, notificationSettings } = req.body;

    if (email) req.currentUser.email = email;
    if (typeof isPrivate !== "undefined")
      req.currentUser.isPrivate = isPrivate;
    if (notificationSettings)
      req.currentUser.notificationSettings = notificationSettings;

    const updatedUser =
      typeof req.currentUser.safeSave === "function"
        ? await req.currentUser.safeSave()
        : await UserMock.update(req.userId, req.body);

    res.json({
      success: true,
      data: updatedUser,
      message: "Settings updated successfully",
    });
  } catch (err) {
    next(err);
  }
});

/* =====================================================
   🤝 FOLLOW / UNFOLLOW (ANTI-IDOR)
===================================================== */
router.post(
  "/profile/:username/follow",
  verifyToken,
  async (req, res, next) => {
    try {
      const { username } = req.params;
      const db = req.app.get("dbConnection");

      const targetUser = db?.useMongoDB
        ? await UserMongo.findOne({ username })
        : await UserMock.findByUsername(username);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // 🔒 Prevent self-follow
      if (targetUser._id.toString() === req.userId) {
        return res.status(400).json({
          success: false,
          message: "You cannot follow yourself",
        });
      }

      const isFollowing = req.currentUser.following.includes(
        targetUser._id
      );

      if (isFollowing) {
        req.currentUser.following.pull(targetUser._id);
        targetUser.followers.pull(req.userId);
      } else {
        req.currentUser.following.addToSet(targetUser._id);
        targetUser.followers.addToSet(req.userId);
      }

      await req.currentUser.safeSave();
      await targetUser.safeSave();

      res.json({
        success: true,
        data: { isFollowing: !isFollowing },
        message: isFollowing ? "Unfollowed" : "Followed",
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
