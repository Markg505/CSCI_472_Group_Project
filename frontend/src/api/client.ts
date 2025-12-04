const BASE = (import.meta as any)?.env?.BASE_URL || '/';
export const API_BASE = `${BASE}api`;

const KEY = "RBOS_INVENTORY_FULL_DROPDOWN";
const MAX_HISTORY_PAGE_SIZE = 100;


export interface User {
  userId: string;
  role: 'customer' | 'staff' | 'admin';
  fullName: string;
  email: string;
  phone?: string;
  profileImageUrl?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface DiningTable {
  tableId: string;
  name: string;
  capacity: number;
  pos_x?: number;
  pos_y?: number;
  basePrice?: number;
}

export interface Reservation {
  reservationId?: string;
  userId?: string;
  guestName?: string;
  contactEmail?: string;
  contactPhone?: string;
  tableId: string;
  startUtc: string;
  endUtc: string;
  partySize: number;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'no_show';
  notes?: string;
  createdUtc?: string;
  reservationFee?: number;
}

export interface MenuItem {
  itemId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  active: boolean;
  imageUrl: string;
  dietaryTags: string;
}

export interface MenuItemWithInventory extends MenuItem {
  inventory?: {
    qtyOnHand: number;
    parLevel: number;
    reorderPoint: number;
    available: number;
  };
}

export type Unit = "each" | "lb" | "oz" | "case" | "bag";
export type CountFreq = "daily" | "weekly" | "monthly";
export type Allergen = "none" | "gluten" | "dairy" | "eggs" | "soy" | "peanuts" | "tree-nuts" | "shellfish" | "fish" | "sesame";

export interface Inventory {
  inventoryId?: string;
  itemId?: string;
  name: string;
  sku: string;
  category: string;
  unit: 'each' | 'lb' | 'oz' | 'case' | 'bag';
  packSize: number;
  qtyOnHand: number;
  parLevel: number;
  reorderPoint: number;
  cost: number;
  location: string;
  active: boolean;
  vendor: string;
  leadTimeDays: number;
  preferredOrderQty: number;
  wasteQty: number;
  lastCountedAt: string;
  countFreq: 'daily' | 'weekly' | 'monthly';
  lot: string;
  expiryDate: string;
  allergen: 'none' | 'gluten' | 'dairy' | 'eggs' | 'soy' | 'peanuts' | 'tree-nuts' | 'shellfish' | 'fish' | 'sesame';
  conversion: string;
  createdUtc?: string;
  menuItem?: MenuItem;
}

export interface Order {
  orderId?: string;
  orderNumber?: string;
  userId?: string;
  source: 'web' | 'phone' | 'walkin';
  status: 'cart' | 'placed' | 'paid' | 'cancelled';
  fulfillmentType?: 'delivery' | 'carryout';
  subtotal: number;
  tax: number;
  total: number;
  createdUtc?: string;
  orderItems?: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  deliveryAddress2?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPostalCode?: string;
  deliveryInstructions?: string;
}

export interface OrderItem {
  orderItemId?: string;
  orderId?: string;
  itemId: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
  menuItem?: { name?: string };
}

export interface CartMergeRequest {
  cartToken?: string;
  items: Array<{ itemId: string; qty: number; unitPrice?: number; name?: string }>;
}

export interface CartMergeResponse {
  orderId?: string;
  cartToken?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  conflicts?: {
    dropped?: Array<{ itemId: string; name?: string; reason?: string; requested?: number; applied?: number }>;
    clamped?: Array<{ itemId: string; name?: string; reason?: string; requested?: number; applied?: number }>;
    merged?: Array<{ itemId: string; name?: string; reason?: string; requested?: number; applied?: number }>;
  };
}

export interface LoginResponse {
  user: User;
  cartToken?: string;
  cart?: CartMergeResponse;
}

export interface HistoryResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  retentionMonths: number;
  retentionHorizon: string;
}
export interface InventoryItem  {
  id: string;
  name: string;
  sku: string;                 
  category: string;
  unit: string;                  
  packSize: number;            
  qtyOnHand: number;
  parLevel: number;            
  reorderPoint: number;        
  cost: number;               
  location: string;           
  active: boolean;
  vendor: string;              
  leadTimeDays: number;
  preferredOrderQty: number;
  wasteQty: number;            
  lastCountedAt: string;      
  countFreq: string;        
  lot: string;                 
  expiryDate: string;          
  allergen: string;          
  conversion: string;          
};
export interface ReportMetrics {
  todayReservations: number;
  pendingReservations: number;
  todayRevenue: number;
  todayOrders: number;
  totalCustomers: number;
  totalReservations: number;
  totalOrders: number;
}

export interface ReservationAnalytics {
  timeline: Array<{ date: string; count: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  partySizeDistribution: Array<{ partySize: number; count: number }>;
  totalReservations: number;
  avgPartySize: number;
}

export interface SalesAnalytics {
  revenueTimeline: Array<{ date: string; revenue: number }>;
  orderCountTimeline: Array<{ date: string; count: number }>;
  sourceDistribution: Array<{ source: string; count: number }>;
  sourceTotals?: Array<{ source: string; revenue: number; count: number }>;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
}

export interface CustomerAnalytics {
  roleDistribution: Array<{ role: string; count: number }>;
  loyaltyDistribution: Array<{ category: string; count: number }>;
  totalUsers: number;
  customersWithReservations: number;
  avgReservationsPerCustomer: number;
}

export interface MenuPerformance {
  topItems: Array<{
    itemId: string;
    name: string;
    category?: string;
    revenue: number;
    quantity: number;
    price: number;
  }>;
  categoryPerformance: Array<{ category: string; revenue: number }>;
  totalMenuItems: number;
  activeMenuItems: number;
}

export interface AuditLogEntry {
  timestamp: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  oldValue?: string;
  newValue?: string;
}
export interface BookingSettings {
  openTime: string;                 
  closeTime: string;                
  daysOpen: { [k: string]: boolean }; 
  maxDaysOut: number;               
  reservationLengthMinutes: number; 
  slotIntervalMinutes?: number;     
}

export interface ProfileUpdatePayload {
  fullName?: string;
  email?: string;
  phone?: string;
  profileImageUrl?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

class ApiClient {
  private baseURL = API_BASE;

  private getCartToken() {
    try {
      return localStorage.getItem('rbos_cart_token');
    } catch {
      return null;
    }
  }

  private persistCartToken(token: string | null | undefined) {
    try {
      if (token) {
        localStorage.setItem('rbos_cart_token', token);
      } else {
        localStorage.removeItem('rbos_cart_token');
      }
    } catch {
    }
  }

  private boundedPageSize(requested?: number) {
    if (!requested || requested < 1) return 20;
    return Math.min(requested, MAX_HISTORY_PAGE_SIZE);
  }

  private normalizeTableCoords<T extends { pos_x?: number; pos_y?: number; posX?: number; posY?: number }>(t: T) {
    const pos_x = t.pos_x ?? (t as any).posX ?? 0;
    const pos_y = t.pos_y ?? (t as any).posY ?? 0;
    return { ...t, pos_x, pos_y };
  }

  private historyQuery(params: Record<string, string | number | undefined>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    return search.toString() ? `?${search.toString()}` : '';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const cartToken = this.getCartToken();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(cartToken ? { 'X-Cart-Token': cartToken } : {}),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    const responseCartToken = response.headers.get('x-cart-token');
    if (responseCartToken) {
      this.persistCartToken(responseCartToken);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`API error: ${response.status}${text ? ` ${text}` : ''}`);
    }

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) return response.json();
    return null;
  }

  updateCartToken(token: string | null) {
    this.persistCartToken(token);
  }
async listUsers(): Promise<User[]> {
  return this.request('/users') as Promise<User[]>;
}
async createUser(payload: Partial<User> & { password?: string }): Promise<User> {
  return this.request('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  }) as Promise<User>;
}
  async getUserByEmail(email: string): Promise<User> {
    return this.request(`/users/email/${encodeURIComponent(email)}`);
  }

  async updateUser(user: User): Promise<User> {
    return this.request(`/users/${user.userId}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(`/users/${userId}`, { method: 'DELETE' });
  }

  async updateMyProfile(userId: string, payload: ProfileUpdatePayload): Promise<User> {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getTables(): Promise<DiningTable[]> {
    const data = await this.request('/tables');
    return Array.isArray(data) ? data.map(t => this.normalizeTableCoords(t)) : [];
  }
    async getsInventory(): Promise<InventoryItem[]> {
    return this.request('/inventory');
  }

  async getAvailableTables(startUtc: string, endUtc: string, partySize: number): Promise<DiningTable[]> {
    const params = new URLSearchParams({ startUtc, endUtc, partySize: partySize.toString() });
    const data = await this.request(`/reservations/available-tables?${params}`);
    return Array.isArray(data) ? data.map(t => this.normalizeTableCoords(t)) : [];
  }

  async createTable(table: Omit<DiningTable, 'tableId'>): Promise<DiningTable> {
    return this.request('/tables', { method: 'POST', body: JSON.stringify(table) });
  }

  async updateTable(table: DiningTable): Promise<DiningTable> {
    return this.request(`/tables/${table.tableId}`, { method: 'PUT', body: JSON.stringify(table) });
  }

  async updateTablePosition(tableId: string, x: number, y: number): Promise<void> {
    await this.request(`/tables/${tableId}/position`, {
      method: 'PUT',
      body: JSON.stringify({ x, y }),
    });
  }

  async getMapImageUrl(): Promise<{ url: string }> {
    return this.request('/tables/config/map-image');
  }

  async setMapImageUrl(url: string): Promise<void> {
    await this.request('/tables/config/map-image', {
      method: 'PUT',
      body: JSON.stringify({ url }),
    });
  }
  async deleteTable(tableId: string): Promise<void> {
    await this.request(`/tables/${tableId}`, { method: 'DELETE' });
  }

  async getReservations(): Promise<Reservation[]> {
    return this.request('/reservations');
  }

  async getReservationById(reservationId: string): Promise<Reservation> {
    return this.request(`/reservations/${encodeURIComponent(reservationId)}`);
  }

  async getReservationHistory(params: { status?: string; startUtc?: string; endUtc?: string; userId?: string; page?: number; pageSize?: number; }): Promise<HistoryResult<Reservation>> {
    const query = this.historyQuery({
      status: params.status,
      start_utc: params.startUtc,
      end_utc: params.endUtc,
      userId: params.userId,
      page: params.page || 1,
      pageSize: this.boundedPageSize(params.pageSize),
    });
    return this.request(`/reservations/history${query}`);
  }
  async listInventory(): Promise<InventoryItem[]> {
    return this.request('/inventory');
  }
   async  addInventoryItem(item: InventoryItem): Promise<InventoryItem> {
    return this.request('/inventory', { method: 'POST', body: JSON.stringify(item) });
  }
async updateInventoryItem(id: string,patch: Partial<InventoryItem>): Promise<InventoryItem> {
    return this.request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}
  async createReservation(reservation: Reservation): Promise<Reservation> {
    return this.request('/reservations', { method: 'POST', body: JSON.stringify(reservation) });
  }

  async updateReservation(reservation: Reservation): Promise<Reservation> {
    return this.request(`/reservations/${reservation.reservationId}`, {
      method: 'PUT',
      body: JSON.stringify(reservation),
    });
  }
async deleteReservation(reservationId: string): Promise<void> {
  await this.request(`/reservations/${reservationId}`, { method: 'DELETE' });
}

async getReservationsForUser(userId: string) {
  const history = await this.getReservationHistory({ userId, pageSize: 50 });
  return history.items;
}

async updateReservationStatus(reservationId: string, status: string): Promise<Reservation> {
  return this.request(`/reservations/${reservationId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  }

  async getMenuWithInventory(): Promise<MenuItemWithInventory[]> {
    return this.request('/menu/with-inventory');
  }

  async getMenuItems(): Promise<MenuItem[]> {
    return this.request('/menu');
  }

  async getActiveMenuItems(): Promise<MenuItem[]> {
    return this.request('/menu/active');
  }

  async createMenuItem(menuItem: MenuItem): Promise<MenuItem> {
  return this.request('/menu', { 
    method: 'POST', 
    body: JSON.stringify(menuItem) 
  }) as Promise<MenuItem>;
}

  async updateMenuItem(menuItem: MenuItem): Promise<MenuItem> {
  return this.request(`/menu/${menuItem.itemId}`, { 
    method: 'PUT', 
    body: JSON.stringify(menuItem) 
  }) as Promise<MenuItem>;
}

  async deleteMenuItem(itemId: string): Promise<void> {
    await this.request(`/menu/${itemId}`, { method: 'DELETE' });
  }

  async updateMenuItemImage(itemId: string, imageUrl: string): Promise<MenuItem> {
    return this.request(`/menu/${itemId}/image`, {
        method: 'PUT',
        body: JSON.stringify({ imageUrl }),
    });
  }

  async getMenuItemById(itemId: string): Promise<MenuItem> {
      return this.request(`/menu/${itemId}`);
  }

  async getOrderById(orderId: string): Promise<Order> {
      return this.request(`/orders/${orderId}`);
  }
  async getBookingSettings(): Promise<BookingSettings> {
  return this.request('/booking-settings');
}

async updateBookingSettings(settings: BookingSettings): Promise<BookingSettings> {
  return this.request('/booking-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

  async getAllOrders(): Promise<Order[]> {
      return this.request('/orders');
  }

 async getInventory(): Promise<Inventory[]> {
    return this.request('/inventory');
  }

  async getLowStockItems(): Promise<Inventory[]> {
    return this.request('/inventory/low-stock');
  }

  async createInventory(inventory: Omit<Inventory, 'inventoryId'>): Promise<Inventory> {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(inventory),
    });
  }

  async updateInventory(inventory: Inventory): Promise<Inventory> {
    return this.request(`/inventory/${inventory.inventoryId}`, {
      method: 'PUT',
      body: JSON.stringify(inventory),
    });
  }

  async deleteInventory(inventoryId: string): Promise<void> {
    await this.request(`/inventory/${inventoryId}`, { method: 'DELETE' });
  }

  async createOrder(order: Order): Promise<Order> {
    return this.request('/orders', { method: 'POST', body: JSON.stringify(order) });
  }

  async mergeCart(payload: CartMergeRequest): Promise<CartMergeResponse> {
    const body: CartMergeRequest = {
      ...payload,
      cartToken: payload.cartToken ?? this.getCartToken() ?? undefined,
    };
    const response = await this.request('/orders/cart', {
      method: 'POST',
      body: JSON.stringify(body)
    }) as CartMergeResponse;
    if (response?.cartToken) {
      this.persistCartToken(response.cartToken);
    }
    return response;
  }

  async getCart(cartToken?: string): Promise<CartMergeResponse> {
    const response = await this.request('/orders/cart', {
      headers: cartToken ? { 'X-Cart-Token': cartToken } : undefined
    }) as CartMergeResponse;
    if (response?.cartToken) {
      this.persistCartToken(response.cartToken);
    }
    return response;
  }

  async getOrderHistory(params: { status?: string; startUtc?: string; endUtc?: string; userId?: string; page?: number; pageSize?: number; }): Promise<HistoryResult<Order>> {
    const query = this.historyQuery({
      status: params.status,
      start_utc: params.startUtc,
      end_utc: params.endUtc,
      userId: params.userId,
      page: params.page || 1,
      pageSize: this.boundedPageSize(params.pageSize),
    });
    return this.request(`/orders/history${query}`);
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return this.request(`/orders/status/${status}`);
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    const history = await this.getOrderHistory({ userId, pageSize: 50 });
    return history.items;
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    const params = new URLSearchParams({ status });
    return this.request(`/orders/${orderId}/status?${params.toString()}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async updateOrder(order: Order): Promise<Order> {
    return this.request(`/orders/${order.orderId}`, { method: 'PUT', body: JSON.stringify(order) });
  }

  async deleteOrder(orderId: string): Promise<void> {
    await this.request(`/orders/${orderId}`, { method: 'DELETE' });
  }

  async getDashboardMetrics(): Promise<ReportMetrics> {
    return this.request('/reports/dashboard-metrics');
  }

  async getReservationAnalytics(period: string = 'week'): Promise<ReservationAnalytics> {
    return this.request(`/reports/reservation-analytics?period=${period}`);
  }

  async getSalesAnalytics(period: string = 'week'): Promise<SalesAnalytics> {
    return this.request(`/reports/sales-analytics?period=${period}`);
  }

  async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    return this.request('/reports/customer-analytics');
  }

  async getMenuPerformance(): Promise<MenuPerformance> {
    return this.request('/reports/menu-performance');
  }

  async getAuditLogEntries(entityType?: string): Promise<AuditLogEntry[]> {
    const query = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
    const response = await fetch(`${this.baseURL}/audit-log/export${query}`, {
      headers: { Accept: 'text/csv' },
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Audit log export failed: ${response.status}`);
    }
    const text = await response.text();
    const lines = text.trim().split('\n');
    const entries: AuditLogEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 8) continue;
      const [timestamp, eType, entityId, action, userId, userName, oldValue, newValue] = cols;
      entries.push({ timestamp, entityType: eType, entityId, action, userId, userName, oldValue, newValue });
    }
    return entries;
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export const apiClient = new ApiClient();
