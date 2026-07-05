/* ================================================
   Route: สต็อกวัตถุดิบ
   ================================================ */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// ทุก route ต้องล็อกอิน
router.use(authMiddleware);

/* -----------------------------------------------
   GET /api/stock
   ดึงวัตถุดิบทั้งหมด + เช็คว่าใกล้หมดไหม
   ----------------------------------------------- */
router.get('/', async function (req, res) {
    try {
        var lang = req.query.lang || 'la';
        var ingredients = await db.query(
            'SELECT *, current_stock <= min_stock AS is_low FROM ingredients WHERE is_active = TRUE ORDER BY id'
        );

        var result = ingredients.map(function (item) {
            return {
                id: item.id,
                name: lang === 'en' ? item.name_en : item.name_la,
                unit: item.unit,
                minStock: item.min_stock,
                currentStock: item.current_stock,
                costPerUnit: item.cost_per_unit,
                isLow: item.is_low,
                diff: item.current_stock - item.min_stock
            };
        });

        // สรุปจำนวนที่ใกล้หมด
        var lowCount = result.filter(function (i) { return i.is_low; }).length;

        res.json({
            items: result,
            lowStockCount: lowCount
        });

    } catch (err) {
        console.error('Get stock error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   POST /api/stock/add
   เพิ่มวัตถุดิบเข้าคลัง
   ----------------------------------------------- */
router.post('/add', async function (req, res) {
    try {
        var ingredientId = req.body.ingredient_id;
        var qty = parseInt(req.body.qty);
        var description = req.body.description || 'เพิ่มสต็อก';

        if (!ingredientId || !qty || qty <= 0) {
            return res.status(400).json({ error: 'กรุณาระบุข้อมูลให้ครบ' });
        }

        // เพิ่มจำนวนในตาราง ingredients
        var updated = await db.queryOne(
            'UPDATE ingredients SET current_stock = current_stock + $1 WHERE id = $2 RETURNING *',
            [qty, ingredientId]
        );

        if (!updated) {
            return res.status(404).json({ error: 'ไม่พบวัตถุดิบนี้' });
        }

        // บันทึกประวัติ
        await db.insert(
            'INSERT INTO stock_logs (ingredient_id, qty, type, description, user_id) VALUES ($1, $2, $3, $4, $5)',
            [ingredientId, qty, 'add', description, req.user.id]
        );

        res.json({
            message: 'เพิ่มสต็อกสำเร็จ',
            currentStock: updated.current_stock,
            isLow: updated.current_stock <= updated.min_stock
        });

    } catch (err) {
        console.error('Add stock error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   POST /api/stock/use
   ลดวัตถุดิบ (ใช้ตอนขายสินค้า)
   ----------------------------------------------- */
router.post('/use', async function (req, res) {
    try {
        var items = req.body.items; // [{ingredient_id, qty}]
        var orderId = req.body.order_id;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'กรุณาระบุรายการ' });
        }

        var results = [];
        var warnings = [];

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var qty = parseInt(item.qty);

            // ตรวจสอบว่าพอ
            var current = await db.queryOne(
                'SELECT * FROM ingredients WHERE id = $1', [item.ingredient_id]
            );

            if (!current) {
                warnings.push('ไม่พบวัตถุดิบ ID: ' + item.ingredient_id);
                continue;
            }

            if (current.current_stock < qty) {
                warnings.push(current.name_la + ' ไม่พอ (มี ' + current.current_stock + ' ต้องการ ' + qty + ')');
                continue;
            }

            // ลดจำนวน
            var updated = await db.queryOne(
                'UPDATE ingredients SET current_stock = current_stock - $1 WHERE id = $2 RETURNING *',
                [qty, item.ingredient_id]
            );

            // บันทึกประวัติ
            await db.insert(
                'INSERT INTO stock_logs (ingredient_id, qty, type, description, user_id, order_id) VALUES ($1, $2, $3, $4, $5, $6)',
                [item.ingredient_id, qty, 'use', 'ใช้ขายสินค้า', req.user.id, orderId || null]
            );

            results.push({
                name: current.name_la,
                used: qty,
                remaining: updated.current_stock,
                isLow: updated.current_stock <= updated.min_stock
            });
        }

        res.json({
            message: 'ดำเนินการเสร็จ',
            results: results,
            warnings: warnings
        });

    } catch (err) {
        console.error('Use stock error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/stock/logs
   ประวัติการเคลื่อนไหวสต็อก
   ----------------------------------------------- */
router.get('/logs', async function (req, res) {
    try {
        var ingredientId = req.query.ingredient_id;
        var limit = parseInt(req.query.limit) || 50;

        var sql = 'SELECT sl.*, i.name_la, i.name_en, i.unit, u.display_name as user_name '
            + 'FROM stock_logs sl '
            + 'JOIN ingredients i ON sl.ingredient_id = i.id '
            + 'LEFT JOIN users u ON sl.user_id = u.id ';

        var params = [];
        if (ingredientId) {
            sql += 'WHERE sl.ingredient_id = $1 ';
            params.push(ingredientId);
        }

        sql += 'ORDER BY sl.created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit);

        var logs = await db.query(sql, params);

        res.json(logs);

    } catch (err) {
        console.error('Get stock logs error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/stock/alerts
   วัตถุดิบที่ใกล้หมดหรือหมดแล้ว
   ----------------------------------------------- */
router.get('/alerts', async function (req, res) {
    try {
        var alerts = await db.query(
            'SELECT *, CASE WHEN current_stock = 0 THEN \'empty\' WHEN current_stock <= min_stock THEN \'low\' ELSE \'ok\' END as status '
            + 'FROM ingredients WHERE is_active = TRUE AND current_stock <= min_stock '
            + 'ORDER BY current_stock ASC'
        );

        res.json(alerts);

    } catch (err) {
        console.error('Get alerts error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

module.exports = router;