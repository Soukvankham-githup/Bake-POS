/* ================================================
   Seed: สร้างรหัสผ่าน admin123 และ staff123
   รันครั้งเดียวแล้วลบทิ้งได้
   ================================================ */
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
    console.log('กำลังสร้างรหัสผ่าน...');

    var adminHash = await bcrypt.hash('admin123', 10);
    var staffHash = await bcrypt.hash('staff123', 10);

    await db.query(
        "UPDATE users SET password_hash = $1 WHERE username = 'admin'",
        [adminHash]
    );

    await db.query(
        "UPDATE users SET password_hash = $1 WHERE username = 'staff'",
        [staffHash]
    );

    console.log('✅ สร้างรหัสผ่านสำเร็จ');
    console.log('   admin / admin123');
    console.log('   staff / staff123');
    process.exit(0);
}

seed().catch(function (err) {
    console.error('❌ เกิดข้อผิดพลาด:', err);
    process.exit(1);
});