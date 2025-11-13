import { useEffect, useState } from 'react';
import { 
  apiClient, 
  type ReportMetrics,
  type ReservationAnalytics,
  type SalesAnalytics,
  type CustomerAnalytics,
  type MenuPerformance
} from '../../api/client';
import {
  ChartBarIcon,
  CalendarIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/20/solid';

type TimePeriod = 'week' | 'month' | 'quarter';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reservations' | 'sales' | 'customers' | 'menu'>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [reservationAnalytics, setReservationAnalytics] = useState<ReservationAnalytics | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null);
  const [menuPerformance, setMenuPerformance] = useState<MenuPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverviewData();
  }, []);

  useEffect(() => {
    if (activeTab === 'reservations') {
      loadReservationAnalytics();
    } else if (activeTab === 'sales') {
      loadSalesAnalytics();
    } else if (activeTab === 'customers') {
      loadCustomerAnalytics();
    } else if (activeTab === 'menu') {
      loadMenuPerformance();
    }
  }, [activeTab, timePeriod]);

  const loadOverviewData = async () => {
    try {
      const [metricsData] = await Promise.all([
        apiClient.getDashboardMetrics()
      ]);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReservationAnalytics = async () => {
    try {
      const data = await apiClient.getReservationAnalytics(timePeriod);
      setReservationAnalytics(data);
    } catch (error) {
      console.error('Error loading reservation analytics:', error);
    }
  };

  const loadSalesAnalytics = async () => {
    try {
      const data = await apiClient.getSalesAnalytics(timePeriod);
      setSalesAnalytics(data);
    } catch (error) {
      console.error('Error loading sales analytics:', error);
    }
  };

  const loadCustomerAnalytics = async () => {
    try {
      const data = await apiClient.getCustomerAnalytics();
      setCustomerAnalytics(data);
    } catch (error) {
      console.error('Error loading customer analytics:', error);
    }
  };

  const loadMenuPerformance = async () => {
    try {
      const data = await apiClient.getMenuPerformance();
      setMenuPerformance(data);
    } catch (error) {
      console.error('Error loading menu performance:', error);
    }
  };

  const exportReport = () => {
    // Simple CSV export implementation
    let csvContent = "data:text/csv;charset=utf-8,";
    
    switch (activeTab) {
      case 'reservations':
        if (reservationAnalytics) {
          csvContent += "Date,Reservations\\n";
          reservationAnalytics.timeline.forEach(item => {
            csvContent += `${item.date},${item.count}\\n`;
          });
        }
        break;
      case 'sales':
        if (salesAnalytics) {
          csvContent += "Date,Revenue,Orders\\n";
          salesAnalytics.revenueTimeline.forEach((item, index) => {
            const orders = salesAnalytics.orderCountTimeline[index]?.count || 0;
            csvContent += `${item.date},${item.revenue},${orders}\\n`;
          });
        }
        break;
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Analytics & Reports
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive insights into your restaurant performance
          </p>
        </div>
        <div className="mt-5 flex lg:mt-0 lg:ml-4 gap-3">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
          </select>
          <button
            onClick={exportReport}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'reservations', name: 'Reservations', icon: CalendarIcon },
            { id: 'sales', name: 'Sales', icon: CurrencyDollarIcon },
            { id: 'customers', name: 'Customers', icon: UserGroupIcon },
            { id: 'menu', name: 'Menu', icon: ShoppingCartIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Report Content */}
      <div className="py-6">
        {activeTab === 'overview' && metrics && <OverviewReport metrics={metrics} />}
        {activeTab === 'reservations' && reservationAnalytics && (
          <ReservationReport data={reservationAnalytics} period={timePeriod} />
        )}
        {activeTab === 'sales' && salesAnalytics && (
          <SalesReport data={salesAnalytics} period={timePeriod} />
        )}
        {activeTab === 'customers' && customerAnalytics && (
          <CustomerReport data={customerAnalytics} />
        )}
        {activeTab === 'menu' && menuPerformance && (
          <MenuReport data={menuPerformance} />
        )}
      </div>
    </div>
  );
}

// Overview Report Component
function OverviewReport({ metrics }: { metrics: ReportMetrics }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today's Revenue"
          value={`$${metrics.todayRevenue.toFixed(2)}`}
          icon={CurrencyDollarIcon}
          color="green"
        />
        <MetricCard
          title="Today's Reservations"
          value={metrics.todayReservations.toString()}
          icon={CalendarIcon}
          color="blue"
        />
        <MetricCard
          title="Today's Orders"
          value={metrics.todayOrders.toString()}
          icon={ShoppingCartIcon}
          color="purple"
        />
        <MetricCard
          title="Pending Reservations"
          value={metrics.pendingReservations.toString()}
          icon={UserGroupIcon}
          color="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Total Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Reservations</span>
              <span className="font-semibold">{metrics.totalReservations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Orders</span>
              <span className="font-semibold">{metrics.totalOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Customers</span>
              <span className="font-semibold">{metrics.totalCustomers}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Quick Insights</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• {metrics.todayReservations} reservations booked today</p>
            <p>• ${metrics.todayRevenue.toFixed(2)} in today's sales</p>
            <p>• {metrics.pendingReservations} reservations awaiting confirmation</p>
            <p>• {metrics.todayOrders} orders placed today</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reservation Report Component
function ReservationReport({ data, period }: { data: ReservationAnalytics; period: string }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Reservation Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Reservations</span>
              <span className="font-semibold">{data.totalReservations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Party Size</span>
              <span className="font-semibold">{data.avgPartySize.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
          <div className="space-y-2">
            {data.statusDistribution.map((item) => (
              <div key={item.status} className="flex justify-between">
                <span className="text-gray-600 capitalize">{item.status}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Party Size Distribution</h3>
          <div className="space-y-2">
            {data.partySizeDistribution.slice(0, 5).map((item) => (
              <div key={item.partySize} className="flex justify-between">
                <span className="text-gray-600">{item.partySize} people</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">Reservation Timeline ({period})</h3>
        <div className="space-y-2">
          {data.timeline.map((item) => (
            <div key={item.date} className="flex items-center justify-between">
              <span className="text-gray-600">{item.date}</span>
              <div className="flex items-center gap-4">
                <span className="font-semibold">{item.count} reservations</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(item.count / Math.max(...data.timeline.map(t => t.count))) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sales Report Component
function SalesReport({ data, period }: { data: SalesAnalytics; period: string }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Sales Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold">${data.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Orders</span>
              <span className="font-semibold">{data.totalOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Order Value</span>
              <span className="font-semibold">${data.avgOrderValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Order Sources</h3>
          <div className="space-y-2">
            {data.sourceDistribution.map((item) => (
              <div key={item.source} className="flex justify-between">
                <span className="text-gray-600 capitalize">{item.source}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Daily Average Revenue</span>
              <span className="font-semibold">
                ${(data.totalRevenue / data.revenueTimeline.length).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Daily Average Orders</span>
              <span className="font-semibold">
                {(data.totalOrders / data.orderCountTimeline.length).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Timeline ({period})</h3>
          <div className="space-y-2">
            {data.revenueTimeline.map((item) => (
              <div key={item.date} className="flex items-center justify-between">
                <span className="text-gray-600">{item.date}</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">${item.revenue.toFixed(2)}</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(item.revenue / Math.max(...data.revenueTimeline.map(t => t.revenue))) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Order Timeline ({period})</h3>
          <div className="space-y-2">
            {data.orderCountTimeline.map((item) => (
              <div key={item.date} className="flex items-center justify-between">
                <span className="text-gray-600">{item.date}</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{item.count} orders</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${(item.count / Math.max(...data.orderCountTimeline.map(t => t.count))) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Customer Report Component
function CustomerReport({ data }: { data: CustomerAnalytics }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Users</span>
              <span className="font-semibold">{data.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customers with Reservations</span>
              <span className="font-semibold">{data.customersWithReservations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Reservations per Customer</span>
              <span className="font-semibold">{data.avgReservationsPerCustomer.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">User Roles</h3>
          <div className="space-y-2">
            {data.roleDistribution.map((item) => (
              <div key={item.role} className="flex justify-between">
                <span className="text-gray-600 capitalize">{item.role}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Loyalty</h3>
          <div className="space-y-2">
            {data.loyaltyDistribution.map((item) => (
              <div key={item.category} className="flex justify-between">
                <span className="text-gray-600">{item.category}</span>
                <span className="font-semibold">{item.count} customers</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Menu Report Component
function MenuReport({ data }: { data: MenuPerformance }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Menu Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Menu Items</span>
              <span className="font-semibold">{data.totalMenuItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Menu Items</span>
              <span className="font-semibold">{data.activeMenuItems}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Category Performance</h3>
          <div className="space-y-2">
            {data.categoryPerformance.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <span className="text-gray-600">{item.category}</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">${item.revenue.toFixed(2)}</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{ width: `${(item.revenue / Math.max(...data.categoryPerformance.map(t => t.revenue))) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Quantity</th>
                <th className="text-right py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topItems.map((item) => (
                <tr key={item.itemId} className="border-b">
                  <td className="py-3">{item.name}</td>
                  <td className="text-right py-3">${item.price.toFixed(2)}</td>
                  <td className="text-right py-3">{item.quantity}</td>
                  <td className="text-right py-3 font-semibold">${item.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Shared Components
function MetricCard({ title, value, icon: Icon, color }: { 
  title: string; 
  value: string; 
  icon: any;
  color: string;
}) {
  const colorClasses: Record<string, string> = { // Add index signature
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}