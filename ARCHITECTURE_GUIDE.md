# RBOS Architecture & Technical Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack & Roles](#technology-stack--roles)
3. [Directory Structure](#directory-structure)
4. [Build & Deployment Process](#build--deployment-process)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Database Layer](#database-layer)
8. [Authentication Flow](#authentication-flow)
9. [Key Files Explained](#key-files-explained)
10. [Critical Fixes & Why They Were Needed](#critical-fixes--why-they-were-needed)
11. [Common Development Tasks](#common-development-tasks)

---

## Project Overview

**RBOS (Restaurant Booking & Ordering System)** is a full-stack web application that allows customers to:
- Browse menu items
- Place orders
- Make table reservations
- View order history

And allows staff/admins to:
- Manage menu items and inventory
- Process orders
- Manage reservations
- View reports and analytics

The application uses a **monolithic WAR deployment model** where both frontend and backend are packaged together and deployed to a Java application server.

---

## Technology Stack & Roles

### Backend: GlassFish 7 + Jakarta EE

**What is GlassFish?**
- GlassFish is a **Java application server** (like Tomcat, but with full Jakarta EE support)
- It hosts and runs your Java backend code (Servlets, WebSockets)
- It serves HTTP requests on port `8080`
- Think of it as the "runtime environment" for your Java code

**Role in this project:**
```
User Browser → http://localhost:8080/RBOS/api/menu
                    ↓
              GlassFish Server
                    ↓
              MenuServlet.doGet()
                    ↓
              MenuItemDAO.getActiveItems()
                    ↓
              SQLite Database
```

GlassFish:
1. Receives HTTP requests at `/RBOS/*`
2. Routes API calls (`/RBOS/api/*`) to appropriate Servlets
3. Serves static files (HTML, CSS, JS from the React build)
4. Manages WebSocket connections for real-time updates
5. Handles session management for authentication

**Key Configuration:**
- Deployed as WAR file: `RBOS.war`
- Context root: `/RBOS` (all URLs start with this)
- Admin port: `4848` (for deployment commands)

### Frontend: Vite + React

**What is Vite?**
- Vite is a **build tool** for frontend development
- It provides:
  - Fast development server with hot module replacement (HMR)
  - Production build optimization (minification, bundling)
  - TypeScript compilation
  - CSS preprocessing (Tailwind in our case)

**Role in this project:**

**Development Mode** (`npm run dev`):
```
User Browser → http://localhost:5173/RBOS/
                    ↓
              Vite Dev Server (port 5173)
                    ↓
          Proxies API calls to GlassFish
                    ↓
              http://localhost:8080/RBOS/api/*
```

Vite in development:
1. Serves React code with instant hot reload
2. Compiles TypeScript on-the-fly
3. Processes Tailwind CSS
4. **Proxies API requests** to GlassFish (so frontend can talk to backend)

**Production Mode** (`npm run build`):
```
Vite builds → dist/ folder
    ↓
Contains: index.html, bundled JS, CSS
    ↓
Copied to src/main/webapp/
    ↓
Packaged into RBOS.war
    ↓
Deployed to GlassFish
    ↓
GlassFish serves everything from one server
```

Vite in production:
1. Bundles all React code into optimized JS files
2. Processes and minifies CSS
3. Generates `index.html` with correct script tags
4. Output goes to `frontend/dist/` which is copied into the WAR file

---

## Directory Structure

```
CSCI_472_Group_Project/
│
├── src/main/java/com/RBOS/          # Java backend source code
│   ├── dao/                         # Data Access Objects (CRUD operations)
│   │   ├── UserDAO.java             # User database operations
│   │   ├── MenuItemDAO.java         # Menu item operations
│   │   ├── OrderDAO.java            # Order operations
│   │   └── ReservationDAO.java      # Reservation operations
│   │
│   ├── models/                      # Java POJOs (Plain Old Java Objects)
│   │   ├── User.java                # User entity
│   │   ├── MenuItem.java            # Menu item entity
│   │   ├── Order.java               # Order entity
│   │   └── Reservation.java         # Reservation entity
│   │
│   ├── servlets/                    # REST API endpoints
│   │   ├── AuthServlet.java         # /api/auth/* - login, register, logout
│   │   ├── MenuServlet.java         # /api/menu/* - menu operations
│   │   ├── OrderServlet.java        # /api/orders/* - order operations
│   │   └── ReservationServlet.java  # /api/reservations/* - booking operations
│   │
│   ├── websocket/                   # Real-time communication
│   │   └── WebSocketConfig.java     # WebSocket server for live updates
│   │
│   ├── services/                    # Business logic services
│   │   ├── EmailService.java        # Email notifications
│   │   └── EmailTemplates.java      # Email content templates
│   │
│   └── utils/                       # Utility classes
│       └── DatabaseConnection.java  # SQLite connection management
│
├── src/main/resources/backend/
│   ├── schema.sql                   # Database schema + seed data
│   └── restaurant.db                # SQLite seed database (generated)
│
├── src/main/webapp/                 # WAR deployment root
│   ├── index.html                   # React app entry (from Vite build)
│   ├── assets/                      # Bundled JS/CSS (from Vite build)
│   └── WEB-INF/
│       ├── web.xml                  # Servlet deployment descriptor
│       └── lib/                     # Java dependencies (JARs)
│
├── frontend/                        # React application source
│   ├── src/
│   │   ├── main.tsx                 # React app entry point
│   │   ├── App.tsx                  # Root component
│   │   │
│   │   ├── api/
│   │   │   └── client.ts            # **SINGLE SOURCE OF TRUTH** for all API calls
│   │   │
│   │   ├── features/                # Feature-based modules
│   │   │   ├── auth/
│   │   │   │   ├── AuthContext.tsx  # Authentication state management
│   │   │   │   ├── LoginPage.tsx    # Customer login UI
│   │   │   │   └── api.ts           # Auth-specific API helpers
│   │   │   │
│   │   │   ├── cart/
│   │   │   │   └── CartContext.tsx  # Shopping cart state
│   │   │   │
│   │   │   └── notifications/
│   │   │       └── NotificationContext.tsx  # Toast notifications
│   │   │
│   │   ├── pages/                   # Route components
│   │   │   ├── HomePage.tsx
│   │   │   ├── CustomerMenu.tsx     # Menu browsing + add to cart
│   │   │   ├── CustomerDashboard.tsx # Customer profile & history
│   │   │   ├── CartPage.tsx         # Shopping cart
│   │   │   ├── ReservationsPage.tsx # Table booking
│   │   │   ├── AdminLogin.tsx       # Admin/staff login
│   │   │   └── Admin/               # Admin panel pages
│   │   │       ├── Dashboard.tsx
│   │   │       ├── Orders.tsx
│   │   │       ├── Menu.tsx
│   │   │       └── ...
│   │   │
│   │   ├── components/              # Reusable UI components
│   │   │   ├── NavBar.tsx           # Navigation with cart icon
│   │   │   ├── NotificationBell.tsx # Notification dropdown
│   │   │   └── UserMenu.tsx         # User profile menu
│   │   │
│   │   └── hooks/
│   │       └── useWebSocket.ts      # WebSocket connection hook
│   │
│   ├── vite.config.ts               # Vite configuration
│   ├── package.json                 # npm dependencies
│   └── tailwind.config.js           # Tailwind CSS config
│
├── build.xml                        # Apache Ant build script
├── RebuildDB.java                   # Utility to regenerate seed database
└── .github/copilot-instructions.md  # AI coding agent instructions
```

---

## Build & Deployment Process

### Full Build Command: `ant clean package-war deploy`

This runs multiple targets in sequence:

#### Step 1: `clean`
```bash
# Deletes build/ and dist/ directories
rm -rf build/ dist/
```

#### Step 2: `build-frontend`
```bash
cd frontend
npm install          # Install dependencies
npm run build        # Vite builds React app
# Output: frontend/dist/
```

**What happens during `npm run build`:**
1. TypeScript compiler (`tsc -b`) compiles `.tsx` → `.js`
2. Vite bundles all React components into optimized chunks
3. Tailwind CSS is processed and minified
4. Images/assets are optimized
5. Output: `frontend/dist/index.html` + `frontend/dist/assets/*.js` + `frontend/dist/assets/*.css`

#### Step 3: Copy frontend to webapp
```xml
<copy todir="src/main/webapp">
  <fileset dir="frontend/dist"/>
</copy>
```
Copies the Vite build output into the WAR deployment directory.

#### Step 4: `compile`
```bash
javac -cp "lib/*" src/main/java/com/RBOS/**/*.java -d build/classes/
```
Compiles all Java source files to bytecode (`.class` files).

#### Step 5: `package-war`
```bash
# Creates RBOS.war containing:
# - WEB-INF/classes/ (compiled Java)
# - WEB-INF/lib/ (JARs)
# - index.html + assets/ (React app)
```

**WAR structure:**
```
RBOS.war
├── index.html                    # React app entry
├── assets/
│   ├── index-Ca1yGlte.js        # Bundled React code
│   └── index-BFNhDP1O.css       # Bundled styles
└── WEB-INF/
    ├── web.xml                   # Servlet config
    ├── classes/                  # Compiled Java
    │   └── com/RBOS/...
    └── lib/                      # Dependencies
        ├── sqlite-jdbc-3.50.3.0.jar
        ├── jackson-databind.jar
        └── ...
```

#### Step 6: `deploy`
```bash
asadmin deploy --force RBOS.war
```
Deploys to GlassFish, which:
1. Unpacks the WAR to `glassfish7/glassfish/domains/domain1/applications/RBOS/`
2. Starts all Servlets (scans for `@WebServlet` annotations)
3. Initializes database connection
4. Makes app available at `http://localhost:8080/RBOS/`

---

## Backend Architecture

### Servlet-Based REST API

**Pattern:** All API endpoints follow this structure:
```
@WebServlet("/api/resource/*")
```

**Example: MenuServlet.java**

```java
@WebServlet("/api/menu/*")
public class MenuServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws IOException {
        
        String path = getPathInfo(req); // e.g., "/active" from "/api/menu/active"
        
        if ("/active".equals(path)) {
            // Get active menu items
            MenuItemDAO dao = new MenuItemDAO(getServletContext());
            List<MenuItem> items = dao.getActiveMenuItems();
            
            // Respond with JSON
            resp.setContentType("application/json");
            ObjectMapper mapper = new ObjectMapper();
            mapper.writeValue(resp.getWriter(), items);
            return;
        }
        
        if ("/with-inventory".equals(path)) {
            // Get menu with inventory data
            MenuItemDAO dao = new MenuItemDAO(getServletContext());
            List<MenuItemWithInventory> items = dao.getMenuWithInventory();
            
            resp.setContentType("application/json");
            new ObjectMapper().writeValue(resp.getWriter(), items);
            return;
        }
        
        resp.setStatus(404);
    }
}
```

**How a request flows:**

1. **Browser sends**: `GET http://localhost:8080/RBOS/api/menu/active`

2. **GlassFish receives**: 
   - Context: `/RBOS`
   - Servlet path: `/api/menu`
   - Path info: `/active`

3. **GlassFish routes** to `MenuServlet` (because of `@WebServlet("/api/menu/*")`)

4. **MenuServlet.doGet()** is called:
   - Extracts path: `/active`
   - Calls DAO: `dao.getActiveMenuItems()`
   - Serializes to JSON
   - Writes response

5. **Browser receives**: JSON array of menu items

### Data Access Object (DAO) Pattern

**Purpose:** Separate database logic from servlet logic.

**Example: UserDAO.java**

```java
public class UserDAO {
    private ServletContext context;
    
    public UserDAO(ServletContext context) {
        this.context = context;
    }
    
    public User findByEmail(String email) throws SQLException {
        String sql = "SELECT * FROM users WHERE email = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setString(1, email);
            
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new User(
                        rs.getString("user_id"),
                        rs.getString("role"),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getString("phone"),
                        rs.getString("password_hash")
                    );
                }
            }
        }
        return null;
    }
    
    public void createUser(User user) throws SQLException {
        String sql = "INSERT INTO users (user_id, role, full_name, email, phone, password_hash) " +
                     "VALUES (?, ?, ?, ?, ?, ?)";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setString(1, UUID.randomUUID().toString());
            ps.setString(2, user.getRole());
            ps.setString(3, user.getFullName());
            ps.setString(4, user.getEmail());
            ps.setString(5, user.getPhone());
            ps.setString(6, user.getPasswordHash());
            
            ps.executeUpdate();
        }
    }
}
```

**Why use DAOs?**
- **Separation of concerns**: Servlets handle HTTP, DAOs handle database
- **Reusability**: Multiple servlets can use the same DAO methods
- **Testing**: Easier to test database logic independently
- **Maintainability**: Database changes are isolated to DAO classes

### WebSocket for Real-Time Updates

**Location:** `src/main/java/com/RBOS/websocket/WebSocketConfig.java`

**Purpose:** Push notifications to admin users when orders/reservations change.

```java
@ServerEndpoint("/realtime")
public class WebSocketConfig {
    private static Set<Session> adminSessions = Collections.synchronizedSet(new HashSet<>());
    
    @OnOpen
    public void onOpen(Session session) {
        adminSessions.add(session);
        System.out.println("WebSocket connected: " + session.getId());
    }
    
    @OnClose
    public void onClose(Session session) {
        adminSessions.remove(session);
    }
    
    public static void notifyNewOrder(String orderId) {
        String message = new ObjectMapper().writeValueAsString(
            Map.of("type", "NEW_ORDER", "orderId", orderId)
        );
        
        for (Session session : adminSessions) {
            session.getBasicRemote().sendText(message);
        }
    }
}
```

**Frontend connects:**
```typescript
const ws = new WebSocket('ws://localhost:8080/RBOS/realtime');
ws.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    // Show toast: "New order received!"
};
```

---

## Frontend Architecture

### Single Page Application (SPA) with React Router

**Entry Point:** `frontend/src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Root Component:** `frontend/src/App.tsx`

```typescript
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { CartProvider } from './features/cart/CartContext'
import { NotificationProvider } from './features/notifications/NotificationContext'
import AppRoutes from './app/routes'

function App() {
  return (
    <BrowserRouter basename="/RBOS/">
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

**Key Points:**
- `basename="/RBOS/"` - All routes are prefixed with `/RBOS/` (matches GlassFish context root)
- **Context Providers** wrap the app to provide global state:
  - `AuthProvider` - Current user, login/logout functions
  - `CartProvider` - Shopping cart state
  - `NotificationProvider` - Toast notifications

### API Client Pattern

**Location:** `frontend/src/api/client.ts`

**CRITICAL:** This is the **ONLY** place API calls should be made from. Never use `fetch()` directly in components.

```typescript
class ApiClient {
  private baseURL = import.meta.env.BASE_URL; // "/RBOS/" in production
  
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}api${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Send cookies for session
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  // Menu operations
  async getActiveMenuItems(): Promise<MenuItem[]> {
    return this.request<MenuItem[]>('/menu/active');
  }
  
  async getMenuWithInventory(): Promise<MenuItemWithInventory[]> {
    return this.request<MenuItemWithInventory[]>('/menu/with-inventory');
  }
  
  // Auth operations
  async login(email: string, password: string): Promise<User> {
    return this.request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }
  
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }
  
  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }
  
  // Order operations
  async createOrder(order: CreateOrderRequest): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }
  
  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.request<Order[]>(`/orders/user/${userId}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
```

**Usage in components:**

```typescript
import { apiClient } from '../api/client';

function CustomerMenu() {
  const [menuItems, setMenuItems] = useState([]);
  
  useEffect(() => {
    const loadMenu = async () => {
      const items = await apiClient.getActiveMenuItems();
      setMenuItems(items);
    };
    loadMenu();
  }, []);
  
  // ...
}
```

### React Context for State Management

**Example: CartContext.tsx**

```typescript
interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

type CartAction = 
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'qty' | 'lineTotal'> }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; qty: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // Check if item already exists
      const existingItem = state.items.find(
        item => item.itemId === action.payload.itemId
      );
      
      if (existingItem) {
        // Increment quantity
        const updatedItems = state.items.map(item =>
          item.itemId === action.payload.itemId
            ? { ...item, qty: item.qty + 1, lineTotal: (item.qty + 1) * item.price }
            : item
        );
        return calculateTotals(updatedItems);
      }
      
      // Add new item
      const newItem: CartItem = {
        ...action.payload,
        qty: 1,
        lineTotal: action.payload.price
      };
      return calculateTotals([...state.items, newItem]);
    }
    
    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(
        item => item.itemId !== action.payload
      );
      return calculateTotals(updatedItems);
    }
    
    // ... other cases
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0
  });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
```

**Usage:**
```typescript
function CustomerMenu() {
  const { dispatch } = useCart();
  
  const addToCart = (item: MenuItem) => {
    dispatch({ 
      type: 'ADD_ITEM', 
      payload: { itemId: item.itemId, name: item.name, price: item.price }
    });
  };
}

function CartPage() {
  const { state } = useCart();
  
  return (
    <div>
      {state.items.map(item => (
        <div key={item.itemId}>
          {item.name} x {item.qty} = ${item.lineTotal}
        </div>
      ))}
      <div>Total: ${state.total}</div>
    </div>
  );
}
```

---

## Database Layer

### SQLite Database

**Location:** `~/.rbos/restaurant.db` (user's home directory)

**Why SQLite?**
- **Embedded database** (no separate server needed)
- **Single file** (easy to backup/reset)
- **Perfect for development** and small-scale deployments
- **ACID compliant** (transactions work properly)

**Schema:** `src/main/resources/backend/schema.sql`

```sql
-- Users table
CREATE TABLE users (
  user_id       TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('admin','staff','customer')),
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  created_utc   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Menu items
CREATE TABLE menu_items (
  item_id       TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL,
  price         REAL NOT NULL CHECK (price >= 0),
  active        INTEGER NOT NULL DEFAULT 1,
  image_url     TEXT,
  dietary_tags  TEXT,
  created_utc   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Orders
CREATE TABLE orders (
  order_id      TEXT PRIMARY KEY,
  user_id       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  subtotal      REAL NOT NULL,
  tax           REAL NOT NULL,
  total         REAL NOT NULL,
  notes         TEXT,
  created_utc   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Order items
CREATE TABLE order_items (
  order_item_id TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  qty           INTEGER NOT NULL CHECK (qty > 0),
  unit_price    REAL NOT NULL,
  line_total    REAL NOT NULL,
  notes         TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id)  REFERENCES menu_items(item_id) ON DELETE RESTRICT
);

-- Seed data
INSERT INTO users (user_id, role, full_name, email, phone, password_hash) VALUES
  ('1', 'admin',    'Admin Admin',     'admin@rbos.com',   '555-1001', 'admin123'),
  ('2', 'staff',    'Jordan Kim',      'jordan@rbos.com',  '555-1002', 'staff123'),
  ('4', 'customer', 'Marcus Giannini', 'marcus@example.com', '555-2001', 'customer123');
```

### DatabaseConnection Utility

**Location:** `src/main/java/com/RBOS/utils/DatabaseConnection.java`

```java
public class DatabaseConnection {
    
    public static Connection getConnection(ServletContext context) throws SQLException {
        // Get database path (default: ~/.rbos/restaurant.db)
        String dbPath = System.getProperty("RBOS_DB");
        if (dbPath == null) {
            dbPath = System.getProperty("user.home") + "/.rbos/restaurant.db";
        }
        
        // Create directory if it doesn't exist
        File dbFile = new File(dbPath);
        File parentDir = dbFile.getParentFile();
        if (!parentDir.exists()) {
            parentDir.mkdirs();
        }
        
        // If database doesn't exist, copy seed database
        if (!dbFile.exists()) {
            copySeedDatabase(context, dbFile);
        }
        
        // Connect with foreign keys enabled
        String url = "jdbc:sqlite:" + dbPath;
        Connection conn = DriverManager.getConnection(url);
        
        // Enable foreign key constraints
        Statement stmt = conn.createStatement();
        stmt.execute("PRAGMA foreign_keys = ON");
        stmt.close();
        
        return conn;
    }
    
    private static void copySeedDatabase(ServletContext context, File targetFile) {
        // Copy from src/main/resources/backend/restaurant.db to ~/.rbos/
        InputStream seedDb = context.getResourceAsStream("/WEB-INF/classes/backend/restaurant.db");
        Files.copy(seedDb, targetFile.toPath());
    }
}
```

**How it works:**
1. Check if `~/.rbos/restaurant.db` exists
2. If not, copy seed database from WAR resources
3. Connect with `jdbc:sqlite:` URL
4. Enable foreign key constraints (SQLite disables by default)
5. Return connection

**Usage in DAOs:**
```java
try (Connection conn = DatabaseConnection.getConnection(getServletContext());
     PreparedStatement ps = conn.prepareStatement(sql)) {
    // Use connection
}
```

### RebuildDB Utility

**Location:** `RebuildDB.java` (project root)

**Purpose:** Regenerate seed database from `schema.sql` after making changes.

```java
public class RebuildDB {
    public static void main(String[] args) {
        String schemaFile = "src/main/resources/backend/schema.sql";
        String dbFile = "src/main/resources/backend/restaurant.db";
        
        // Read SQL file
        String sql = new String(Files.readAllBytes(Paths.get(schemaFile)));
        
        // Connect and execute
        Class.forName("org.sqlite.JDBC");
        Connection conn = DriverManager.getConnection("jdbc:sqlite:" + dbFile);
        Statement stmt = conn.createStatement();
        
        // Execute entire SQL file
        stmt.executeUpdate(sql);
        
        // Verify
        ResultSet rs = stmt.executeQuery("SELECT email, password_hash FROM users");
        while (rs.next()) {
            System.out.println(rs.getString("email") + " -> " + rs.getString("password_hash"));
        }
    }
}
```

**Run:**
```bash
javac -cp "src/main/webapp/WEB-INF/lib/sqlite-jdbc-3.50.3.0.jar" RebuildDB.java
java -cp ".;src/main/webapp/WEB-INF/lib/sqlite-jdbc-3.50.3.0.jar" RebuildDB
```

---

## Authentication Flow

### Backend: Session-Based Auth

**Login Flow:**

1. **User submits** email + password to `/api/auth/login`

2. **AuthServlet.doPost("/login")**:
```java
// Parse request
LoginBody body = mapper.readValue(req.getReader(), LoginBody.class);

// Look up user
PreparedStatement ps = conn.prepareStatement(
    "SELECT * FROM users WHERE email = ?"
);
ps.setString(1, body.email);
ResultSet rs = ps.executeQuery();

if (!rs.next()) {
    resp.setStatus(401);
    return; // User not found
}

// Check password
String hash = rs.getString("password_hash");
if (!checkPassword(body.password, hash)) {
    resp.setStatus(401);
    return; // Wrong password
}

// Create session
HttpSession session = req.getSession(true);
session.setAttribute("userId", rs.getInt("user_id"));

// Return user data (without password)
SafeUser user = new SafeUser(
    rs.getString("user_id"),
    rs.getString("role"),
    rs.getString("full_name"),
    rs.getString("email"),
    rs.getString("phone")
);
mapper.writeValue(resp.getWriter(), user);
```

3. **GlassFish creates session cookie** (JSESSIONID) and sends to browser

4. **Browser stores cookie** and includes it in all future requests

**Protected Endpoint Flow:**

```java
@Override
protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
    // Check for session
    HttpSession session = req.getSession(false);
    if (session == null || session.getAttribute("userId") == null) {
        resp.setStatus(401);
        return; // Not logged in
    }
    
    // Get user ID from session
    String userId = session.getAttribute("userId").toString();
    
    // Continue with authorized logic...
}
```

### Frontend: AuthContext

**Location:** `frontend/src/features/auth/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);
  
  const login = async (email: string, password: string) => {
    const user = await apiClient.login(email, password);
    setUser(user);
  };
  
  const logout = async () => {
    await apiClient.logout();
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Usage in components:**
```typescript
function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard'); // Redirect on success
    } catch (error) {
      alert('Invalid credentials');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## Key Files Explained

### 1. `build.xml` - Build Orchestration

This Apache Ant file coordinates the entire build process.

**Key Targets:**

```xml
<!-- Clean previous builds -->
<target name="clean">
  <delete dir="build"/>
  <delete dir="dist"/>
</target>

<!-- Build React frontend -->
<target name="build-frontend">
  <exec executable="npm" dir="frontend">
    <arg value="install"/>
  </exec>
  <exec executable="npm" dir="frontend">
    <arg value="run"/>
    <arg value="build"/>
  </exec>
  <!-- Copy dist/ to src/main/webapp/ -->
  <copy todir="src/main/webapp">
    <fileset dir="frontend/dist"/>
  </copy>
</target>

<!-- Compile Java -->
<target name="compile" depends="build-frontend">
  <javac srcdir="src/main/java" 
         destdir="build/classes"
         includeantruntime="false">
    <classpath>
      <fileset dir="src/main/webapp/WEB-INF/lib" includes="*.jar"/>
    </classpath>
  </javac>
</target>

<!-- Package WAR -->
<target name="package-war" depends="compile">
  <war destfile="dist/RBOS.war" webxml="src/main/webapp/WEB-INF/web.xml">
    <fileset dir="src/main/webapp"/>
    <classes dir="build/classes"/>
    <lib dir="src/main/webapp/WEB-INF/lib"/>
  </war>
</target>

<!-- Deploy to GlassFish -->
<target name="deploy" depends="package-war">
  <exec executable="../glassfish7/bin/asadmin">
    <arg value="deploy"/>
    <arg value="--force"/>
    <arg value="dist/RBOS.war"/>
  </exec>
</target>
```

### 2. `vite.config.ts` - Frontend Build Configuration

```typescript
export default defineConfig({
  plugins: [react()],
  
  // Base URL for production (must match GlassFish context root)
  base: '/RBOS/',
  
  server: {
    port: 5173,
    
    // Proxy API calls during development
    proxy: {
      '/RBOS/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080/RBOS',
        changeOrigin: true,
      },
      '/RBOS/realtime': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```

**Key settings:**
- `base: '/RBOS/'` - All asset paths will be `/RBOS/assets/...` in production
- `proxy` - Forwards `/RBOS/api/*` requests to GlassFish during `npm run dev`
- This allows frontend dev server (port 5173) to talk to backend (port 8080)

### 3. `web.xml` - Servlet Deployment Descriptor

```xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee"
         version="6.0">
  
  <display-name>RBOS</display-name>
  
  <!-- Default page -->
  <welcome-file-list>
    <welcome-file>index.html</welcome-file>
  </welcome-file-list>
  
  <!-- Critical: Redirect 404s to index.html for client-side routing -->
  <error-page>
    <error-code>404</error-code>
    <location>/index.html</location>
  </error-page>
  
</web-app>
```

**Why the 404 redirect?**

In an SPA, routes like `/menu`, `/cart`, `/dashboard` don't exist as physical files. They're handled by React Router in the browser.

**Without the 404 redirect:**
1. User navigates to `http://localhost:8080/RBOS/menu`
2. GlassFish looks for file `menu` → doesn't exist
3. Returns 404 error

**With the 404 redirect:**
1. User navigates to `http://localhost:8080/RBOS/menu`
2. GlassFish looks for file `menu` → doesn't exist
3. Returns `index.html` instead (200 status)
4. React loads, React Router sees `/menu` and renders `<CustomerMenu />`

### 4. `routes.tsx` - Client-Side Routing

```typescript
import { Routes, Route } from 'react-router-dom';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/menu" element={<CustomerMenu />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/reservations" element={<ReservationsPage />} />
      
      {/* Customer auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<CustomerDashboard />} />
      
      {/* Admin auth */}
      <Route path="/admin-login" element={<AdminLogin />} />
      
      {/* Admin panel */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="menu" element={<Menu />} />
        <Route path="inventory" element={<Inventory />} />
        {/* ... */}
      </Route>
    </Routes>
  );
}
```

**Basename in App.tsx:**
```typescript
<BrowserRouter basename="/RBOS/">
```

So routes become:
- `/` → `http://localhost:8080/RBOS/`
- `/menu` → `http://localhost:8080/RBOS/menu`
- `/admin/orders` → `http://localhost:8080/RBOS/admin/orders`

---

## Critical Fixes & Why They Were Needed

### Fix #1: Authentication Bypass

**Problem:**
```java
private static final boolean BYPASS_AUTH = true;  // BAD!
```

With this enabled, `AuthServlet` always returned a mock admin user without checking credentials.

**Why it existed:** Development convenience - no need to login during testing.

**Why it's bad:** 
- Can't test real login
- Can't differentiate between user roles
- Security vulnerability in production

**Fix:**
```java
private static final boolean BYPASS_AUTH = false;
```

**Result:** All users must authenticate with real email/password.

---

### Fix #2: Null Passwords in Database

**Problem:**
When trying to login as customer, logs showed:
```
Login attempt for email: marcus@example.com
Found user: marcus@example.com role: customer
Password hash: null    <-- Problem!
Password provided: customer123
Password check failed
```

**Root cause:** The seed database (`src/main/resources/backend/restaurant.db`) was created before passwords were added to `schema.sql`. The bootstrap process only copies the seed DB if it doesn't exist, so it never picked up the new passwords.

**Fix:**
1. Stop GlassFish (releases database lock)
2. Delete `~/.rbos/restaurant.db`
3. Delete `src/main/resources/backend/restaurant.db`
4. Run `RebuildDB.java` to regenerate seed DB from updated `schema.sql`
5. Restart GlassFish (copies fresh seed DB to `~/.rbos/`)

**Why this workflow?**
- SQLite database is a **binary file** (can't merge like text files)
- Seed DB must be regenerated whenever `schema.sql` changes
- Live DB at `~/.rbos/` is auto-created from seed DB on first run

---

### Fix #3: Separate Login Pages

**Problem:** Customers and admins used the same login page at `/login`, but admins needed to access `/admin` panel while customers should go to `/dashboard`.

**Solution:**
1. **Customer login** at `/login` → redirects to `/dashboard`
2. **Admin login** at `/admin-login` → verifies role and redirects to `/admin`

**AdminLogin.tsx verification:**
```typescript
const handleLogin = async (e: FormEvent) => {
  e.preventDefault();
  
  try {
    await login(email, password);
    
    // Check user role
    const me = await apiClient.getCurrentUser();
    if (me.role !== 'admin' && me.role !== 'staff') {
      await logout();
      throw new Error('Admin access required');
    }
    
    navigate('/admin');
  } catch (error) {
    setError('Invalid admin credentials');
  }
};
```

---

### Fix #4: Customer Dashboard

**Problem:** After logging in, customers had nowhere to go. NavBar showed "Dashboard" link but page didn't exist.

**Solution:** Created `CustomerDashboard.tsx` with:
- User profile info (name, email, phone)
- Recent orders (fetched via `apiClient.getOrdersByUser()`)
- Upcoming reservations (fetched via `apiClient.getReservationsForUser()`)
- Quick action buttons (Browse Menu, Make Reservation)

**Data loading:**
```typescript
useEffect(() => {
  const loadData = async () => {
    if (!user) return;
    
    try {
      const [ordersData, reservationsData] = await Promise.all([
        apiClient.getOrdersByUser(user.userId),
        apiClient.getReservationsForUser(user.userId)
      ]);
      
      setOrders(ordersData);
      setReservations(reservationsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };
  
  loadData();
}, [user]);
```

---

### Fix #5: Cart Functionality

**Problem:** "Add to order" buttons on menu page didn't seem to work - no visual feedback.

**Solution:**

1. **Added notification toast:**
```typescript
const addToCart = (menuItem: MenuItem) => {
  // Add to cart state
  dispatch({ type: 'ADD_ITEM', payload: menuItem });
  
  // Show success message
  addNotification({
    type: 'success',
    title: 'Added to cart',
    message: `${menuItem.name} has been added to your order`
  });
};
```

2. **Added cart icon with badge to NavBar:**
```typescript
<Link to="/cart">
  <ShoppingCartIcon />
  {cartState.items.length > 0 && (
    <span className="badge">{cartState.items.length}</span>
  )}
</Link>
```

**Result:** Clear visual feedback when items are added, cart icon shows count.

---

### Fix #6: Vite Proxy Configuration

**Problem:** During development (`npm run dev`), frontend runs on port 5173 but backend is on port 8080. Browser blocks cross-origin requests.

**Wrong hostname:**
```typescript
proxy: {
  '/RBOS/api': {
    target: 'http://MSI:8080',  // MSI = machine hostname - doesn't work!
  }
}
```

**Fix:**
```typescript
proxy: {
  '/RBOS/api': {
    target: 'http://localhost:8080',  // Always use localhost in dev
    changeOrigin: true,
  },
  '/api': {
    target: 'http://localhost:8080/RBOS',
    changeOrigin: true,
  }
}
```

**How it works:**
1. Frontend code calls: `fetch('/RBOS/api/menu/active')`
2. Browser sends to: `http://localhost:5173/RBOS/api/menu/active`
3. Vite dev server intercepts and proxies to: `http://localhost:8080/RBOS/api/menu/active`
4. GlassFish responds
5. Vite returns response to browser

**Why two proxy rules?**
- `/RBOS/api` - Matches production URL structure
- `/api` - Fallback for code that doesn't include `/RBOS/` prefix

---

### Fix #7: Client-Side Routing in Production

**Problem:** Accessing `http://localhost:8080/RBOS/login` directly returned 404 from GlassFish.

**Why?** GlassFish looks for a physical file called `login` - doesn't exist.

**Solution:** Added to `web.xml`:
```xml
<error-page>
  <error-code>404</error-code>
  <location>/index.html</location>
</error-page>
```

**Flow now:**
1. Request: `GET /RBOS/login`
2. GlassFish: "No file called 'login', return 404... wait, redirect to /index.html"
3. Returns: `index.html` (React app)
4. React Router: "URL is /login, render <LoginPage />"

---

## Common Development Tasks

### Task 1: Add a New API Endpoint

**Backend steps:**

1. **Create DAO method** (if needed):
```java
// UserDAO.java
public List<User> getActiveUsers() throws SQLException {
    String sql = "SELECT * FROM users WHERE active = 1";
    // ... implementation
}
```

2. **Add servlet handler:**
```java
// UserServlet.java
@Override
protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
    String path = getPathInfo(req);
    
    if ("/active".equals(path)) {
        UserDAO dao = new UserDAO(getServletContext());
        List<User> users = dao.getActiveUsers();
        
        resp.setContentType("application/json");
        new ObjectMapper().writeValue(resp.getWriter(), users);
        return;
    }
}
```

**Frontend steps:**

3. **Add method to ApiClient:**
```typescript
// api/client.ts
async getActiveUsers(): Promise<User[]> {
  return this.request<User[]>('/users/active');
}
```

4. **Use in component:**
```typescript
const [users, setUsers] = useState<User[]>([]);

useEffect(() => {
  const loadUsers = async () => {
    const data = await apiClient.getActiveUsers();
    setUsers(data);
  };
  loadUsers();
}, []);
```

---

### Task 2: Add a New Page/Route

1. **Create component:**
```typescript
// frontend/src/pages/MyNewPage.tsx
export default function MyNewPage() {
  return <div>My New Page</div>;
}
```

2. **Add route:**
```typescript
// app/routes.tsx
<Route path="/my-page" element={<MyNewPage />} />
```

3. **Add link in NavBar:**
```typescript
<Link to="/my-page">My Page</Link>
```

4. **Rebuild and deploy:**
```bash
ant clean package-war deploy
```

---

### Task 3: Modify Database Schema

1. **Edit `schema.sql`:**
```sql
ALTER TABLE users ADD COLUMN preferences TEXT;
```

2. **Regenerate seed database:**
```bash
# Stop GlassFish
cd ../glassfish7/bin
./asadmin stop-domain domain1

# Delete databases
rm ~/.rbos/restaurant.db
rm src/main/resources/backend/restaurant.db

# Rebuild seed DB
javac -cp "src/main/webapp/WEB-INF/lib/sqlite-jdbc-3.50.3.0.jar" RebuildDB.java
java -cp ".;src/main/webapp/WEB-INF/lib/sqlite-jdbc-3.50.3.0.jar" RebuildDB

# Restart GlassFish
cd ../glassfish7/bin
./asadmin start-domain domain1
```

3. **Update model class:**
```java
// models/User.java
private String preferences;

public String getPreferences() { return preferences; }
public void setPreferences(String p) { preferences = p; }
```

4. **Update DAO queries** to include new column.

---

### Task 4: Debug API Call

**Check network tab in browser DevTools:**
1. Open DevTools → Network tab
2. Trigger the API call
3. Look for request to `/RBOS/api/...`
4. Check:
   - Status code (200 = success, 401 = not logged in, 500 = server error)
   - Request payload (POST/PUT body)
   - Response data

**Check GlassFish logs:**
```bash
tail -f ../glassfish7/glassfish/domains/domain1/logs/server.log
```

**Add logging to servlet:**
```java
System.out.println("Received request: " + req.getPathInfo());
System.out.println("User ID from session: " + session.getAttribute("userId"));
```

---

## Summary

### Key Concepts

1. **GlassFish** = Java application server that runs your backend code and serves your frontend files

2. **Vite** = Build tool that:
   - Provides fast dev server with HMR
   - Bundles React code for production
   - Proxies API calls during development

3. **WAR file** = Deployment package containing:
   - Compiled Java classes
   - Frontend build (HTML/JS/CSS)
   - Dependencies (JARs)
   - Configuration (web.xml)

4. **Client-side routing** = React Router handles navigation in browser without page reloads

5. **Session-based auth** = Server stores user ID in session, sends cookie to browser

6. **API Client pattern** = Single class (`apiClient`) for all backend communication

7. **Context API** = React's built-in state management (Auth, Cart, Notifications)

8. **DAO pattern** = Separate database logic from HTTP logic

### Development Workflow

```
1. Make changes to frontend/backend
2. ant clean package-war deploy
3. Test in browser
4. Check logs if errors
5. Repeat
```

### Production Deployment

```
Build → RBOS.war → Deploy to GlassFish → Runs on http://server:8080/RBOS/
```

Single server, single port, single deployment - frontend and backend together.

---

This architecture provides:
- ✅ Clean separation of concerns (Servlets, DAOs, React components)
- ✅ Type safety (TypeScript + Java static typing)
- ✅ Fast development (Vite HMR + GlassFish hot reload)
- ✅ Simple deployment (one WAR file)
- ✅ Real-time updates (WebSockets)
- ✅ Responsive UI (React + Tailwind)
