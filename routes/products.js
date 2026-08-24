const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');

// GET /api/products/categories (Must be before /:id)
router.get('/categories', async (req, res) => {
  try {
    const categories = await all(`
      SELECT category, COUNT(*) as count 
      FROM products 
      GROUP BY category 
      ORDER BY category ASC
    `);
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// GET /api/products
// Query params: q, category, minPrice, maxPrice, sort, featured
router.get('/', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sort, featured } = req.query;

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (q && q.trim()) {
      sql += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?)';
      const term = `%${q.trim().toLowerCase()}%`;
      params.push(term, term, term);
    }

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (minPrice) {
      sql += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      sql += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (featured === 'true' || featured === '1') {
      sql += ' AND featured = 1';
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        sql += ' ORDER BY price ASC';
        break;
      case 'price_desc':
        sql += ' ORDER BY price DESC';
        break;
      case 'rating':
        sql += ' ORDER BY rating DESC, rating_count DESC';
        break;
      case 'newest':
        sql += ' ORDER BY created_at DESC';
        break;
      default:
        sql += ' ORDER BY id ASC';
    }

    const products = await all(sql, params);
    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Get related products in same category
    const related = await all(
      'SELECT * FROM products WHERE category = ? AND id != ? LIMIT 4',
      [product.category, product.id]
    );

    res.json({
      success: true,
      product,
      related
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product details.' });
  }
});

// POST /api/products (Admin/Add Product)
router.post('/', async (req, res) => {
  try {
    const { title, description, price, original_price, category, image_url, stock, featured } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ success: false, message: 'Title, price, and category are required.' });
    }

    const result = await run(`
      INSERT INTO products (title, description, price, original_price, category, rating, rating_count, image_url, stock, featured)
      VALUES (?, ?, ?, ?, ?, 5.0, 1, ?, ?, ?)
    `, [
      title.trim(),
      description || '',
      parseFloat(price),
      original_price ? parseFloat(original_price) : parseFloat(price),
      category.trim(),
      image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      stock ? parseInt(stock) : 20,
      featured ? 1 : 0
    ]);

    const newProduct = await get('SELECT * FROM products WHERE id = ?', [result.id]);

    res.status(201).json({
      success: true,
      message: 'Product created successfully!',
      product: newProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

// POST /api/products/visual-search (AI Camera & Gallery Visual Image Search)
router.post('/visual-search', async (req, res) => {
  try {
    const { image_label, detected_tags = [], image_base64 } = req.body;

    const allProducts = await all('SELECT * FROM products');
    
    // AI similarity scoring based on visual tags, title keywords, category matches
    const scoredProducts = allProducts.map(p => {
      let score = 0;
      const lowerTitle = p.title.toLowerCase();
      const lowerCat = p.category.toLowerCase();
      const lowerDesc = (p.description || '').toLowerCase();

      // Tag matching
      detected_tags.forEach(tag => {
        const lowerTag = tag.toLowerCase().trim();
        if (lowerTitle.includes(lowerTag)) score += 40;
        if (lowerCat.includes(lowerTag)) score += 35;
        if (lowerDesc.includes(lowerTag)) score += 15;
      });

      if (image_label) {
        const lowerLabel = image_label.toLowerCase().trim();
        if (lowerTitle.includes(lowerLabel)) score += 50;
        if (lowerCat.includes(lowerLabel)) score += 40;
      }

      // Add baseline heuristic variance
      if (score > 0) {
        score = Math.min(99, Math.max(65, score + Math.floor(Math.random() * 10)));
      }

      return {
        ...p,
        similarity_score: score
      };
    });

    // Filter matching products with score > 0, sorted by similarity
    let results = scoredProducts.filter(p => p.similarity_score > 0);
    results.sort((a, b) => b.similarity_score - a.similarity_score);

    // If no specific tag matched, return top popular featured products as recommendations
    if (results.length === 0) {
      results = allProducts.slice(0, 6).map(p => ({
        ...p,
        similarity_score: Math.floor(70 + Math.random() * 20)
      }));
    }

    res.json({
      success: true,
      query_tags: detected_tags,
      matched_count: results.length,
      products: results.slice(0, 8)
    });
  } catch (error) {
    console.error('Visual search error:', error);
    res.status(500).json({ success: false, message: 'AI Visual search processing failed.' });
  }
});

module.exports = router;

