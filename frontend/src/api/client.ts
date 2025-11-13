const BASE = (import.meta as any)?.env?.BASE_URL || '/';
const API_BASE = `${BASE}api`;

export interface User {
  userId: string;
  role: 'customer' | 'staff' | 'admin';
  fullName: string;
  email: string;
  phone?: string;
}

export interface DiningTable {
  tableId: string;
  name: string;
  capacity: number;
}

export interface Reservation {
  reservationId?: string;
  userId?: string;
  tableId: string;
  startUtc: string;
  endUtc: string;
  partySize: number;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'no_show';
  notes?: string;
  createdUtc?: string;
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

export interface Inventory {
  inventoryId?: string;
  itemId: string;
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
  userId?: string;
  source: 'web' | 'phone' | 'walkin';
  status: 'cart' | 'placed' | 'paid' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  createdUtc?: string;
  orderItems?: OrderItem[];
}

export interface OrderItem {
  orderItemId?: string;
  orderId?: string;
  itemId: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
}

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
    revenue: number;
    quantity: number;
    price: number;
  }>;
  categoryPerformance: Array<{ category: string; revenue: number }>;
  totalMenuItems: number;
  activeMenuItems: number;
}

class ApiClient {
  private baseURL = API_BASE;

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`API error: ${response.status}${text ? ` ${text}` : ''}`);
    }

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) return response.json();
    return null;
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

  async getTables(): Promise<DiningTable[]> {
    return this.request('/tables');
  }

  async getAvailableTables(startUtc: string, endUtc: string, partySize: number): Promise<DiningTable[]> {
    const params = new URLSearchParams({ startUtc, endUtc, partySize: partySize.toString() });
    return this.request(`/reservations/available-tables?${params}`);
  }

  async createTable(table: Omit<DiningTable, 'tableId'>): Promise<DiningTable> {
    return this.request('/tables', { method: 'POST', body: JSON.stringify(table) });
  }

  async updateTable(table: DiningTable): Promise<DiningTable> {
    return this.request(`/tables/${table.tableId}`, { method: 'PUT', body: JSON.stringify(table) });
  }

  async getReservations(): Promise<Reservation[]> {
    return this.request('/reservations');
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
  const all = await this.getReservations();
  return (all || []).filter(r => r.userId === userId);
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

  async createMenuItem(menuItem: Omit<MenuItem, 'id'>): Promise<MenuItem> {
    return this.request('/menu', { method: 'POST', body: JSON.stringify(menuItem) });
  }

  async updateMenuItem(menuItem: MenuItem): Promise<MenuItem> {
    return this.request(`/menu/${menuItem.itemId}`, { method: 'PUT', body: JSON.stringify(menuItem) });
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

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return this.request(`/orders/status/${status}`);
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.request(`/orders/user/${userId}`);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
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
}

export const apiClient = new ApiClient();
