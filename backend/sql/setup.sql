

/* -----------------------------------------------
   สร้าง Schema แยกส่วนงาน
   ----------------------------------------------- */
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS pos;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS crm;


/* ================================================
   SCHEMA: auth (ระบบยืนยันตัวตน)
   ================================================ */
CREATE TABLE auth.users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'staff',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);


/* ================================================
   SCHEMA: pos (ระบบขายหน้าร้าน)
   ================================================ */

-- หมวดหมู่สินค้า
CREATE TABLE pos.categories (
    id          SERIAL PRIMARY KEY,
    name_la     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100) NOT NULL,
    icon        VARCHAR(50),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);

-- สินค้า (เค้ก)
CREATE TABLE pos.products (
    id          SERIAL PRIMARY KEY,
    name_key    VARCHAR(50)  NOT NULL,
    name_la     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100) NOT NULL,
    desc_la     VARCHAR(200),
    desc_en     VARCHAR(200),
    icon        VARCHAR(10),
    color       VARCHAR(7),
    category_id INTEGER      REFERENCES pos.categories(id),
    price_m     INTEGER      NOT NULL DEFAULT 0,
    price_l     INTEGER      NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- สูตรสินค้า (วัตถุดิบที่ใช้ต่อ 1 ชิ้น) - เชื่อมข้าม schema กับ inventory
CREATE TABLE pos.product_recipes (
    id            SERIAL PRIMARY KEY,
    product_id    INTEGER NOT NULL REFERENCES pos.products(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES inventory.ingredients(id),
    qty_needed    INTEGER NOT NULL DEFAULT 1,
    UNIQUE(product_id, ingredient_id)
);

-- คำสั่งขาย (หัวบิล) - เชื่อมข้าม schema กับ auth และ crm
CREATE TABLE pos.orders (
    id            SERIAL PRIMARY KEY,
    bill_number   VARCHAR(20)  NOT NULL,
    subtotal      INTEGER      NOT NULL DEFAULT 0,
    discount      INTEGER      NOT NULL DEFAULT 0,
    total         INTEGER      NOT NULL DEFAULT 0,
    received      INTEGER      NOT NULL DEFAULT 0,
    change_amount INTEGER      NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'ເງິນສົດ',
    user_id       INTEGER      REFERENCES auth.users(id),
    member_id     INTEGER      REFERENCES crm.members(id),
    lang          VARCHAR(5)   NOT NULL DEFAULT 'la',
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- รายละเอียดคำสั่งขาย
CREATE TABLE pos.order_items (
    id            SERIAL PRIMARY KEY,
    order_id      INTEGER NOT NULL REFERENCES pos.orders(id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES pos.products(id),
    product_name  VARCHAR(100) NOT NULL,
    size          VARCHAR(5)   NOT NULL,
    price         INTEGER      NOT NULL,
    qty           INTEGER      NOT NULL DEFAULT 1
);


/* ================================================
   SCHEMA: inventory (ระบบคลังวัตถุดิบ)
   ================================================ */

-- วัตถุดิบดิบ
CREATE TABLE inventory.ingredients (
    id              SERIAL PRIMARY KEY,
    name_la         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100) NOT NULL,
    unit            VARCHAR(20)  NOT NULL DEFAULT 'ກິບ',
    min_stock       INTEGER      NOT NULL DEFAULT 0,
    current_stock   INTEGER      NOT NULL DEFAULT 0,
    cost_per_unit   INTEGER      NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ประวัติเติม/ลดวัตถุดิบ - เชื่อมข้าม schema กับ auth
CREATE TABLE inventory.stock_logs (
    id            SERIAL PRIMARY KEY,
    ingredient_id INTEGER NOT NULL REFERENCES inventory.ingredients(id),
    qty           INTEGER NOT NULL,
    type          VARCHAR(20) NOT NULL,
    description   VARCHAR(200),
    user_id       INTEGER REFERENCES auth.users(id),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);


/* ================================================
   SCHEMA: crm (ระบบลูกค้าสัมพันธ์)
   ================================================ */

-- สมาชิก (ลูกค้าประจำ)
CREATE TABLE crm.members (
    id            SERIAL PRIMARY KEY,
    phone         VARCHAR(20)  UNIQUE NOT NULL,
    display_name  VARCHAR(100),
    total_points  INTEGER      NOT NULL DEFAULT 0,
    total_spent  INTEGER      NOT NULL DEFAULT 0,
    visit_count   INTEGER      NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ประวัติแต้มสมาชิก - เชื่อมข้าม schema กับ pos
CREATE TABLE crm.member_points (
    id            SERIAL PRIMARY KEY,
    member_id     INTEGER NOT NULL REFERENCES crm.members(id) ON DELETE CASCADE,
    order_id      INTEGER REFERENCES pos.orders(id),
    points        INTEGER NOT NULL,
    type          VARCHAR(20) NOT NULL DEFAULT 'earn',
    description   VARCHAR(200),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);


/* ================================================
   ข้อมูลเริ่มต้น
   ================================================ */

-- ผู้ใช้ระบบ 
-- (รหัสผ่านเหล่านี้จะถูกสร้างใหม่ด้วย bcrypt ในขั้นตอนถัดไป)
INSERT INTO auth.users (username, password_hash, display_name, role) VALUES
('admin', 'PLACEHOLDER_HASH', 'ຜູ້ບໍລິຫານ', 'admin'),
('staff', 'PLACEHOLDER_HASH', 'ພະນັກງານ', 'staff');

-- หมวดหมู่
INSERT INTO pos.categories (name_la, name_en, icon, sort_order) VALUES
('ທັງໝົດ',     'All',         'fa-th-large',      0),
('ຄລາສສິກ',   'Classic',     'fa-cake-candles',  1),
('ໂກໂກແລັດ',   'Chocolate',   'fa-cookie-bite',  2),
('ຊີສ',        'Cheese',      'fa-cheese',       3),
('ໄທຍໂບຮານ',   'Traditional', 'fa-star',         4);

-- สินค้า
INSERT INTO pos.products (name_key, name_la, name_en, desc_la, desc_en, icon, color, category_id, price_m, price_l) VALUES
('prodOriginalName',  'ເຄື່ອງຮູບເດີມ',       'Original Cake',       'ສູດເດີມ ນຸ່ມລະມຸນ',          'Classic homemade, soft & moist',          '🍰', '#f5d6a8', 2, 69000, 129000),
('prodDblChocName',  'ເຄື່ອງໂກໂກແລັດຄູ່', 'Double Chocolate',     'ໂກໂກແລັດເຂັ້ມຂຶ້ນ 2 ຊັ້ນ',   'Rich dark chocolate, 2 layers',           '🍫', '#5c3317', 3, 75000, 139000),
('prodLavaName',     'ເຄື່ອງລາວາຊີສ',    'Lava Cheese Cake',     'ຊີສລະລາຍໃນ ອະລົມຊູ້ມ',   'Molten cheese inside, savory & rich',     '🧀', '#f0c75e', 4, 79000, 145000),
('prodPandanName',   'ເຄື່ອງໃບຕອຍ',       'Pandan Cake',          'ໃບຕອຍແທ້ ສົດຊຸ່ມ',          'Real pandan aroma, fresh & fragrant',     '🌿', '#7ab648', 2, 72000, 135000),
('prodPurpleName',  'ເຄື່ອງມັນເທດເຜົາ',   'Purple Sweet Potato',   'ມັນເທດເຜົານຸ່ມ ສີມ່ວງສວຍ', 'Roasted sweet potato, beautiful purple',   '🍠', '#9b59b6', 2, 72000, 135000),
('prodFoiThongName','ເຄື່ອງຝອຍທອງ',     'Foi Thong Cake',        'ຝອຍທອງລາວ ຫອມກະທັງ',   'Lao golden threads, wok-aroma',           '✨', '#f39c12', 4, 75000, 139000);

-- วัตถุดิบดิบ
INSERT INTO inventory.ingredients (name_la, name_en, unit, min_stock, current_stock, cost_per_unit) VALUES
('ແປ້ງສາລີ',  'All-purpose flour', 'ກິບ',  5000, 10000, 3500),
('ນ້ຳຕາລ',    'Sugar',             'ກິບ',  3000,  8000, 3000),
('ໄຂ່',        'Eggs',              'ໄຂ່',   100,   300, 6000),
('ເນີຍ້າມັນ',  'Butter',            'ກິບ',  2000,  5000, 8000),
('ໂກໂກແລັດ',  'Chocolate',         'ກິບ',  1000,  3000, 12000),
('ຊີສ',       'Cheese',            'ກິບ',  1000,  2000, 15000),
('ນົມກົບ',    'Condensed milk',     'ກັບ',   200,   500, 10000),
('ໃບຕອຍ',     'Pandan leaves',      'ຊີ້ນ',   50,   100, 2000),
('ມັນເທດ',    'Sweet potato',      'ກິບ',  3000,  5000, 2000),
('ກະທັງ',     'Egg yolk threads',  'ກິບ',   500,  1000, 25000);