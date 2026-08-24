const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./db');
const { router: authRouter } = require('./routes/auth');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const aiRouter = require('./routes/ai');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);

// Health check / API info
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'E-Commerce Backend is running smoothly 🚀', timestamp: new Date() });
});

// Fallback to index.html for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🛒 E-Commerce Server running at http://localhost:${PORT}`);
      console.log(`📦 Database: SQLite initialized & verified`);
      console.log(`⚡ APIs available at http://localhost:${PORT}/api/`);
      console.log(`==================================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
