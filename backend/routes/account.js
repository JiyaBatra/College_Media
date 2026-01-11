const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserMongo = require('../models/User');
const UserMock = require('../mockdb/userDB');
const MessageMongo = require('../models/Message');
const MessageMock = require('../mockdb/messageDB');
const { validateAccountDeletion, checkValidation } = require('../middleware/validationMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'college_media_secret_key';

/* ---------------- VERIFY TOKEN ---------------- */
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(400).json({ success: false, message: 'Invalid token' });
  }
};

/* =====================================================
   DELETE ACCOUNT (SOFT DELETE) – RACE CONDITION SAFE
===================================================== */
router.delete('/', verifyToken, validateAccountDeletion, checkValidation, async (req, res) => {
  try {
    const { password, reason } = req.body;
    const { useMongoDB } = req.app.get('dbConnection');

    // Fetch user only for password validation
    const user = useMongoDB
      ? await UserMongo.findById(req.userId)
      : await UserMock.findById(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // 🔐 ATOMIC SOFT DELETE
    let updatedUser;

    if (useMongoDB) {
      updatedUser = await UserMongo.findOneAndUpdate(
        { _id: req.userId, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletionReason: reason,
            scheduledDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        { new: true }
      );
    } else {
      updatedUser = await UserMock.softDelete(req.userId, reason);
    }

    // Already deleted by parallel request
    if (!updatedUser) {
      return res.status(200).json({
        success: true,
        message: 'Account deletion already scheduled',
      });
    }

    // Idempotent message cleanup
    if (useMongoDB) {
      await MessageMongo.updateMany(
        { $or: [{ sender: req.userId }, { receiver: req.userId }] },
        { $addToSet: { deletedBy: req.userId } }
      );
    }

    res.json({
      success: true,
      data: { scheduledDeletionDate: updatedUser.scheduledDeletionDate },
      message: 'Account deletion initiated successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting account' });
  }
});

/* =====================================================
   RESTORE ACCOUNT – RACE CONDITION SAFE
===================================================== */
router.post('/restore', verifyToken, async (req, res) => {
  try {
    const { useMongoDB } = req.app.get('dbConnection');
    let restoredUser;

    if (useMongoDB) {
      restoredUser = await UserMongo.findOneAndUpdate(
        {
          _id: req.userId,
          isDeleted: true,
          scheduledDeletionDate: { $gt: new Date() },
        },
        {
          $set: {
            isDeleted: false,
            deletedAt: null,
            scheduledDeletionDate: null,
            deletionReason: null,
          },
        },
        { new: true }
      );
    } else {
      restoredUser = await UserMock.restore(req.userId);
    }

    if (!restoredUser) {
      return res.status(400).json({
        success: false,
        message: 'Account cannot be restored',
      });
    }

    res.json({
      success: true,
      message: 'Account restored successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error restoring account' });
  }
});

/* =====================================================
   PERMANENT DELETE (unchanged logic)
===================================================== */
router.delete('/permanent', verifyToken, async (req, res) => {
  try {
    const { useMongoDB } = req.app.get('dbConnection');

    const user = useMongoDB
      ? await UserMongo.findById(req.userId)
      : await UserMock.findById(req.userId);

    if (!user || !user.isDeleted) {
      return res.status(400).json({ success: false, message: 'Account not eligible' });
    }

    if (useMongoDB) {
      await MessageMongo.deleteMany({ $or: [{ sender: req.userId }, { receiver: req.userId }] });
      await UserMongo.findByIdAndDelete(req.userId);
    } else {
      await UserMock.permanentDelete(req.userId);
    }

    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting account permanently' });
  }
});

module.exports = router;
