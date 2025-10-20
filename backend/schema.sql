PRAGMA foreign_keys = ON;

-- user table
CREATE TABLE users (
  user_id    INTEGER PRIMARY KEY,
  role       TEXT NOT NULL CHECK (role IN ('customer','staff','admin')) DEFAULT 'customer',
  full_name  TEXT NOT NULL,
  email      TEXT UNIQUE,
  phone      TEXT
);

-- dining tables table
CREATE TABLE dining_tables (
  table_id   INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,         
  capacity   INTEGER NOT NULL CHECK (capacity > 0)
);

-- res table
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
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (table_id) REFERENCES dining_tables(table_id) ON DELETE CASCADE
);

CREATE INDEX idx_res_by_table_time ON reservations(table_id, start_utc, end_utc);
CREATE INDEX idx_res_by_user       ON reservations(user_id, start_utc);

-- menu table
CREATE TABLE menu_items (
  item_id    INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  price      REAL NOT NULL CHECK (price >= 0),
  active     INTEGER NOT NULL DEFAULT 1
);

-- order table
CREATE TABLE orders (
  order_id   INTEGER PRIMARY KEY,
  user_id    INTEGER,                     
  source     TEXT NOT NULL CHECK (source IN ('web','phone','walkin')) DEFAULT 'web',
  status     TEXT NOT NULL CHECK (status IN ('cart','placed','paid','cancelled')) DEFAULT 'cart',
  subtotal   REAL NOT NULL DEFAULT 0.0,
  tax        REAL NOT NULL DEFAULT 0.0,
  total      REAL NOT NULL DEFAULT 0.0,
  created_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_by_user ON orders(user_id, created_utc);

-- item table
CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id      INTEGER NOT NULL,
  item_id       INTEGER NOT NULL,
  qty           INTEGER NOT NULL CHECK (qty > 0),
  unit_price    REAL NOT NULL CHECK (unit_price >= 0),
  line_total    REAL NOT NULL CHECK (line_total >= 0),
  notes         TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE RESTRICT
);

CREATE INDEX idx_order_items_order ON order_items(order_id);