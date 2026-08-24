const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const { authenticateToken, optionalAuth } = require('./auth');

// POST /api/orders - Process & Place Order (Guest or Logged in user)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      address,
      city,
      postal_code,
      payment_method,
      items
    } = req.body;

    // Validation
    if (!customer_name || !customer_email || !address || !city || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required shipping details and at least one order item.'
      });
    }

    // Verify products, prices, and stock
    let total_amount = 0;
    const verifiedItems = [];

    for (const item of items) {
      const product = await get('SELECT * FROM products WHERE id = ?', [item.product_id || item.id]);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product_id || item.id} not found.`
        });
      }

      const qty = parseInt(item.quantity) || 1;
      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.title}". Only ${product.stock} left in stock.`
        });
      }

      const itemTotal = product.price * qty;
      total_amount += itemTotal;

      verifiedItems.push({
        product_id: product.id,
        title: product.title,
        price: product.price,
        quantity: qty,
        image_url: product.image_url
      });
    }

    // Calculate shipping (free over $100, else $10) and tax (5%)
    const shipping = total_amount > 100 ? 0 : 9.99;
    const tax = +(total_amount * 0.05).toFixed(2);
    const grandTotal = +(total_amount + shipping + tax).toFixed(2);

    const userId = req.user ? req.user.id : null;
    const customerPhone = req.body.phone || req.body.customer_phone || req.body.contact_phone || '03000000000';

    // Create Order Record
    const orderResult = await run(`
      INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, address, city, postal_code, payment_method, total_amount, status, verification_status, ai_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending AI Verification', 0)
    `, [
      userId,
      customer_name.trim(),
      customer_email.trim().toLowerCase(),
      customerPhone.trim(),
      address.trim(),
      city.trim(),
      postal_code ? postal_code.trim() : '00000',
      payment_method || 'Cash on Delivery',
      grandTotal
    ]);

    const orderId = orderResult.id;

    // Insert Order Items and Update Stock
    for (const vItem of verifiedItems) {
      await run(`
        INSERT INTO order_items (order_id, product_id, title, price, quantity, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [orderId, vItem.product_id, vItem.title, vItem.price, vItem.quantity, vItem.image_url]);

      await run(`
        UPDATE products SET stock = stock - ? WHERE id = ?
      `, [vItem.quantity, vItem.product_id]);
    }

    const createdOrder = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
    const orderItems = await all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    // Fetch active WhatsApp support number from store_settings
    const waSetting = await get('SELECT value FROM store_settings WHERE key = "whatsapp_number"');
    const adminWhatsApp = waSetting ? waSetting.value : '03298024266';
    let waDigits = adminWhatsApp.replace(/[^0-9]/g, '');
    if (waDigits.startsWith('0')) waDigits = '92' + waDigits.substring(1);

    // AI automated verification message template
    const aiMessageText = `Assalam-o-Alaikum ${customer_name}! 🛍️\nThis is AA Shop Automated AI Order Verification.\n\nYou have placed Order #ORD-${String(orderId).padStart(6, '0')} for Rs. ${grandTotal.toLocaleString()}.\n\n👉 Please reply "YES" to confirm your order for express dispatch, or reply "NO" to cancel this order.\n\nThank you for shopping with AA Shop!`;
    const encodedAiMsg = encodeURIComponent(aiMessageText);
    const aiDispatchLink = `https://wa.me/${waDigits}?text=${encodedAiMsg}`;

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Automated AI WhatsApp confirmation prepared.',
      order: {
        ...createdOrder,
        order_number: `ORD-${String(orderId).padStart(6, '0')}`,
        subtotal: +total_amount.toFixed(2),
        shipping,
        tax,
        items: orderItems,
        ai_whatsapp_link: aiDispatchLink,
        ai_message_preview: aiMessageText
      }
    });
  } catch (error) {
    console.error('Order placement error:', error);
    res.status(500).json({ success: false, message: 'Failed to process and place order.' });
  }
});

// POST /api/orders/verify-ai - AI / Customer Order Confirmation Response ("YES" / "NO")
router.post('/verify-ai', async (req, res) => {
  try {
    const { order_id, response } = req.body;
    if (!order_id || !response) {
      return res.status(400).json({ success: false, message: 'Order ID and response (yes/no) are required.' });
    }

    const order = await get('SELECT * FROM orders WHERE id = ?', [order_id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const cleanResp = String(response).trim().toLowerCase();

    if (cleanResp === 'yes' || cleanResp === 'confirm' || cleanResp === 'haan' || cleanResp === 'confirmed') {
      await run(
        'UPDATE orders SET status = "Confirmed", verification_status = "Verified by AI WhatsApp ✅", ai_verified = 1 WHERE id = ?',
        [order_id]
      );
      return res.json({
        success: true,
        order_id,
        new_status: 'Confirmed',
        verification_status: 'Verified by AI WhatsApp ✅',
        message: `Order #ORD-${String(order_id).padStart(6, '0')} confirmed successfully! Status updated from Pending to Confirmed.`
      });
    } else if (cleanResp === 'no' || cleanResp === 'cancel' || cleanResp === 'nahi' || cleanResp === 'cancelled') {
      await run(
        'UPDATE orders SET status = "Cancelled", verification_status = "Cancelled by Customer (Replied NO) ❌", ai_verified = 0 WHERE id = ?',
        [order_id]
      );
      return res.json({
        success: true,
        order_id,
        new_status: 'Cancelled',
        verification_status: 'Cancelled by Customer (Replied NO) ❌',
        message: `Order #ORD-${String(order_id).padStart(6, '0')} has been cancelled.`
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid response. Please reply with "YES" to confirm or "NO" to cancel.'
      });
    }
  } catch (err) {
    console.error('AI Verify error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify order.' });
  }
});

// GET /api/orders/my-orders (Protected: Logged in user order history)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req.user.email || '').toLowerCase().trim();
    const orders = await all(
      'SELECT * FROM orders WHERE user_id = ? OR LOWER(customer_email) = ? ORDER BY id DESC',
      [req.user.id, userEmail]
    );

    const fullOrders = [];
    for (const ord of orders) {
      const items = await all('SELECT * FROM order_items WHERE order_id = ?', [ord.id]);
      fullOrders.push({
        ...ord,
        order_number: `ORD-${String(ord.id).padStart(6, '0')}`,
        items
      });
    }

    res.json({
      success: true,
      count: fullOrders.length,
      orders: fullOrders
    });
  } catch (error) {
    console.error('Fetch my-orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user orders.' });
  }
});

// GET /api/orders/by-email/:email (Fetch orders by customer email)
router.get('/by-email/:email', async (req, res) => {
  try {
    const email = (req.params.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const orders = await all(
      'SELECT * FROM orders WHERE LOWER(customer_email) = ? ORDER BY id DESC',
      [email]
    );

    const fullOrders = [];
    for (const ord of orders) {
      const items = await all('SELECT * FROM order_items WHERE order_id = ?', [ord.id]);
      fullOrders.push({
        ...ord,
        order_number: `ORD-${String(ord.id).padStart(6, '0')}`,
        items
      });
    }

    res.json({
      success: true,
      count: fullOrders.length,
      orders: fullOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders by email.' });
  }
});

// GET /api/orders/:id (Lookup single order)
router.get('/:id', async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const items = await all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    res.json({
      success: true,
      order: {
        ...order,
        order_number: `ORD-${String(order.id).padStart(6, '0')}`,
        items
      }
    });
  } catch (error) {
    console.error('Fetch order error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order.' });
  }
});

module.exports = router;
