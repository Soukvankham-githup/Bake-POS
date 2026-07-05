/* ================================================
   เชื่อมต่อ PostgreSQL — รองรับ Schema
   ================================================ */
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 9999,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'dol',
    database: process.env.DB_NAME || 'Best_bake',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

pool.on('connect', function () {
    console.log('✅ เชื่อมต่อ PostgreSQL สำเร็จ');
});

pool.on('error', function (err) {
    console.error('❌ ข้อผิดพลาดฐานข้อมูล:', err.message);
});

/* ================================================
   ฟังก์ชัน query — ตั้ง search_path ทุกครั้ง
   ================================================ */
async function query(sql, params) {
    // ตั้ง search_path ให้ schema ทั้งหมดอยู่หน้า
    await pool.query('SET search_path TO pos, auth, inventory, crm, public');
    var result = await pool.query(sql, params);
    return result.rows;
}

async function queryOne(sql, params) {
    await pool.query('SET search_path TO pos, auth, inventory, crm, public');
    var result = await pool.query(sql, params);
    return result.rows[0] || null;
}

async function insert(sql, params) {
    await pool.query('SET search_path TO pos, auth, inventory, crm, public');
    var result = await pool.query(sql, params);
    return result.rows[0];
}

module.exports = {
    pool: pool,
    query: query,
    queryOne: queryOne,
    insert: insert
};