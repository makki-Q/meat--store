const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

const { authMiddleware } = require('./middleware/auth');

// Middleware
app.use(cors({
  exposedHeaders: ['Authorization'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meatshop', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// Protect store-inventory routes with auth middleware
app.use('/api/store-inventory', authMiddleware, require('./routes/store-inventory'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
