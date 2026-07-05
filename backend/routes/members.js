/* ================================================
   Route: สมาชิก / สะสมแต้ม
   ================================================ */
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.use(authMiddleware);

/* -----------------------------------------------
   GET /api/members
   ดึงสมาชิกทั้งหมด หรือค้นหาด้วยเบอรโทรศัพท์
   ----------------------------------------------- */
router.get('/', async function (req, res) {
    try {
        var phone = req.query.phone;
        var sql = 'SELECT * FROM members WHERE is_active = TRUE ORDER BY total_spent DESC';
        var params = [];

        if (phone) {
            sql = 'SELECT * FROM members WHERE phone LIKE $1 AND is_active = TRUE';
            params.push('%' + phone + '%');
        }

        var members = await db.query(sql, params);
        res.json(members);

    } catch (err) {
        console.error('Get members error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/members/:id
   ดึงข้อมูลสมาชิกคนเดียว + ประวัติแต้ม
   ----------------------------------------------- */
router.get('/:id', async function (req, res) {
    try {
        var memberId = req.params.id;

        var member = await db.queryOne(
            'SELECT * FROM members WHERE id = $1 AND is_active = TRUE',
            [memberId]
        );

        if (!member) {
            return res.status(404).json({ error: 'ไม่พบสมาชิกนี้' });
        }

        // ประวัติแต้ม 10 รายการล่าสุด
        var points = await db.query(
            'SELECT * FROM member_points WHERE member_id = $1 ORDER BY created_at DESC LIMIT 10',
            [memberId]
        );

        // ประวัติการซื้อ 10 รายการล่าสุด
        var recentOrders = await db.query(
            'SELECT id, bill_number, total, created_at '
            + 'FROM orders WHERE member_id = $1 '
            + 'ORDER BY created_at DESC LIMIT 10',
            [memberId]
        );

        res.json({
            member: member,
            points: points,
            recentOrders: recentOrders
        });

    } catch (err) {
        console.error('Get member error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   POST /api/members
   สร้างสมาชิกใหม่
   ----------------------------------------------- */
router.post('/', async function (req, res) {
    try {
        var phone = req.body.phone;
        var displayName = req.body.display_name || '';

        if (!phone) {
            return res.status(400).json({ error: 'กรุณากรอกเบอรโทรศัพท์' });
        }

        // เช็กว่ามีอยู่แล้วไหม
        var existing = await db.queryOne(
            'SELECT * FROM members WHERE phone = $1',
            [phone]
        );

        if (existing) {
            return res.status(400).json({
                error: 'เบอรโทรศัพท์นี้ลงทะเบียนแล้ว',
                member: existing
            });
        }

        var member = await db.insert(
            'INSERT INTO members (phone, display_name) VALUES ($1, $2) RETURNING *',
            [phone, displayName]
        );

        res.status(201).json({
            message: 'สร้างสมาชิกสำเร็จ',
            member: member
        });

    } catch (err) {
        console.error('Create member error:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'เบอรโทรศัพท์นี้ลงทะเบียนแล้ว' });
        }
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   POST /api/members/earn-points
   เพิ่มแต้มให้สมาชิก (เรียกจากการขาย)
   ----------------------------------------------- */
router.post('/earn-points', async function (req, res) {
    try {
        var memberId = req.body.member_id;
        var orderId = req.body.order_id;
        var totalSpent = parseInt(req.body.total_spent) || 0;
        var pointsPer100 = 1; // ทุกๆ 100 กีบ ได้ 1 แต้ม

        if (!memberId || totalSpent <= 0) {
            return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
        }

        var points = Math.floor(totalSpent / 100);

        if (points <= 0) {
            return res.status(400).json({ error: 'ยอดขายไม่ถึงขั้นที่ได้แต้ม' });
        }

        // เพิ่มแต้ม
        await db.insert(
            'INSERT INTO member_points (member_id, order_id, points, type, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [memberId, orderId, points, 'earn', 'ขายสินค้า ได้รับ ' + points + ' แต้ม']
        );

        // อัปเดตข้อมูลสมาชิก
        var updated = await db.queryOne(
            'UPDATE members SET '
            + 'total_points = total_points + $1, '
            + 'total_spent = total_spent + $2, '
            + 'visit_count = visit_count + 1 '
            + 'WHERE id = $3 RETURNING *',
            [points, totalSpent, memberId]
        );

        // อัปเดตบิลว่ามี member_id
        if (orderId) {
            await db.query('UPDATE orders SET member_id = $1 WHERE id = $2', [memberId, orderId]);
        }

        res.json({
            message: 'ได้รับ ' + points + ' แต้ม',
            points: points,
            totalPoints: updated.total_points
        });

    } catch (err) {
        console.error('Earn points error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   POST /api/members/redeem-points
   แลกแต้ม
   ----------------------------------------------- */
router.post('/redeem-points', async function (req, res) {
    try {
        var memberId = req.body.member_id;
        var points = parseInt(req.body.points) || 0;

        if (!memberId || points <= 0) {
            return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
        }

        // ดึงข้อมูลสมาชิก
        var member = await db.queryOne(
            'SELECT * FROM members WHERE id = $1 AND is_active = TRUE',
            [memberId]
        );

        if (!member) {
            return res.status(404).json({ error: 'ไม่พบสมาชิก' });
        }

        if (member.total_points < points) {
            return res.status(400).json({
                error: 'แต้มไม่พอ มี ' + member.total_points + ' แต้ม ต้องการ ' + points
            });
        }

        // ลดแต้ม
        var updated = await db.queryOne(
            'UPDATE members SET total_points = total_points - $1 WHERE id = $2 RETURNING *',
            [points, memberId]
        );

        // บันทึกประวัติ
        await db.insert(
            'INSERT INTO member_points (member_id, points, type, description) VALUES ($1, $2, $3, $4)',
            [memberId, points, 'redeem', 'แลก ' + points + ' แต้ม']
        );

        // คำนวณมูลค่าแต้ม (1 แต้ม = 100 กีบ)
        var redeemValue = points * 100;

        res.json({
            message: 'แลก ' + points + ' แต้ม สำเร็จ',
            redeemValue: redeemValue,
            remainingPoints: updated.total_points
        });

    } catch (err) {
        console.error('Redeem points error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   POST /api/members/lookup
   ค้นหาสมาชิกด้วยเบอรโทรศัพท์ (ใช้ตอนขาย)
   ----------------------------------------------- */
router.post('/lookup', async function (req, res) {
    try {
        var phone = req.body.phone;

        if (!phone) {
            return res.status(400).json({ error: 'กรุณากรอกเบอรโทรศัพท์' });
        }

        var member = await db.queryOne(
            'SELECT id, phone, display_name, total_points, total_spent, visit_count, created_at '
            + 'FROM members WHERE phone = $1 AND is_active = TRUE',
            [phone]
        );

        if (!member) {
            return res.status(404).json({ found: false });
        }

        res.json({ found: true, member: member });

    } catch (err) {
        console.error('Lookup member error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

module.exports = router;