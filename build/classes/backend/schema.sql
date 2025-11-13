PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS dining_tables;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS users;

COMMIT;

PRAGMA foreign_keys = ON;

-- ===== schema ===============================================================
-- users
CREATE TABLE users (
  user_id        INTEGER PRIMARY KEY,
  role           TEXT NOT NULL CHECK (role IN ('customer','staff','admin')) DEFAULT 'customer',
  full_name      TEXT NOT NULL,
  email          TEXT UNIQUE,
  phone          TEXT,
  password_hash  TEXT
);

-- dining tables
CREATE TABLE dining_tables (
  table_id   INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  capacity   INTEGER NOT NULL CHECK (capacity > 0)
);

-- reservations
CREATE TABLE reservations (
  reservation_id INTEGER PRIMARY KEY,
  user_id        INTEGER,
  table_id       INTEGER NOT NULL,
  start_utc      TEXT NOT NULL,
  end_utc        TEXT NOT NULL,
  party_size     INTEGER NOT NULL CHECK (party_size > 0),
  status         TEXT NOT NULL CHECK (status IN ('pending','confirmed','cancelled','no_show')) DEFAULT 'pending',
  notes          TEXT,
  created_utc    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id)  REFERENCES users(user_id)          ON DELETE SET NULL,
  FOREIGN KEY (table_id) REFERENCES dining_tables(table_id) ON DELETE CASCADE
);

CREATE INDEX idx_res_by_table_time ON reservations(table_id, start_utc, end_utc);
CREATE INDEX idx_res_by_user       ON reservations(user_id, start_utc);

-- menu items
CREATE TABLE menu_items (
  item_id INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  price   REAL NOT NULL CHECK (price >= 0),
  active  INTEGER NOT NULL DEFAULT 1
);

-- orders
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  user_id     INTEGER,
  source      TEXT NOT NULL CHECK (source IN ('web','phone','walkin')) DEFAULT 'web',
  status      TEXT NOT NULL CHECK (status IN ('cart','placed','paid','cancelled')) DEFAULT 'cart',
  subtotal    REAL NOT NULL DEFAULT 0.0,
  tax         REAL NOT NULL DEFAULT 0.0,
  total       REAL NOT NULL DEFAULT 0.0,
  created_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_by_user ON orders(user_id, created_utc);

-- order items
CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id      INTEGER NOT NULL,
  item_id       INTEGER NOT NULL,
  qty           INTEGER NOT NULL CHECK (qty > 0),
  unit_price    REAL NOT NULL CHECK (unit_price >= 0),
  line_total    REAL NOT NULL CHECK (line_total >= 0),
  notes         TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)       ON DELETE CASCADE,
  FOREIGN KEY (item_id)  REFERENCES menu_items(item_id)    ON DELETE RESTRICT
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ===== seed data ============================================================
BEGIN TRANSACTION;

-- USERS (8)  (+ password for admin)
INSERT INTO users (user_id, role, full_name, email, phone, password_hash) VALUES
  (1, 'admin',    'Admin Admin',     'admin@rbos.com',   '555-1001', 'admin123'), -- admin123
  (2, 'staff',    'Jordan Kim',      'jordan@rbos.com',  '555-1002', NULL),
  (3, 'staff',    'Riley Nguyen',    'riley@rbos.com',   '555-1003', NULL),
  (4, 'customer', 'Marcus Giannini', 'marcus@example.com', '555-2001', NULL),
  (5, 'customer', 'Sam Taylor',      'sam@example.com',    '555-2002', NULL),
  (6, 'customer', 'Casey Lee',       'casey@example.com',  '555-2003', NULL),
  (7, 'customer', 'Morgan Diaz',     'morgan@example.com', '555-2004', NULL),
  (8, 'customer', 'Jamie Fox',       'jamie@example.com',  '555-2005', NULL);

-- DINING TABLES (10)
INSERT INTO dining_tables (table_id, name, capacity) VALUES
  (1,  'T1',  2),
  (2,  'T2',  2),
  (3,  'T3',  4),
  (4,  'T4',  4),
  (5,  'T5',  4),
  (6,  'T6',  6),
  (7,  'T7',  6),
  (8,  'T8',  8),
  (9,  'Patio-1', 4),
  (10, 'Patio-2', 6);

-- MENU ITEMS (12)
INSERT INTO menu_items (item_id, name, price, active) VALUES
  (1,  'Margherita Pizza',     12.50, 1),
  (2,  'Pepperoni Pizza',      13.95, 1),
  (3,  'Caesar Salad',          8.75, 1),
  (4,  'House Salad',           7.25, 1),
  (5,  'Spaghetti Bolognese',  14.50, 1),
  (6,  'Grilled Salmon',       19.95, 1),
  (7,  'Ribeye Steak',         26.00, 1),
  (8,  'Garlic Bread',          5.25, 1),
  (9,  'Tomato Soup',           6.50, 1),
  (10, 'Cheesecake',            7.95, 1),
  (11, 'Tiramisu',              7.95, 1),
  (12, 'Iced Tea',              3.50, 1);

-- RESERVATIONS (10)
INSERT INTO reservations
  (reservation_id, user_id, table_id, start_utc, end_utc, party_size, status, notes, created_utc)
VALUES
  (1, 4, 3,  strftime('%Y-%m-%dT%H:%M:%SZ','now','+1 day','start of day','+18 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+1 day','start of day','+20 hours'),
            3, 'confirmed', 'Window preferred',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (2, 5, 5,  strftime('%Y-%m-%dT%H:%M:%SZ','now','+2 days','start of day','+19 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+2 days','start of day','+21 hours'),
            4, 'pending',   'Birthday',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (3, 6, 2,  strftime('%Y-%m-%dT%H:%M:%SZ','now','+3 days','start of day','+18 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+3 days','start of day','+19 hours','+30 minutes'),
            2, 'confirmed', '',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (4, 7, 7,  strftime('%Y-%m-%dT%H:%M:%SZ','now','+4 days','start of day','+18 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+4 days','start of day','+20 hours'),
            5, 'pending',   'High chair',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (5, 8, 1,  strftime('%Y-%m-%dT%H:%M:%SZ','now','-2 days','start of day','+18 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','-2 days','start of day','+19 hours'),
            2, 'no_show',   '',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (6, 5, 9,  strftime('%Y-%m-%dT%H:%M:%SZ','now','+1 day','start of day','+17 hours','+30 minutes'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+1 day','start of day','+19 hours'),
            4, 'confirmed', 'Patio if weather ok',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (7, 6, 4,  strftime('%Y-%m-%dT%H:%M:%SZ','now','+5 days','start of day','+18 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+5 days','start of day','+19 hours','+15 minutes'),
            4, 'pending',   '',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (8, 4, 10, strftime('%Y-%m-%dT%H:%M:%SZ','now','+6 days','start of day','+19 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+6 days','start of day','+21 hours'),
            6, 'pending',   'Anniversary',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (9, 7, 6,  strftime('%Y-%m-%dT%H:%M:%SZ','now','-3 days','start of day','+18 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','-3 days','start of day','+20 hours'),
            5, 'cancelled', 'Cancelled morning of',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (10,5, 8,  strftime('%Y-%m-%dT%H:%M:%SZ','now','+7 days','start of day','+18 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+7 days','start of day','+20 hours'),
            6, 'confirmed', '',
            strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- ORDERS (8)
INSERT INTO orders
  (order_id, user_id, source, status, subtotal, tax, total, created_utc)
VALUES
  (1, 4, 'web',    'paid',     25.00,  2.06, 27.06, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days')),
  (2, 5, 'walkin', 'paid',     32.45,  2.68, 35.13, strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days')),
  (3, 6, 'web',    'placed',   19.95,  1.65, 21.60, strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')),
  (4, 7, 'phone',  'paid',     54.45,  4.49, 58.94, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (5, 8, 'web',    'cancelled',13.95,  1.15, 15.10, strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 days')),
  (6, 4, 'walkin', 'paid',     21.70,  1.79, 23.49, strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')),
  (7, 5, 'web',    'paid',     26.45,  2.18, 28.63, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  (8, 6, 'web',    'cart',      7.95,  0.66,  8.61, strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- ORDER ITEMS (16)
INSERT INTO order_items (order_item_id, order_id, item_id, qty, unit_price, line_total, notes) VALUES
  (1, 1, 1, 2, 12.50, 25.00, '');

INSERT INTO order_items VALUES
  (2, 2, 2, 2, 13.95, 27.90, ''),
  (3, 2,12, 1,  3.50,  3.50, ''),
  (4, 2, 8, 1,  1.05,  1.05, 'promo garlic bread');

INSERT INTO order_items VALUES
  (5, 3, 6, 1, 19.95, 19.95, '');

INSERT INTO order_items VALUES
  (6, 4, 7, 2, 26.00, 52.00, ''),
  (7, 4,12, 1,  2.45,  2.45, 'happy hour tea');

INSERT INTO order_items VALUES
  (8, 5, 2, 1, 13.95, 13.95, '');

INSERT INTO order_items VALUES
  (9,  6, 3, 1,  8.75,  8.75, ''),
  (10, 6,10, 1,  7.95,  7.95, ''),
  (11, 6,12, 1,  5.00,  5.00, 'large iced tea');

INSERT INTO order_items VALUES
  (12, 7, 5, 1, 14.50, 14.50, ''),
  (13, 7, 9, 1,  6.50,  6.50, ''),
  (14, 7,12, 1,  5.45,  5.45, 'flavored tea');

INSERT INTO order_items VALUES
  (15, 8,11, 1,  7.95,  7.95, ''),
  (16, 8,12, 1,  0.00,  0.00, 'free drink coupon');

--inventory
CREATE TABLE inventory (
  inventory_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,                
  category TEXT,
  unit TEXT NOT NULL CHECK (unit IN 'each', 'lb','oz','case','bag'),                
  packSize INTEGER,          
  qtyOnHand INTEGER,
  parLevel INTEGER,            
  reorderPoinT INTEGER,        
  cost REAL NOT NULL CHECK (unit_price >= 0),            
  location TEXT,          
  active BOOLEAN DEFAULT 1,
  vendor TEXT,              
  leadTimeDays INTEGER,
  preferredOrderQty INTEGER,
  wasteQty INTEGER,            
  lastCountedAt INTEGER,    
  countFreq INTEGER,        
  lot TEXT,                
  expiryDate TEXT,        
  allergen TEXT NOT NULL CHECK (allergen IN ('none', 'gluten', 'dairy', 'eggs', 'soy', 'peanuts', 'tree-nuts', 'shellfish', 'fish', 'sesame')),          
  conversion TEXT          
);



COMMIT;
