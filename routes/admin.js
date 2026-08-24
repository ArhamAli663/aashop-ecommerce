const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const { authenticateToken } = require('./auth');

// Middleware to protect admin routes
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const userEmail = (req.user.email || '').toLowerCase();
  if (req.user.is_admin === 1 || userEmail === 'ubaidmehar@gmail.com') {
    return next();
  }

  // Check database directly as fallback
  try {
    const dbUser = await get('SELECT is_admin, email FROM users WHERE id = ?', [req.user.id]);
    if (dbUser && (dbUser.is_admin === 1 || (dbUser.email && dbUser.email.toLowerCase() === 'ubaidmehar@gmail.com'))) {
      return next();
    }
  } catch (e) {}

  return res.status(403).json({ success: false, message: 'Access denied: Admin credentials required.' });
};

// 1. GET /api/admin/stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalOrdersRow = await get('SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_sales FROM orders');
    const pendingOrdersRow = await get("SELECT COUNT(*) as pending_orders FROM orders WHERE LOWER(status) = 'pending' OR status IS NULL");
    const totalProductsRow = await get('SELECT COUNT(*) as total_products FROM products');
    const totalUsersRow = await get('SELECT COUNT(*) as total_users FROM users');

    res.json({
      success: true,
      stats: {
        total_sales: totalOrdersRow.total_sales || 0,
        total_orders: totalOrdersRow.total_orders || 0,
        pending_orders: pendingOrdersRow.pending_orders || 0,
        total_products: totalProductsRow.total_products || 0,
        total_users: totalUsersRow.total_users || 0
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats.' });
  }
});

// 2. GET /api/admin/orders (Full order history with customer info, payment details, & items)
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await all('SELECT * FROM orders ORDER BY created_at DESC');

    // Fetch items for each order
    for (const order of orders) {
      const items = await all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items || [];
    }

    res.json({
      success: true,
      orders
    });
  } catch (err) {
    console.error('Admin fetch orders error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// 3. PUT /api/admin/orders/:id/status (Update Order status e.g. Pending, Confirmed, Out for Delivery, Delivered, Cancelled)
router.put('/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const order = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    await run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    const updatedOrder = await get('SELECT * FROM orders WHERE id = ?', [orderId]);

    res.json({
      success: true,
      message: `Order #${updatedOrder.order_number || orderId} status updated to ${status}!`,
      order: updatedOrder
    });
  } catch (err) {
    console.error('Admin update order status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// 4. GET /api/admin/products (List all products for management)
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await all('SELECT * FROM products ORDER BY id DESC');
    res.json({
      success: true,
      products
    });
  } catch (err) {
    console.error('Admin products error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// 5. POST /api/admin/products (Add new product with flash deals support)
router.post('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description = '',
      price,
      original_price = null,
      category,
      image_url,
      stock = 50,
      featured = 0,
      badge = 'Flash Sale'
    } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ success: false, message: 'Title, price, and category are required.' });
    }

    const cleanImg = image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';
    const result = await run(`
      INSERT INTO products (title, description, price, original_price, category, rating, rating_count, image_url, stock, featured, badge)
      VALUES (?, ?, ?, ?, ?, 5.0, 1, ?, ?, ?, ?)
    `, [
      title.trim(),
      description.trim(),
      parseFloat(price),
      original_price ? parseFloat(original_price) : null,
      category.trim(),
      cleanImg,
      parseInt(stock) || 50,
      featured ? 1 : 0,
      badge ? badge.trim() : 'Flash Sale'
    ]);

    const newProduct = await get('SELECT * FROM products WHERE id = ?', [result.id]);

    res.status(201).json({
      success: true,
      message: 'Product added successfully to AA Shop!',
      product: newProduct
    });
  } catch (err) {
    console.error('Admin create product error:', err);
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

// 6. PUT /api/admin/products/:id (Edit product / update flash deal)
router.put('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      title,
      description,
      price,
      original_price,
      category,
      image_url,
      stock,
      featured,
      badge
    } = req.body;

    const existing = await get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await run(`
      UPDATE products SET
        title = ?,
        description = ?,
        price = ?,
        original_price = ?,
        category = ?,
        image_url = ?,
        stock = ?,
        featured = ?,
        badge = ?
      WHERE id = ?
    `, [
      title ? title.trim() : existing.title,
      description !== undefined ? description.trim() : existing.description,
      price !== undefined ? parseFloat(price) : existing.price,
      original_price !== undefined ? (original_price ? parseFloat(original_price) : null) : existing.original_price,
      category ? category.trim() : existing.category,
      image_url ? image_url.trim() : existing.image_url,
      stock !== undefined ? parseInt(stock) : existing.stock,
      featured !== undefined ? (featured ? 1 : 0) : existing.featured,
      badge !== undefined ? badge.trim() : existing.badge,
      productId
    ]);

    const updated = await get('SELECT * FROM products WHERE id = ?', [productId]);

    res.json({
      success: true,
      message: 'Product updated successfully!',
      product: updated
    });
  } catch (err) {
    console.error('Admin update product error:', err);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

const bcrypt = require('bcryptjs');

// 7. DELETE /api/admin/products/:id (Delete product)
router.delete('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const existing = await get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await run('DELETE FROM products WHERE id = ?', [productId]);

    res.json({
      success: true,
      message: `Product "${existing.title}" deleted from catalog!`
    });
  } catch (err) {
    console.error('Admin delete product error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

// 8. GET /api/admin/settings (Fetch store settings and admin profile)
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM store_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    const adminUser = await get('SELECT id, name, email, phone, created_at FROM users WHERE is_admin = 1 OR LOWER(email) = "ubaidmehar@gmail.com" LIMIT 1');

    res.json({
      success: true,
      settings,
      admin: adminUser || { name: 'Ubaid Mehar', email: 'ubaidmehar@gmail.com' }
    });
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to load store settings.' });
  }
});

// 9. PUT /api/admin/settings (Update WhatsApp & Payment Account Numbers)
router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      whatsapp_number,
      easypaisa_number,
      easypaisa_title,
      jazzcash_number,
      jazzcash_title,
      bank_name,
      bank_account_number,
      bank_account_title,
      support_email
    } = req.body;

    const updates = {
      whatsapp_number,
      easypaisa_number,
      easypaisa_title,
      jazzcash_number,
      jazzcash_title,
      bank_name,
      bank_account_number,
      bank_account_title,
      support_email
    };

    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        const valStr = String(v).trim();
        const existing = await get('SELECT id FROM store_settings WHERE key = ?', [k]);
        if (existing) {
          await run('UPDATE store_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [valStr, k]);
        } else {
          await run('INSERT INTO store_settings (key, value) VALUES (?, ?)', [k, valStr]);
        }
      }
    }

    res.json({
      success: true,
      message: 'Store settings and payment accounts updated successfully! ⚙️'
    });
  } catch (err) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
});

// 10. PUT /api/admin/profile (Update Admin Name, Email & Avatar)
router.put('/profile', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, avatar_url } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const existing = await get('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [trimmedEmail, req.user.id]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email address is already in use by another account.' });
    }

    if (avatar_url !== undefined) {
      await run('UPDATE users SET name = ?, email = ?, avatar_url = ? WHERE id = ?', [trimmedName, trimmedEmail, avatar_url, req.user.id]);
    } else {
      await run('UPDATE users SET name = ?, email = ? WHERE id = ?', [trimmedName, trimmedEmail, req.user.id]);
    }

    const updatedAdmin = await get('SELECT id, name, email, phone, avatar_url, is_admin FROM users WHERE id = ?', [req.user.id]);

    res.json({
      success: true,
      message: 'Admin profile updated successfully! 👤',
      admin: updatedAdmin
    });
  } catch (err) {
    console.error('Admin update profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update admin profile.' });
  }
});

// 11. PUT /api/admin/change-password (Update Admin Password)
router.put('/change-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

    res.json({
      success: true,
      message: 'Admin password changed successfully! 🔒'
    });
  } catch (err) {
    console.error('Admin change password error:', err);
    res.status(500).json({ success: false, message: 'Failed to change admin password.' });
  }
});

// 12. GET /api/admin/public-config (Public settings for checkout & dynamic WhatsApp buttons)
router.get('/public-config', async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM store_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({
      success: true,
      settings: {
        whatsapp_number: settings.whatsapp_number || '03298024266',
        easypaisa_number: settings.easypaisa_number || '03298024266',
        easypaisa_title: settings.easypaisa_title || 'Ubaid Mehar',
        jazzcash_number: settings.jazzcash_number || '03298024266',
        jazzcash_title: settings.jazzcash_title || 'Ubaid Mehar',
        bank_name: settings.bank_name || 'Meezan Bank Ltd',
        bank_account_number: settings.bank_account_number || '01020304050607',
        bank_account_title: settings.bank_account_title || 'Ubaid Mehar'
      }
    });
  } catch (err) {
    res.json({
      success: true,
      settings: {
        whatsapp_number: '03298024266',
        easypaisa_number: '03298024266',
        easypaisa_title: 'Ubaid Mehar',
        jazzcash_number: '03298024266',
        jazzcash_title: 'Ubaid Mehar'
      }
    });
  }
});

// 13. POST /api/admin/broadcast - Create & Send Broadcast Message / Notification
router.post('/broadcast', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, message, type, target, link } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Notification title and message are required.' });
    }

    const result = await run(`
      INSERT INTO broadcast_notifications (title, message, type, target, link)
      VALUES (?, ?, ?, ?, ?)
    `, [
      title.trim(),
      message.trim(),
      type || 'announcement',
      target || 'all',
      link ? link.trim() : null
    ]);

    const created = await get('SELECT * FROM broadcast_notifications WHERE id = ?', [result.id]);

    res.json({
      success: true,
      message: 'Broadcast notification sent to all store users successfully! 📢',
      broadcast: created
    });
  } catch (err) {
    console.error('Admin broadcast error:', err);
    res.status(500).json({ success: false, message: 'Failed to send broadcast notification.' });
  }
});

// 14. GET /api/admin/broadcasts - Get sent broadcasts history
router.get('/broadcasts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const broadcasts = await all('SELECT * FROM broadcast_notifications ORDER BY created_at DESC LIMIT 50');
    res.json({
      success: true,
      broadcasts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch broadcasts.' });
  }
});

// 15. GET /api/admin/public-broadcasts (Public notifications endpoint)
router.get('/public-broadcasts', async (req, res) => {
  try {
    const broadcasts = await all('SELECT * FROM broadcast_notifications ORDER BY created_at DESC LIMIT 10');
    res.json({
      success: true,
      broadcasts
    });
  } catch (err) {
    res.json({ success: true, broadcasts: [] });
  }
});

module.exports = router;
