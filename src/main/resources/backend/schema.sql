PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS dining_tables;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS inventory;
COMMIT;

PRAGMA foreign_keys = ON;

-- ===== schema ===============================================================
-- users
CREATE TABLE users (
  user_id        TEXT PRIMARY KEY,
  role           TEXT NOT NULL CHECK (role IN ('customer','staff','admin')) DEFAULT 'customer',
  full_name      TEXT NOT NULL,
  email          TEXT UNIQUE,
  phone          TEXT,
  password_hash  TEXT
);

-- dining tables
CREATE TABLE dining_tables (
  table_id   TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  capacity   INTEGER NOT NULL CHECK (capacity > 0)
);

-- reservations
CREATE TABLE reservations (
  reservation_id TEXT PRIMARY KEY,
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
  item_id        TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL,
  price          REAL NOT NULL CHECK (price >= 0),
  active         INTEGER NOT NULL DEFAULT 1,
  image_url      TEXT,
  dietary_tags   TEXT
);

-- inventory
CREATE TABLE inventory (
  inventory_id        TEXT PRIMARY KEY,
  item_id             TEXT NOT NULL,
  name                TEXT NOT NULL,
  sku                 TEXT UNIQUE NOT NULL,
  category            TEXT NOT NULL,
  unit                TEXT NOT NULL CHECK (unit IN ('each','lb','oz','cases','bag')),
  pack_size           INTEGER NOT NULL DEFAULT 1,
  qty_on_hand         INTEGER NOT NULL DEFAULT 0,
  par_level           INTEGER NOT NULL DEFAULT 0,
  reorder_point       INTEGER NOT NULL DEFAULT 0,
  cost                DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  location            TEXT,
  active              INTEGER NOT NULL DEFAULT 1,
  vendor              TEXT,
  lead_time_days      INTEGER DEFAULT 0,
  preferred_order_qty INTEGER DEFAULT 0,
  waste_qty           INTEGER DEFAULT 0,
  last_counted_at     TEXT,
  count_freq          TEXT CHECK (count_freq IN ('daily','weekly','monthly')),
  lot                 TEXT,
  expiry_date         TEXT,
  allergen            TEXT CHECK (allergen IN ('none','gluten','dairy','eggs','soy','peanuts','tree-nuts','shellfish','fish','sesame')),
  conversion          TEXT,
  created_utc         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE CASCADE
);

-- orders
CREATE TABLE orders (
  order_id    TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('web','phone','walkin')) DEFAULT 'web',
  status      TEXT NOT NULL CHECK (status IN ('cart','placed','paid','cancelled')) DEFAULT 'cart',
  subtotal    REAL NOT NULL DEFAULT 0.0,
  tax         REAL NOT NULL DEFAULT 0.0,
  total       REAL NOT NULL DEFAULT 0.0,
  created_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_by_user ON orders(user_id, created_utc);

--inventory
CREATE TABLE inventory (
  inventory_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,                 
  category TEXT,
  unit TEXT NOT NULL CHECK (unit IN ('each', 'lb','oz','case','bag')),                 
  packSize INTEGER,           
  qtyOnHand INTEGER,
  parLevel INTEGER,            
  reorderPoint INTEGER,        
  cost REAL NOT NULL CHECK (cost >= 0),             
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

CREATE INDEX idx_inventory_name ON inventory(name);

-- order items
CREATE TABLE order_items (
  order_item_id TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL,
  item_id       TEXT NOT NULL,
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

-- USERS (8)
INSERT INTO users (user_id, role, full_name, email, phone, password_hash) VALUES
  ('1', 'admin',    'Admin Admin',     'admin@rbos.com',   '555-1001', 'admin123'),
  ('2', 'staff',    'Jordan Kim',      'jordan@rbos.com',  '555-1002', NULL),
  ('3', 'staff',    'Riley Nguyen',    'riley@rbos.com',   '555-1003', NULL),
  ('4', 'customer', 'Marcus Giannini', 'marcus@example.com', '555-2001', NULL),
  ('5', 'customer', 'Sam Taylor',      'sam@example.com',    '555-2002', NULL),
  ('6', 'customer', 'Casey Lee',       'casey@example.com',  '555-2003', NULL),
  ('7', 'customer', 'Morgan Diaz',     'morgan@example.com', '555-2004', NULL),
  ('8', 'customer', 'Jamie Fox',       'jamie@example.com',  '555-2005', NULL);

  INSERT INTO inventory (inventory_id, name, sku, category, unit, packSize, qtyOnHand, parLevel, reorderPoinT, cost, location, active, vendor, leadTimeDays, preferredOrderQty, wasteQty, lastCountedAt, countFreq, lot, expiryDate, allergen, conversion) VALUES
  (1, 'Tomatoes', 'SKU001', 'Produce', 'lb', 10, 50, 20, 15, 1.50, 'Refrigerator', 1, 'Fresh Farms', 2, 20, 0, 20240401, 7, 'LOT123', '2024-06-01', 'none', '1 lb = 16 oz'),
  (2, 'Mozzarella Cheese', 'SKU002', 'Dairy', 'lb', 5, 30, 10, 8, 3.00, 'Refrigerator', 1, 'Dairy Best', 3, 10, 0, 20240401, 14, 'LOT456', '2024-05-15', 'dairy', '1 lb = 16 oz'),
  (3, 'Basil Leaves', 'SKU003', 'Herbs', 'oz', 16, 100, 40, 30, 0.75, 'Refrigerator', 1, 'Herb World', 1, 50, 0, 20240401, 7, 'LOT789', '2024-04-30', 'none', '1 oz = 28.35 g');

-- DINING TABLES (10)
INSERT INTO dining_tables (table_id, name, capacity) VALUES
  ('1',  'T1',  2),
  ('2',  'T2',  2),
  ('3',  'T3',  4),
  ('4',  'T4',  4),
  ('5',  'T5',  4),
  ('6',  'T6',  6),
  ('7',  'T7',  6),
  ('8',  'T8',  8),
  ('9',  'Patio-1', 4),
  ('10', 'Patio-2', 6);

-- MENU ITEMS (12) - COMPREHENSIVE DATA
INSERT INTO menu_items (item_id, name, description, category, price, active, image_url, dietary_tags) VALUES
  ('1',  'Margherita Pizza',     'Fresh tomatoes, mozzarella, and basil on our classic crust', 'Pizza', 12.50, 1, 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?q=80&w=1200&auto=format&fit=crop', '["veg"]'),
  ('2',  'Pepperoni Pizza',      'Pepperoni with mozzarella cheese on classic crust', 'Pizza', 13.95, 1, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=1200&auto=format&fit=crop', '[]'),
  ('3',  'Caesar Salad',         'Crisp romaine lettuce with Caesar dressing, croutons, and parmesan', 'Salad', 8.75, 1, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=1200&auto=format&fit=crop', '["dairy"]'),
  ('4',  'House Salad',          'Mixed greens with seasonal vegetables and house vinaigrette', 'Salad', 7.25, 1, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=1200&auto=format&fit=crop', '["veg", "vegan"]'),
  ('5',  'Spaghetti Bolognese',  'Classic spaghetti with rich meat sauce and parmesan', 'Pasta', 14.50, 1, 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?q=80&w=1200&auto=format&fit=crop', '[]'),
  ('6',  'Grilled Salmon',       'Fresh salmon fillet with lemon butter and seasonal vegetables', 'Main', 19.95, 1, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1200&auto=format&fit=crop', '["gf"]'),
  ('7',  'Ribeye Steak',         '12oz ribeye with garlic butter and roasted potatoes', 'Main', 26.00, 1, 'https://images.unsplash.com/photo-1607116667981-0ed7e6d2f2eb?q=80&w=1200&auto=format&fit=crop', '["gf"]'),
  ('8',  'Garlic Bread',         'Toasted bread with garlic butter and herbs', 'Side', 5.25, 1, 'https://images.unsplash.com/photo-1573140247635-a0de5a165d5a?q=80&w=1200&auto=format&fit=crop', '["veg"]'),
  ('9',  'Tomato Soup',          'Creamy tomato soup with fresh basil', 'Side', 6.50, 1, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=1200&auto=format&fit=crop', '["veg"]'),
  ('10', 'Cheesecake',           'New York style cheesecake with berry compote', 'Dessert', 7.95, 1, 'https://images.unsplash.com/photo-1567327613485-5ac32fe78f88?q=80&w=1200&auto=format&fit=crop', '["veg"]'),
  ('11', 'Tiramisu',             'Classic Italian tiramisu with coffee and mascarpone', 'Dessert', 7.95, 1, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=1200&auto=format&fit=crop', '[]'),
  ('12', 'Iced Tea',             'Freshly brewed iced tea with lemon', 'Beverage', 3.50, 1, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=1200&auto=format&fit=crop', '["veg", "vegan", "gf"]');

-- INVENTORY
INSERT INTO inventory (
  item_id, name, sku, category, unit, pack_size, qty_on_hand, par_level, reorder_point,
  cost, location, vendor, lead_time_days, count_freq, allergen
) VALUES
  ('1', 'Margherita Pizza Kit', 'PIZ-MAR-001', 'Pizza', 'cases', 1, 50, 20, 10, 4.50, 'Cold Storage A1', 'Sysco', 3, 'weekly', 'dairy'),
  ('2', 'Pepperoni Pizza Kit', 'PIZ-PEP-001', 'Pizza', 'cases', 1, 45, 25, 12, 5.25, 'Cold Storage A2', 'US Foods', 2, 'weekly', 'none'),
  ('3', 'Caesar Salad Kit', 'SAL-CAE-001', 'Salad', 'cases', 1, 30, 15, 8, 3.75, 'Produce Section', 'Fresh Farms', 1, 'daily', 'dairy'),
  ('4', 'House Salad Kit', 'SAL-HOU-001', 'Salad', 'cases', 1, 35, 18, 9, 2.95, 'Produce Section', 'Local Growers', 1, 'daily', 'none'),
  ('5', 'Spaghetti Bolognese Kit', 'PAS-BOL-001', 'Pasta', 'cases', 1, 40, 22, 11, 6.80, 'Dry Storage', 'Italian Imports', 2, 'weekly', 'none'),
  ('6', 'Salmon Fillet', 'FIS-SAL-001', 'Seafood', 'lb', 1, 25, 12, 6, 8.50, 'Seafood Cooler', 'Ocean Fresh', 1, 'daily', 'fish'),
  ('7', 'Ribeye Steak', 'MEA-RIB-001', 'Meat', 'each', 1, 30, 15, 8, 12.00, 'Butcher Cooler', 'Prime Meats', 2, 'daily', 'none'),
  ('8', 'Garlic Bread', 'SID-GAR-001', 'Bakery', 'cases', 12, 100, 40, 20, 0.85, 'Bakery Section', 'Bread Co', 2, 'weekly', 'gluten'),
  ('9', 'Tomato Soup Base', 'SID-TOM-001', 'Soup', 'cases', 1, 20, 10, 5, 2.25, 'Dry Storage', 'Soup Supply', 3, 'weekly', 'none'),
  ('10', 'Cheesecake', 'DES-CHE-001', 'Dessert', 'each', 1, 15, 8, 4, 2.50, 'Dessert Cooler', 'Sweet Creations', 2, 'weekly', 'dairy'),
  ('11', 'Tiramisu', 'DES-TIR-001', 'Dessert', 'each', 1, 12, 6, 3, 2.75, 'Dessert Cooler', 'Italian Desserts', 2, 'weekly', 'dairy'),
  ('12', 'Iced Tea Mix', 'BEV-TEA-001', 'Beverage', 'cases', 1, 50, 25, 12, 0.75, 'Dry Storage', 'Beverage Co', 3, 'monthly', 'none');

-- RESERVATIONS (10)
INSERT INTO reservations
  (reservation_id, user_id, table_id, start_utc, end_utc, party_size, status, notes, created_utc)
VALUES
  ('1', '4', '3',  strftime('%Y-%m-%dT%H:%M:%SZ','now','+1 day','start of day','+18 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+1 day','start of day','+20 hours'),
            3, 'confirmed', 'Window preferred',
            strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('2', '5', '5',  strftime('%Y-%m-%dT%H:%M:%SZ','now','+2 days','start of day','+19 hours'),
            strftime('%Y-%m-%dT%H:%M:%SZ','now','+2 days','start of day','+21 hours'),
            4, 'pending',   'Birthday',
            strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- ORDERS (8)
INSERT INTO orders
  (order_id, user_id, source, status, subtotal, tax, total, created_utc)
VALUES
  ('1', '4', 'web',    'paid',     25.00,  2.06, 27.06, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days')),
  ('2', '5', 'walkin', 'paid',     32.45,  2.68, 35.13, strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days')),
  ('3', '6', 'web',    'placed',   19.95,  1.65, 21.60, strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'));

-- ORDER ITEMS (16)
INSERT INTO order_items (order_item_id, order_id, item_id, qty, unit_price, line_total, notes) VALUES
  ('1', '1', '1', 2, 12.50, 25.00, ''),
  ('2', '2', '2', 2, 13.95, 27.90, ''),
  ('3', '2', '12', 1,  3.50,  3.50, ''),
  ('4', '2', '8', 1,  1.05,  1.05, 'promo garlic bread'),
  ('5', '3', '6', 1, 19.95, 19.95, '');

COMMIT;