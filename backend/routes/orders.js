/* ================================================
   Route: คำสั่งขาย
   ================================================ */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// ทุก route ต้องล็อกอินก่อน
router.use(authMiddleware);

/* -----------------------------------------------
   POST /api/orders
   บันทึกบิลขาย
   ----------------------------------------------- */
router.post('/', async function (req, res) {
    try {
        var body = req.body;
        var userId = req.user.id;

        // สร้างเลขที่บิล
        var countResult = await db.queryOne(
            "SELECT COUNT(*) as total FROM orders WHERE created_at::date = CURRENT_DATE"
        );
        var billNumber = 'BB' + String((countResult.total || 0) + 1).padStart(4, '0');

        // บันทึกหัวบิล
        var order = await db.insert(
            'INSERT INTO orders (bill_number, subtotal, discount, total, received, change_amount, payment_method, user_id, member_id, lang) '
            + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [
                billNumber,
                body.subtotal || 0,
                body.discount || 0,
                body.total || 0,
                body.received || 0,
                body.change || 0,
                body.paymentMethod || 'ເງິນສົດ',
                userId,
                body.memberId || null,
                body.lang || 'la'
            ]
        );

        // บันทึกรายการแต่ละอัน
        if (body.items && body.items.length > 0) {
            for (var i = 0; i < body.items.length; i++) {
                var item = body.items[i];
                await db.insert(
                    'INSERT INTO order_items (order_id, product_id, product_name, size, price, qty) '
                    + 'VALUES ($1, $2, $3, $4, $5, $6)',
                    [order.id, item.productId, item.productName, item.size, item.price, item.qty]
                );
            }
        }

        res.status(201).json({
            message: 'บันทึกบิลสำเร็จ',
            billNumber: billNumber,
            orderId: order.id
        });

    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/orders
   ดึงประวัติบิล (รองรับ filter วันที่)
   ----------------------------------------------- */
router.get('/', async function (req, res) {
    try {
        var date = req.query.date; // format: YYYY-MM-DD

        var sql = 'SELECT o.*, u.display_name as cashier_name '
            + 'FROM orders o LEFT JOIN users u ON o.user_id = u.id';

        var params = [];
        if (date) {
            sql += ' WHERE o.created_at::date = $1';
            params.push(date);
        }

        sql += ' ORDER BY o.created_at DESC LIMIT 100';

        var orders = await db.query(sql, params);

        // ดึงรายการของแต่ละบิล
        for (var i = 0; i < orders.length; i++) {
            var items = await db.query(
                'SELECT * FROM order_items WHERE order_id = $1',
                [orders[i].id]
            );
            orders[i].items = items;
        }

        res.json(orders);

    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/orders/summary
   สรุปยอดขายวันนี้
   ----------------------------------------------- */
router.get('/summary', async function (req, res) {
    try {
        var date = req.query.date;

        var sql = 'SELECT COUNT(*) as bill_count, COALESCE(SUM(total), 0) as total_sales '
            + 'FROM orders WHERE created_at::date = CURRENT_DATE';

        var params = [];
        if (date) {
            sql = 'SELECT COUNT(*) as bill_count, COALESCE(SUM(total), 0) as total_sales '
                + 'FROM orders WHERE created_at::date = $1';
            params.push(date);
        }

        var row = await db.queryOne(sql, params);

        res.json({
            bills: parseInt(row.bill_count) || 0,
            sales: parseInt(row.total_sales) || 0
        });

    } catch (err) {
        console.error('Get summary error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

module.exports = router;

/* -----------------------------------------------
   POST /api/orders/stock-deduction
   ลดสต็อกวัตถุดิบจากสูตร (เรียกจากหน้า admin)
   ----------------------------------------------- */
router.post('/stock-deduction', async function (req, res) {
    try {
        var orderId = req.body.order_id;

        // ดึกรายการขาย
        var items = await db.query(
            'SELECT oi.*, pr.ingredient_id, pr.qty_needed '
            + 'FROM order_items oi '
            + 'JOIN products p ON oi.product_id = p.id '
            + 'LEFT JOIN product_recipes pr ON pr.product_id = p.id '
            + 'WHERE oi.order_id = $1',
            [orderId]
        );

        // รวมจำนวนวัตถุดิบที่ต้องใช้ทั้งหมด
        var stockMap = {};
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.ingredient_id && item.qty_needed) {
                var totalNeeded = item.qty_needed * item.qty;
                if (!stockMap[item.ingredient_id]) {
                    stockMap[item.ingredient_id] = 0;
                }
                stockMap[item.ingredient_id] += totalNeeded;
            }
        }

        // ลดสต็อกทีละอัน
        var stockItems = [];
        var keys = Object.keys(stockMap);
        for (var j = 0; j < keys.length; j++) {
            var ingId = parseInt(keys[j]);
            var qty = stockMap[ingId];

            var current = await db.queryOne(
                'SELECT * FROM ingredients WHERE id = $1', [ingId]
            );

            if (!current) continue;

            if (current.current_stock < qty) {
                // ไม่พอ → แจ้งเตือนแต่ไม่ลด
                stockItems.push({
                    name: current.name_la,
                    needed: qty,
                    available: current.current_stock,
                    status: 'insufficient'
                });
                continue;
            }

            var updated = await db.queryOne(
                'UPDATE ingredients SET current_stock = current_stock - $1 WHERE id = $2 RETURNING *',
                [qty, ingId]
            );

            await db.insert(
                'INSERT INTO stock_logs (ingredient_id, qty, type, description, user_id, order_id) VALUES ($1, $2, $3, $4, $5, $6)',
                [ingId, qty, 'use', 'ขายสินค้า บิล#' + orderId, req.user.id, orderId]
            );

            stockItems.push({
                name: current.name_la,
                needed: qty,
                available: updated.current_stock,
                status: updated.current_stock <= updated.min_stock ? 'low' : 'ok'
            });
        }

        res.json({
            message: 'คำนวณสต็อกเสร็จ',
            items: stockItems
        });

    } catch (err) {
        console.error('Stock deduction error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

module.exports = router;