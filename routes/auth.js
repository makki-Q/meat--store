const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authMiddleware, adminMiddleware, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required' });
  }
  if (role !== 'storekeeper') {
    return res.status(400).json({ message: 'Only storekeeper role can be registered' });
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    const user = new User({ username, password, role, verified: false });
    await user.save();
    res.status(201).json({ message: 'Storekeeper registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  try {
    // Hardcoded admin credentials
    if (username === 'qayyum61333' && password === 'rashid') {
      const token = jwt.sign(
        { userId: 'admin', role: 'admin' },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: '1d' }
      );
      return res.json({ token, role: 'admin', username: 'qayyum61333' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.disabled) {
      return res.status(403).json({ message: 'User account is disabled' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.role === 'storekeeper' && !user.verified) {
      return res.status(403).json({ message: 'User not verified by admin' });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1d' }
    );
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Verify storekeeper user (admin only)
router.post('/verify-user', authMiddleware, adminMiddleware, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'storekeeper') {
      return res.status(404).json({ message: 'Storekeeper user not found' });
    }
    user.verified = true;
    await user.save();
    res.json({ message: 'User verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const ActivityLog = require('../models/ActivityLog');

// Disable or enable user (admin only)
router.post('/disable-user', authMiddleware, adminMiddleware, async (req, res) => {
  const { userId, disable } = req.body;
  if (!userId || typeof disable !== 'boolean') {
    return res.status(400).json({ message: 'User ID and disable flag are required' });
  }
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'storekeeper') {
      return res.status(404).json({ message: 'Storekeeper user not found' });
    }
    user.disabled = disable;
    await user.save();

    // Log the action
    const log = new ActivityLog({
      userId: req.user.userId,
      action: `${disable ? 'Disabled' : 'Enabled'} user ${user.username}`
    });
    await log.save();

    res.json({ message: `User ${disable ? 'disabled' : 'enabled'} successfully` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reset user password (admin only)
router.post('/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ message: 'User ID and new password are required' });
  }
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'storekeeper') {
      return res.status(404).json({ message: 'Storekeeper user not found' });
    }
    user.password = newPassword;
    await user.save();

    // Log the action
    const log = new ActivityLog({
      userId: req.user.userId,
      action: `Reset password for user ${user.username}`
    });
    await log.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get activity logs (admin only)
router.get('/activity-logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const logs = await ActivityLog.find().populate('userId', 'username').sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/unverified-users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: 'storekeeper', verified: false }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/storekeeper-users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: 'storekeeper' }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
