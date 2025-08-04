const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meatshop';

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const existingAdmin = await User.findOne({ username: 'qayyum61333' });
    if (existingAdmin) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    const adminUser = new User({
      username: 'qayyum61333',
      password: 'rashid',
      role: 'admin',
      verified: true,
    });

    await adminUser.save();
    console.log('Admin user created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
}

createAdmin();
