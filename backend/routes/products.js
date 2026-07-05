/* ================================================
   Route: สินค้า
   ================================================ */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

/* -----------------------------------------------
   GET /api/products
   ดึงสินค้าทั้งหมด (สำหรับหน้า POS)
   ----------------------------------------------- */
router.get('/', async function (req, res) {
    try {
        var lang = req.query.lang || 'la';
        var catId = req.query.category_id;

        var sql = 'SELECT p.*, c.name_la as cat_name_la, c.name_en as cat_name_en, c.icon as cat_icon '
            + 'FROM products p LEFT JOIN categories c ON p.category_id = c.id '
            + 'WHERE p.is_active = TRUE';

        var params = [];
        if (catId) {
            sql += ' AND p.category_id = $' + (params.length + 1);
            params.push(catId);
        }

        sql += ' ORDER BY c.sort_order, p.id';

        var products = await db.query(sql, params);

        // แปลงข้อมูลให้อยู่ในรูปแบบที่ frontend ใช้
        var result = products.map(function (p) {
            return {
                id: p.id,
                nameKey: p.name_key,
                name: lang === 'en' ? p.name_en : p.name_la,
                desc: lang === 'en' ? (p.desc_en || '') : (p.desc_la || ''),
                icon: p.icon,
                color: p.color,
                category: p.category_id,
                categoryName: lang === 'en' ? p.cat_name_en : p.cat_name_la,
                categoryIcon: p.cat_icon,
                priceM: p.price_m,
                priceL: p.price_l
            };
        });

        res.json(result);

    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/products/categories
   ดึงหมวดหมู่ทั้งหมด
   ----------------------------------------------- */
router.get('/categories', async function (req, res) {
    try {
        var lang = req.query.lang || 'la';
        var categories = await db.query(
            'SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order'
        );

        var result = categories.map(function (c) {
            return {
                id: c.id,
                name: lang === 'en' ? c.name_en : c.name_la,
                icon: c.icon,
                sortOrder: c.sort_order
            };
        });

        res.json(result);

    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

module.exports = router;