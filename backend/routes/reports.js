/* ================================================
   Route: รายงานยอดขาย
   ================================================ */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.use(authMiddleware);

/* -----------------------------------------------
   GET /api/reports/daily
   ----------------------------------------------- */
router.get('/daily', async function (req, res) {
    try {
        var date = req.query.date;

        var sql = 'SELECT o.bill_number, o.total, o.payment_method, o.created_at, '
            + 'u.display_name as cashier, '
            + 'COUNT(oi.id) as item_count '
            + 'FROM orders o '
            + 'LEFT JOIN users u ON o.user_id = u.id '
            + 'LEFT JOIN order_items oi ON oi.order_id = o.id ';

        var params = [];
        if (date) {
            sql += 'WHERE o.created_at::date = $1 ';
            params.push(date);
        } else {
            sql += 'WHERE o.created_at::date = CURRENT_DATE ';
        }

        sql += 'GROUP BY o.id ORDER BY o.created_at DESC';

        var orders = await db.query(sql, params);

        var totalSales = 0;
        var totalBills = orders.length;
        var totalItems = 0;
        var paymentBreakdown = {};

        for (var i = 0; i < orders.length; i++) {
            totalSales += parseInt(orders[i].total) || 0;
            totalItems += parseInt(orders[i].item_count) || 0;
            var method = orders[i].payment_method || 'ເງິນສົດ';
            if (!paymentBreakdown[method]) paymentBreakdown[method] = 0;
            paymentBreakdown[method] += parseInt(orders[i].total) || 0;
        }

        var productSales = await db.query(
            'SELECT oi.product_name, SUM(oi.qty) as qty, SUM(oi.price * oi.qty) as total '
            + 'FROM order_items oi '
            + 'JOIN orders o ON oi.order_id = o.id '
            + 'WHERE o.created_at::date = CURRENT_DATE '
            + 'GROUP BY oi.product_name '
            + 'ORDER BY total DESC'
        );

        res.json({
            date: date || new Date().toISOString().split('T')[0],
            totalBills: totalBills,
            totalSales: totalSales,
            totalItems: totalItems,
            avgPerBill: totalBills > 0 ? Math.round(totalSales / totalBills) : 0,
            paymentBreakdown: paymentBreakdown,
            productSales: productSales,
            orders: orders
        });

    } catch (err) {
        console.error('Daily report error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/reports/monthly
   ----------------------------------------------- */
router.get('/monthly', async function (req, res) {
    try {
        var year = parseInt(req.query.year) || new Date().getFullYear();
        var month = parseInt(req.query.month) || (new Date().getMonth() + 1);

        var dailySummary = await db.query(
            'SELECT DATE(created_at) as date, '
            + 'COUNT(*) as bills, '
            + 'COALESCE(SUM(total), 0) as sales '
            + 'FROM orders '
            + 'WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2 '
            + 'GROUP BY DATE(created_at) '
            + 'ORDER BY date',
            [year, month]
        );

        var monthTotal = await db.queryOne(
            'SELECT COUNT(*) as bills, '
            + 'COALESCE(SUM(total), 0) as sales, '
            + 'COALESCE(AVG(total), 0) as avg_bill '
            + 'FROM orders '
            + 'WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2',
            [year, month]
        );

        var topProducts = await db.query(
            'SELECT oi.product_name, SUM(oi.qty) as qty, SUM(oi.price * oi.qty) as total '
            + 'FROM order_items oi '
            + 'JOIN orders o ON oi.order_id = o.id '
            + 'WHERE EXTRACT(YEAR FROM o.created_at) = $1 AND EXTRACT(MONTH FROM o.created_at) = $2 '
            + 'GROUP BY oi.product_name '
            + 'ORDER BY total DESC LIMIT 10',
            [year, month]
        );

        var prevMonth = month === 1 ? 12 : month - 1;
        var prevYear = month === 1 ? year - 1 : year;
        var prevTotal = await db.queryOne(
            'SELECT COALESCE(SUM(total), 0) as sales '
            + 'FROM orders '
            + 'WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2',
            [prevYear, prevMonth]
        );

        var growth = 0;
        if (parseInt(prevTotal.sales) > 0) {
            growth = Math.round(((parseInt(monthTotal.sales) - parseInt(prevTotal.sales)) / parseInt(prevTotal.sales)) * 100);
        }

        res.json({
            year: year,
            month: month,
            totalBills: parseInt(monthTotal.bills) || 0,
            totalSales: parseInt(monthTotal.sales) || 0,
            avgPerBill: Math.round(parseInt(monthTotal.avg_bill)) || 0,
            growth: growth,
            prevMonthSales: parseInt(prevTotal.sales) || 0,
            dailySummary: dailySummary,
            topProducts: topProducts
        });

    } catch (err) {
        console.error('Monthly report error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/reports/top-cashiers
   ----------------------------------------------- */
router.get('/top-cashiers', async function (req, res) {
    try {
        var days = parseInt(req.query.days) || 7;

        var cashiers = await db.query(
            'SELECT u.display_name, u.role, '
            + 'COUNT(o.id) as bill_count, '
            + 'COALESCE(SUM(o.total), 0) as total_sales '
            + 'FROM users u '
            + 'LEFT JOIN orders o ON o.user_id = u.id '
            + 'WHERE o.created_at >= CURRENT_DATE - INTERVAL \'' + days + ' days\' '
            + 'GROUP BY u.id '
            + 'ORDER BY total_sales DESC',
            []
        );

        res.json({ days: days, cashiers: cashiers });

    } catch (err) {
        console.error('Top cashiers error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/reports/hourly
   ----------------------------------------------- */
router.get('/hourly', async function (req, res) {
    try {
        var hourly = await db.query(
            'SELECT EXTRACT(HOUR FROM created_at) as hour, '
            + 'COUNT(*) as bills, '
            + 'COALESCE(SUM(total), 0) as sales '
            + 'FROM orders '
            + 'WHERE created_at::date = CURRENT_DATE '
            + 'GROUP BY hour '
            + 'ORDER BY hour'
        );

        var fullData = [];
        for (var h = 0; h < 24; h++) {
            var found = hourly.find(function (item) {
                return parseInt(item.hour) === h;
            });
            fullData.push({
                hour: h,
                label: String(h).padStart(2, '0') + ':00',
                bills: found ? parseInt(found.bills) : 0,
                sales: found ? parseInt(found.sales) : 0
            });
        }

        res.json(fullData);

    } catch (err) {
        console.error('Hourly report error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

module.exports = router;