/* ================================================
   Route: Login / Logout
   ================================================ */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

/* -----------------------------------------------
   POST /api/auth/login
   ----------------------------------------------- */
router.post('/login', async function (req, res) {
    try {
        var username = req.body.username;
        var password = req.body.password;

        if (!username || !password) {
            return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
        }

        // ค้นหาผู้ใช้
        var user = await db.queryOne(
            'SELECT * FROM users WHERE username = $1 AND is_active = TRUE',
            [username]
        );

        if (!user) {
            return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        // ตรวจรหัสผ่าน
        var isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        // สร้าง JWT Token
        var token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.display_name
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token: token,
            user: {
                id: user.id,
                username: user.username,
                name: user.display_name,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   POST /api/auth/register
   (สำหรับสร้าง user ใหม่ — admin เท่านั้น)
   ----------------------------------------------- */
router.post('/register', async function (req, res) {
    try {
        var username = req.body.username;
        var password = req.body.password;
        var displayName = req.body.display_name;
        var role = req.body.role || 'staff';

        if (!username || !password || !displayName) {
            return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
        }

        // เข้ารหัสผ่าน
        var salt = await bcrypt.genSalt(10);
        var hash = await bcrypt.hash(password, salt);

        var user = await db.insert(
            'INSERT INTO users (username, password_hash, display_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, role, created_at',
            [username, hash, displayName, role]
        );

        res.status(201).json({ message: 'สร้างผู้ใช้สำเร็จ', user: user });

    } catch (err) {
        console.error('Register error:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
        }
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});

/* -----------------------------------------------
   GET /api/auth/me
   (ตรวจสอบ token ว่ายังใช้ได้ไหม)
   ----------------------------------------------- */
function authMiddleware(req, res, next) {
    var header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'ไม่พบ Token' });
    }

    var token = header.split(' ')[1];
    try {
        var decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token หมดอายุ' });
    }
}

router.get('/me', authMiddleware, async function (req, res) {
    res.json({ user: req.user });
});

// ส่งออก middleware ให้ route อื่นใช้ด้วย
module.exports = router;
module.exports.authMiddleware = authMiddleware;