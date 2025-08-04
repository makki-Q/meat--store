const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // ADD THIS LINE
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
mongoose.connect(process.env.MONGODB_URI, { // REMOVE localhost fallback
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/store-inventory', authMiddleware, require('./routes/store-inventory'));

// ADD THIS SECTION - Serve React frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));