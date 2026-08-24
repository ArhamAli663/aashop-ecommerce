const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

// Promisify helper methods
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

// Initialize schema and seed data
const initDB = async () => {
  try {
    // 1. Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 1.1 OTPs table
    await run(`
      CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        purpose TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure is_verified, avatar_url, phone, and is_admin columns exist
    try {
      await run('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0');
    } catch (e) {}
    try {
      await run('ALTER TABLE users ADD COLUMN avatar_url TEXT');
    } catch (e) {}
    try {
      await run('ALTER TABLE users ADD COLUMN phone TEXT');
    } catch (e) {}
    try {
      await run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
    } catch (e) {}

    // Seed / Ensure Admin User: ubaidmehar@gmail.com / ubaidmehar@663
    try {
      const bcrypt = require('bcryptjs');
      const adminEmail = 'ubaidmehar@gmail.com';
      const existingAdmin = await get('SELECT * FROM users WHERE LOWER(email) = ?', [adminEmail]);
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash('ubaidmehar@663', salt);

      if (!existingAdmin) {
        await run(
          'INSERT INTO users (name, email, password_hash, is_verified, is_admin) VALUES (?, ?, ?, ?, ?)',
          ['Ubaid Mehar (Admin)', adminEmail, adminHash, 1, 1]
        );
        console.log('👑 Admin user ubaidmehar@gmail.com initialized.');
      } else {
        await run(
          'UPDATE users SET password_hash = ?, is_admin = 1, is_verified = 1 WHERE id = ?',
          [adminHash, existingAdmin.id]
        );
        console.log('👑 Admin user credentials verified.');
      }
    } catch (adminErr) {
      console.error('Error seeding admin user:', adminErr);
    }

    // 2. Products table
    await run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        original_price REAL,
        category TEXT NOT NULL,
        rating REAL DEFAULT 4.5,
        rating_count INTEGER DEFAULT 12,
        image_url TEXT,
        stock INTEGER DEFAULT 50,
        featured INTEGER DEFAULT 0,
        badge TEXT DEFAULT 'Flash Sale',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure badge column exists
    try {
      await run('ALTER TABLE products ADD COLUMN badge TEXT DEFAULT "Flash Sale"');
    } catch (e) {
      // Column already exists
    }

    // 3. Orders table
    await run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'Processing',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // 4. Order Items table
    await run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        image_url TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id)
      )
    `);

    // 5. Store Settings & Payment Numbers table
    await run(`
      CREATE TABLE IF NOT EXISTS store_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default store settings if missing
    const defaultSettings = [
      { key: 'whatsapp_number', value: '03298024266' },
      { key: 'easypaisa_number', value: '03298024266' },
      { key: 'easypaisa_title', value: 'Ubaid Mehar' },
      { key: 'jazzcash_number', value: '03298024266' },
      { key: 'jazzcash_title', value: 'Ubaid Mehar' },
      { key: 'bank_name', value: 'Meezan Bank Ltd' },
      { key: 'bank_account_number', value: '01020304050607' },
      { key: 'bank_account_title', value: 'Ubaid Mehar' },
      { key: 'support_email', value: 'ubaidmehar@gmail.com' }
    ];

    for (const setting of defaultSettings) {
      const existingSetting = await get('SELECT * FROM store_settings WHERE key = ?', [setting.key]);
      if (!existingSetting) {
        await run('INSERT INTO store_settings (key, value) VALUES (?, ?)', [setting.key, setting.value]);
      }
    }

    // 6. Broadcast Notifications & Store-Wide Messages table
    await run(`
      CREATE TABLE IF NOT EXISTS broadcast_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'announcement',
        target TEXT DEFAULT 'all',
        link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure customer_phone, ai_verified, verification_status in orders table
    try {
      await run('ALTER TABLE orders ADD COLUMN customer_phone TEXT');
    } catch (e) {}
    try {
      await run('ALTER TABLE orders ADD COLUMN ai_verified INTEGER DEFAULT 0');
    } catch (e) {}
    try {
      await run('ALTER TABLE orders ADD COLUMN verification_status TEXT DEFAULT "Pending"');
    } catch (e) {}

    // Seed sample initial broadcast if none exist
    const countBroadcasts = await get('SELECT COUNT(*) as count FROM broadcast_notifications');
    if (countBroadcasts.count === 0) {
      await run(
        'INSERT INTO broadcast_notifications (title, message, type, target) VALUES (?, ?, ?, ?)',
        ['🔥 Welcome to AA Shop Live Store!', 'Get 100% Free Express Delivery across Pakistan on all orders above Rs. 25,000!', 'promo', 'all']
      );
    }

    // Seed or Refresh rich Daraz-style products catalog
    const countRow = await get('SELECT COUNT(*) as count FROM products');
    if (countRow.count < 20) {
      console.log('🌱 Seeding expanded Daraz-style AA Shop products catalog...');
      await run('DELETE FROM products'); // Reset to fresh rich catalog

      const darazProducts = [
        // Category 1: Mobiles & Tablets
        {
          title: 'Apple iPhone 15 Pro Max (256GB, Titanium Blue)',
          description: 'A17 Pro chip with 6-core GPU, 48MP main camera with 5x optical zoom, Action button, USB-C 3.0, and super durable titanium frame.',
          price: 1199.00,
          original_price: 1349.00,
          category: 'Mobiles & Tablets',
          rating: 4.9,
          rating_count: 340,
          image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
          stock: 45,
          featured: 1,
          badge: 'Top Seller'
        },
        {
          title: 'Samsung Galaxy S24 Ultra 5G (512GB, Titanium Gray)',
          description: 'Snapdragon 8 Gen 3 with Galaxy AI live translate, 200MP camera, integrated S-Pen stylus, and flat 6.8" 120Hz Dynamic AMOLED display.',
          price: 1099.99,
          original_price: 1299.99,
          category: 'Mobiles & Tablets',
          rating: 4.8,
          rating_count: 280,
          image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80',
          stock: 38,
          featured: 1,
          badge: 'Galaxy AI'
        },
        {
          title: 'Apple iPad Pro 12.9" M2 (Wi-Fi + Cellular)',
          description: 'Liquid Retina XDR display with ProMotion, M2 chip performance, Apple Pencil hover, and all-day battery life.',
          price: 899.00,
          original_price: 1049.00,
          category: 'Mobiles & Tablets',
          rating: 4.9,
          rating_count: 195,
          image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
          stock: 25,
          featured: 0,
          badge: 'Best Deal'
        },
        {
          title: 'Xiaomi Smart Band 8 Pro with AMOLED Curved Screen',
          description: '1.74-inch 60Hz AMOLED screen, GNSS satellite positioning, 150+ sports modes, 14 days battery life, and 5ATM waterproof.',
          price: 59.99,
          original_price: 79.99,
          category: 'Mobiles & Tablets',
          rating: 4.7,
          rating_count: 420,
          image_url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80',
          stock: 120,
          featured: 0,
          badge: 'Flash Sale'
        },

        // Category 2: Electronic Devices & Computing
        {
          title: 'Apple MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)',
          description: 'Liquid Retina XDR display, up to 22 hours battery life, 16-core CPU, and 40-core GPU for extreme professional workflow.',
          price: 2499.00,
          original_price: 2799.00,
          category: 'Electronic Devices',
          rating: 5.0,
          rating_count: 115,
          image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
          stock: 18,
          featured: 1,
          badge: 'Official Store'
        },
        {
          title: 'Sony PlayStation 5 Slim Digital Console (1TB SSD)',
          description: 'Lightning speed with custom SSD, deeper immersion with haptic feedback, adaptive triggers, and 3D Audio technology.',
          price: 449.99,
          original_price: 499.99,
          category: 'Electronic Devices',
          rating: 4.9,
          rating_count: 512,
          image_url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80',
          stock: 50,
          featured: 1,
          badge: 'Hot Deal'
        },
        {
          title: 'Fujifilm X-T5 Mirrorless 40.2MP 4K/6K Digital Camera',
          description: '5-axis in-body image stabilization, X-Trans CMOS 5 HR sensor, classic dial ergonomics, and ultra-sharp 6.2K video.',
          price: 1699.00,
          original_price: 1899.00,
          category: 'Electronic Devices',
          rating: 4.9,
          rating_count: 88,
          image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
          stock: 14,
          featured: 0,
          badge: 'Exclusive'
        },
        {
          title: 'Logitech MX Master 3S Wireless Performance Mouse',
          description: '8K DPI any-surface tracking, quiet clicks, MagSpeed electromagnetic scrolling, and Bluetooth/Logi Bolt multi-device connect.',
          price: 99.99,
          original_price: 119.99,
          category: 'Electronic Devices',
          rating: 4.8,
          rating_count: 670,
          image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80',
          stock: 80,
          featured: 0,
          badge: 'Best Seller'
        },

        // Category 3: Audio & Sound
        {
          title: 'Sony WH-1000XM5 Noise Canceling Wireless Headphones',
          description: 'Industry-leading noise canceling with 8 microphones, Auto NC Optimizer, crystal clear hands-free calling, and 30-hr battery.',
          price: 349.99,
          original_price: 399.99,
          category: 'Audio & Sound',
          rating: 4.9,
          rating_count: 450,
          image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
          stock: 65,
          featured: 1,
          badge: 'Choice Item'
        },
        {
          title: 'Apple AirPods Pro 2nd Gen with USB-C Charging Case',
          description: 'H2 chip, 2x more Active Noise Cancellation, Adaptive Audio, Conversation Awareness, and personalized spatial audio with dynamic head tracking.',
          price: 199.00,
          original_price: 249.00,
          category: 'Audio & Sound',
          rating: 4.8,
          rating_count: 890,
          image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80',
          stock: 90,
          featured: 1,
          badge: 'Free Shipping'
        },
        {
          title: 'JBL Charge 5 Portable Waterproof Bluetooth Speaker',
          description: 'Bold JBL Original Pro Sound, dual passive radiators, 20 hours of playtime, built-in powerbank to charge your devices, and IP67 waterproof.',
          price: 139.95,
          original_price: 179.95,
          category: 'Audio & Sound',
          rating: 4.8,
          rating_count: 360,
          image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80',
          stock: 70,
          featured: 0,
          badge: 'Summer Deal'
        },

        // Category 4: TV & Home Appliances
        {
          title: 'Samsung 55" QLED 4K Smart TV (Quantum HDR)',
          description: '100% color volume with Quantum Dot, Quantum Processor Lite 4K upscaling, Motion Xcelerator, and built-in voice assistants.',
          price: 549.00,
          original_price: 699.00,
          category: 'TV & Home Appliances',
          rating: 4.7,
          rating_count: 140,
          image_url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
          stock: 20,
          featured: 1,
          badge: 'Super Discount'
        },
        {
          title: 'Ninja XL Digital Air Fryer (8-in-1 DualZone 9L)',
          description: 'Dual baskets let you cook 2 foods, 2 ways, and finish at the same time with Smart Finish tech. Crisp, roast, bake, broil, dehydrate.',
          price: 169.99,
          original_price: 219.99,
          category: 'TV & Home Appliances',
          rating: 4.8,
          rating_count: 290,
          image_url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80',
          stock: 35,
          featured: 0,
          badge: 'Daraz Mall'
        },
        {
          title: 'DeLonghi Dedica Deluxe Espresso & Cappuccino Machine',
          description: '15-bar professional pressure pump, premium stainless steel finish, manual milk frother, and rapid thermoblock heating system.',
          price: 229.00,
          original_price: 289.00,
          category: 'TV & Home Appliances',
          rating: 4.7,
          rating_count: 175,
          image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
          stock: 28,
          featured: 0,
          badge: 'Chef Choice'
        },

        // Category 5: Fashion & Apparel
        {
          title: 'Nike Air Zoom Pegasus 40 Running Shoes',
          description: 'Engineered mesh upper for breathability, React foam midsole, dual Zoom Air units in forefoot and heel for responsive energy return.',
          price: 125.00,
          original_price: 150.00,
          category: 'Fashion & Apparel',
          rating: 4.8,
          rating_count: 530,
          image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
          stock: 95,
          featured: 1,
          badge: 'Authentic 100%'
        },
        {
          title: 'Men’s Classic Leather Chronograph Wrist Watch',
          description: 'Scratch-resistant sapphire crystal glass, Japanese quartz movement, water-resistant 50M, with genuine hand-stitched brown leather strap.',
          price: 149.00,
          original_price: 199.00,
          category: 'Fashion & Apparel',
          rating: 4.8,
          rating_count: 220,
          image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
          stock: 60,
          featured: 1,
          badge: 'Luxury'
        },
        {
          title: 'Vintage Denim Trucker Jacket (Premium Cotton)',
          description: '100% heavyweight washed denim, button-up front with classic fold-over collar, chest flap pockets, and timeless relaxed fit.',
          price: 79.99,
          original_price: 110.00,
          category: 'Fashion & Apparel',
          rating: 4.6,
          rating_count: 180,
          image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80',
          stock: 75,
          featured: 0,
          badge: 'Trend 2026'
        },
        {
          title: 'Polarized Aviator Sunglasses (Titanium Frame)',
          description: 'UV400 anti-glare polarized coating, ultra-light titanium frame with silicone nose pads, and protective hard leather case.',
          price: 59.00,
          original_price: 89.00,
          category: 'Fashion & Apparel',
          rating: 4.7,
          rating_count: 215,
          image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
          stock: 85,
          featured: 0,
          badge: 'UV400 Protect'
        },

        // Category 6: Beauty & Health
        {
          title: 'Dior Sauvage Eau de Parfum (100ml)',
          description: 'A sensual and mysterious fragrance infused with notes of Calabrian bergamot, smoky vanilla absolute, and cedarwood.',
          price: 145.00,
          original_price: 175.00,
          category: 'Beauty & Health',
          rating: 4.9,
          rating_count: 460,
          image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
          stock: 55,
          featured: 1,
          badge: 'Best Seller'
        },
        {
          title: 'Dyson Supersonic Hair Dryer with Intelligent Heat Control',
          description: 'Fast drying with no extreme heat. Engineered for different hair types, comes with 5 styling attachments including Flyaway attachment.',
          price: 399.00,
          original_price: 449.00,
          category: 'Beauty & Health',
          rating: 4.8,
          rating_count: 310,
          image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
          stock: 30,
          featured: 0,
          badge: 'Salon Pro'
        },
        {
          title: 'Organic Vitamin C + Hyaluronic Acid Glowing Face Serum',
          description: 'Powerful anti-aging antioxidant formula that brightens skin tone, reduces fine lines, and deeply hydrates with pure botanical extracts.',
          price: 24.99,
          original_price: 39.99,
          category: 'Beauty & Health',
          rating: 4.7,
          rating_count: 780,
          image_url: 'https://images.unsplash.com/photo-1608248597359-561352f143f1?w=800&q=80',
          stock: 140,
          featured: 0,
          badge: '98% Organic'
        },

        // Category 7: Sports & Outdoor
        {
          title: 'Adjustable Quick-Select Dumbbells Set (5-52.5 lbs)',
          description: 'Space-saving dumbbell pair with smooth dial adjustment system. Replaces 15 sets of weights for comprehensive home gym workouts.',
          price: 299.00,
          original_price: 389.00,
          category: 'Sports & Outdoor',
          rating: 4.8,
          rating_count: 190,
          image_url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&q=80',
          stock: 30,
          featured: 0,
          badge: 'Home Gym'
        },
        {
          title: 'Urban Explorer Waterproof Tactical Backpack (30L)',
          description: 'MOLLE webbing system, padded 17" laptop compartment, water-repellent 900D Oxford fabric, and ergonomic breathable shoulder straps.',
          price: 69.99,
          original_price: 99.99,
          category: 'Sports & Outdoor',
          rating: 4.8,
          rating_count: 310,
          image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
          stock: 65,
          featured: 0,
          badge: 'Heavy Duty'
        },

        // Category 8: Automotive & Accessories
        {
          title: '70mai 4K Front & Rear Dual Car Dash Camera',
          description: 'Sony Starvis 2 sensor, 4K Ultra HD recording, built-in GPS, ADAS voice alert driver assistance, and 24-hr parking surveillance.',
          price: 139.99,
          original_price: 189.99,
          category: 'Automotive & Accessories',
          rating: 4.8,
          rating_count: 240,
          image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80',
          stock: 45,
          featured: 0,
          badge: '4K HDR'
        }
      ];

      for (const p of darazProducts) {
        await run(`
          INSERT INTO products (title, description, price, original_price, category, rating, rating_count, image_url, stock, featured, badge)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [p.title, p.description, p.price, p.original_price, p.category, p.rating, p.rating_count, p.image_url, p.stock, p.featured, p.badge]);
      }
      console.log(`✅ Seeded ${darazProducts.length} AA Shop products successfully!`);
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
};

module.exports = {
  db,
  run,
  get,
  all,
  initDB
};
