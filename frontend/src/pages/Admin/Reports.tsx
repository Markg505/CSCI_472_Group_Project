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

type TimePeriod = 'week' | 'month' | 'quarter' | 'custom';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reservations' | 'sales' | 'customers' | 'menu'>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [reservationAnalytics, setReservationAnalytics] = useState<ReservationAnalytics | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null);
  const [menuPerformance, setMenuPerformance] = useState<MenuPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
  }, [activeTab, timePeriod, startDate, endDate]);

  // Auto-apply date range for presets; leave editable for custom
  useEffect(() => {
    if (timePeriod === 'custom') return;
    const { start, end } = deriveRange(timePeriod);
    setStartDate(start);
    setEndDate(end);
  }, [timePeriod]);

  const refreshActive = () => {
    if (activeTab === 'reservations') loadReservationAnalytics();
    else if (activeTab === 'sales') loadSalesAnalytics();
    else if (activeTab === 'customers') loadCustomerAnalytics();
    else if (activeTab === 'menu') loadMenuPerformance();
    else loadOverviewData();
  };

  const loadOverviewData = async () => {
    try {
      const [metricsData] = await Promise.all([
        apiClient.getDashboardMetrics()
      ]);
      if (metricsData && (metricsData.totalOrders || metricsData.totalReservations)) {
        setMetrics(metricsData);
      } else {
        const [ordersHistory, reservationsHistory, users] = await Promise.all([
          apiClient.getOrderHistory({ pageSize: 200 }),
          apiClient.getReservationHistory({ pageSize: 200 }),
          (apiClient as any).listUsers ? (apiClient as any).listUsers() : Promise.resolve([])
        ]);
        const computed = computeOverviewMetrics(ordersHistory.items || [], reservationsHistory.items || [], Array.isArray(users) ? users : []);
        setMetrics(computed);
      }
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReservationAnalytics = async () => {
    try {
      const period = timePeriod === 'custom' ? 'week' : timePeriod;
      const data = await apiClient.getReservationAnalytics(period);
      if (data && (data.totalReservations || data.timeline?.length)) {
        setReservationAnalytics(data);
        return;
      }
      // Fallback: compute from reservation history
      const history = await apiClient.getReservationHistory({
        pageSize: 100,
      });
      const computed = computeReservationAnalytics(history.items);
      setReservationAnalytics(computed);
    } catch (error) {
      console.error('Error loading reservation analytics:', error);
    }
  };

  const loadSalesAnalytics = async () => {
    try {
      const period = timePeriod === 'custom' ? 'week' : timePeriod;
      const data = await apiClient.getSalesAnalytics(period);
      if (data && (data.totalOrders || data.revenueTimeline?.length)) {
        setSalesAnalytics(data);
        return;
      }
      // Fallback: compute from order history
      const ordersHistory = await apiClient.getOrderHistory({
        pageSize: 200,
      });
      const computed = computeSalesAnalytics(ordersHistory.items);
      setSalesAnalytics(computed);
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
        <div className="mt-5 flex lg:mt-0 lg:ml-4 gap-3 flex-wrap">
          {timePeriod === 'custom' && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  aria-label="Start date"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  aria-label="End date"
                />
              </div>
              <span className="text-xs text-gray-500">Pick a custom start and end date.</span>
            </div>
          )}
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="custom">Custom range</option>
          </select>
          <button
            onClick={refreshActive}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Refresh
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
          <ReservationReport 
            data={reservationAnalytics} 
            period={timePeriod} 
          />
        )}
        {activeTab === 'sales' && salesAnalytics && (
          <SalesReport 
            data={salesAnalytics} 
            period={timePeriod} 
          />
        )}
        {activeTab === 'customers' && customerAnalytics && (
          <CustomerReport 
            data={customerAnalytics} 
          />
        )}
        {activeTab === 'menu' && menuPerformance && (
          <MenuReport 
            data={menuPerformance} 
          />
        )}
      </div>
    </div>
  );
}

// Overview Report Component
function OverviewReport({ metrics }: { metrics: ReportMetrics }) {
  const exportMetrics = () => {
    let csv = "Metric,Value\n";
    csv += `Today's Revenue,${metrics.todayRevenue}\n`;
    csv += `Today's Reservations,${metrics.todayReservations}\n`;
    csv += `Today's Orders,${metrics.todayOrders}\n`;
    csv += `Pending Reservations,${metrics.pendingReservations}\n`;
    csv += `Total Reservations,${metrics.totalReservations}\n`;
    csv += `Total Orders,${metrics.totalOrders}\n`;
    csv += `Total Customers,${metrics.totalCustomers}\n`;
    downloadCsv("overview-metrics.csv", csv);
  };
  const exportTotals = () => {
    let csv = "Total Reservations,Total Orders,Total Customers\n";
    csv += `${metrics.totalReservations},${metrics.totalOrders},${metrics.totalCustomers}\n`;
    downloadCsv("overview-totals.csv", csv);
  };
  const exportInsights = () => {
    let csv = "Insight,Value\n";
    csv += `Reservations today,${metrics.todayReservations}\n`;
    csv += `Revenue today,${metrics.todayRevenue}\n`;
    csv += `Pending reservations,${metrics.pendingReservations}\n`;
    csv += `Orders today,${metrics.todayOrders}\n`;
    downloadCsv("overview-insights.csv", csv);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Total Summary</h3>
            <button onClick={exportTotals} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quick Insights</h3>
            <button onClick={exportInsights} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
          </div>
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const filteredStatus = statusFilter === 'all'
    ? data.statusDistribution
    : data.statusDistribution.filter(item => item.status === statusFilter);
  const filteredParty = partyFilter === 'all'
    ? data.partySizeDistribution
    : data.partySizeDistribution.filter(item => {
        if (partyFilter === '1-2') return item.partySize <= 2;
        if (partyFilter === '3-4') return item.partySize >= 3 && item.partySize <= 4;
        return item.partySize >= 5;
      });
  const filteredTimeline = data.timeline;
  const maxCount = filteredTimeline.length ? Math.max(...filteredTimeline.map(t => t.count)) : 0;
  const exportSummary = () => {
    let csv = "Metric,Value\n";
    csv += `Total Reservations,${data.totalReservations}\n`;
    csv += `Average Party Size,${data.avgPartySize}\n`;
    downloadCsv(`reservations-summary-${period}.csv`, csv);
  };
  const exportStatus = () => {
    let csv = "Status,Count\n";
    filteredStatus.forEach(item => {
      csv += `${item.status},${item.count}\n`;
    });
    downloadCsv(`reservations-status-${period}.csv`, csv);
  };
  const exportParty = () => {
    let csv = "Party Size,Count\n";
    filteredParty.forEach(item => {
      csv += `${item.partySize},${item.count}\n`;
    });
    downloadCsv(`reservations-party-${period}.csv`, csv);
  };
  const exportSection = () => {
    let csv = "Date,Reservations\n";
    filteredTimeline.forEach(item => {
      csv += `${item.date},${item.count}\n`;
    });
    downloadCsv(`reservations-${period}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Reservation Summary</h3>
            <button onClick={exportSummary} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Status Distribution</h3>
            <button onClick={exportStatus} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
          </div>
          <div className="mb-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div className="space-y-2">
            {filteredStatus.map((item) => (
              <div key={item.status} className="flex justify-between">
                <span className="text-gray-600 capitalize">{item.status}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Party Size Distribution</h3>
            <button onClick={exportParty} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
          </div>
          <div className="mb-3">
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter by party size"
            >
              <option value="all">All party sizes</option>
              <option value="1-2">1-2</option>
              <option value="3-4">3-4</option>
              <option value="5+">5+</option>
            </select>
          </div>
          <div className="space-y-2">
            {filteredParty.slice(0, 5).map((item) => (
              <div key={item.partySize} className="flex justify-between">
                <span className="text-gray-600">{item.partySize} people</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Reservation Timeline ({period})</h3>
            <button onClick={exportSection} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
              Export CSV
            </button>
          </div>
          <div className="space-y-2">
            {filteredTimeline.map((item) => (
              <div key={item.date} className="flex items-center justify-between">
                <span className="text-gray-600">{item.date}</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{item.count} reservations</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${maxCount ? (item.count / maxCount) * 100 : 0}%` }}
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
  const [summarySource, setSummarySource] = useState('all');
  const [sourcesSource, setSourcesSource] = useState('all');
  const [revenueSource, setRevenueSource] = useState('all');
  const [ordersSource, setOrdersSource] = useState('all');

  const filterBySource = (timeline: Array<{ date: string; revenue?: number; count?: number }>, source: string, sourceDistribution: any[]) => {
    if (source === 'all') return timeline;
    const sourceDates = new Set(
      sourceDistribution.filter(s => s.source === source).map(s => s.date).filter(Boolean)
    );
    // if no per-date info, return full timeline
    if (!sourceDates.size) return timeline;
    return timeline.filter(t => sourceDates.has(t.date));
  };

  const filteredSources = sourcesSource === 'all'
    ? data.sourceDistribution
    : data.sourceDistribution.filter(item => item.source === sourcesSource);

  const filteredRevenue = filterBySource(data.revenueTimeline, revenueSource, data.sourceDistribution);
  const filteredOrders = filterBySource(data.orderCountTimeline, ordersSource, data.sourceDistribution);

  const maxRevenue = filteredRevenue.length ? Math.max(...filteredRevenue.map(t => t.revenue ?? 0)) : 0;
  const maxOrders = filteredOrders.length ? Math.max(...filteredOrders.map(t => t.count ?? 0)) : 0;

  const summaryTotals = (() => {
    if (summarySource === 'all' || !data.sourceTotals?.length) {
      return { revenue: data.totalRevenue, orders: data.totalOrders };
    }
    const match = data.sourceTotals.find(s => s.source === summarySource);
    if (!match) return { revenue: 0, orders: 0 };
    return { revenue: match.revenue, orders: match.count };
  })();
  const exportRevenue = () => {
    let csv = "Date,Revenue\n";
    filteredRevenue.forEach(item => {
      csv += `${item.date},${item.revenue}\n`;
    });
    downloadCsv(`sales-revenue-${period}.csv`, csv);
  };
  const exportSummary = () => {
    let csv = "Metric,Value\n";
    csv += `Total Revenue,${data.totalRevenue}\n`;
    csv += `Total Orders,${data.totalOrders}\n`;
    csv += `Average Order Value,${data.avgOrderValue}\n`;
    downloadCsv(`sales-summary-${period}.csv`, csv);
  };
  const exportSources = () => {
    let csv = "Source,Count\n";
    filteredSources.forEach(item => {
      csv += `${item.source},${item.count}\n`;
    });
    downloadCsv(`sales-sources-${period}.csv`, csv);
  };
  const exportPerformance = () => {
    let csv = "Metric,Value\n";
    const revDays = data.revenueTimeline.length || 1;
    const ordDays = data.orderCountTimeline.length || 1;
    csv += `Daily Average Revenue,${(data.totalRevenue / revDays).toFixed(2)}\n`;
    csv += `Daily Average Orders,${(data.totalOrders / ordDays).toFixed(1)}\n`;
    downloadCsv(`sales-performance-${period}.csv`, csv);
  };
  const exportOrders = () => {
    let csv = "Date,Orders\n";
    filteredOrders.forEach(item => {
      csv += `${item.date},${item.count}\n`;
    });
    downloadCsv(`sales-orders-${period}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sales Summary</h3>
            <div className="flex items-center gap-2">
              <select
                value={summarySource}
                onChange={(e) => setSummarySource(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                aria-label="Filter summary by source"
              >
                <option value="all">All sources</option>
                <option value="web">Web</option>
                <option value="phone">Phone</option>
                <option value="walkin">Walk-in</option>
              </select>
              <button onClick={exportSummary} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold">${summaryTotals.revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Orders</span>
              <span className="font-semibold">{summaryTotals.orders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Order Value</span>
              <span className="font-semibold">
                ${summaryTotals.orders ? (summaryTotals.revenue / summaryTotals.orders).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Order Sources</h3>
            <div className="flex items-center gap-2">
              <select
                value={sourcesSource}
                onChange={(e) => setSourcesSource(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                aria-label="Filter sources"
              >
                <option value="all">All</option>
                <option value="web">Web</option>
                <option value="phone">Phone</option>
                <option value="walkin">Walk-in</option>
              </select>
              <button onClick={exportSources} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
            </div>
          </div>
          <div className="space-y-2">
            {filteredSources.map((item) => (
              <div key={item.source} className="flex justify-between">
                <span className="text-gray-600 capitalize">{item.source}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Performance Metrics</h3>
            <button onClick={exportPerformance} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Daily Average Revenue</span>
              <span className="font-semibold">
                ${(data.totalRevenue / (filteredRevenue.length || 1)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Daily Average Orders</span>
              <span className="font-semibold">
                {(data.totalOrders / (filteredOrders.length || 1)).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Revenue Timeline ({period})</h3>
            <button onClick={exportRevenue} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
              Export CSV
            </button>
          </div>
          <div className="mb-3">
            <select
              value={revenueSource}
              onChange={(e) => setRevenueSource(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
              aria-label="Filter revenue by source"
            >
              <option value="all">All sources</option>
              <option value="web">Web</option>
              <option value="phone">Phone</option>
              <option value="walkin">Walk-in</option>
            </select>
          </div>
          <div className="space-y-2">
            {filteredRevenue.map((item) => (
              <div key={item.date} className="flex items-center justify-between">
                <span className="text-gray-600">{item.date}</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">${(item.revenue ?? 0).toFixed(2)}</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${maxRevenue ? ((item.revenue ?? 0) / maxRevenue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Order Timeline ({period})</h3>
            <button onClick={exportOrders} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
              Export CSV
            </button>
          </div>
          <div className="mb-3">
            <select
              value={ordersSource}
              onChange={(e) => setOrdersSource(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
              aria-label="Filter orders by source"
            >
              <option value="all">All sources</option>
              <option value="web">Web</option>
              <option value="phone">Phone</option>
              <option value="walkin">Walk-in</option>
            </select>
          </div>
          <div className="space-y-2">
            {filteredOrders.map((item) => (
              <div key={item.date} className="flex items-center justify-between">
                <span className="text-gray-600">{item.date}</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{item.count ?? 0} orders</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${maxOrders ? ((item.count ?? 0) / maxOrders) * 100 : 0}%` }}
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
  const [roleFilter, setRoleFilter] = useState('all');
  const [loyaltyFilter, setLoyaltyFilter] = useState('all');
  const filteredRoles = roleFilter === 'all' ? data.roleDistribution : data.roleDistribution.filter(r => r.role === roleFilter);
  const filteredLoyalty = loyaltyFilter === 'all' ? data.loyaltyDistribution : data.loyaltyDistribution.filter(l => l.category === loyaltyFilter);
  const exportSummary = () => {
    let csv = "Metric,Value\n";
    csv += `Total Users,${data.totalUsers}\n`;
    csv += `Customers with Reservations,${data.customersWithReservations}\n`;
    csv += `Avg Reservations per Customer,${data.avgReservationsPerCustomer}\n`;
    downloadCsv("customers-summary.csv", csv);
  };
  const exportRoles = () => {
    let csv = "Role,Count\n";
    filteredRoles.forEach(item => {
      csv += `${item.role},${item.count}\n`;
    });
    downloadCsv("customers-roles.csv", csv);
  };
  const exportLoyalty = () => {
    let csv = "Loyalty,Count\n";
    filteredLoyalty.forEach(item => {
      csv += `${item.category},${item.count}\n`;
    });
    downloadCsv("customers-loyalty.csv", csv);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Customer Summary</h3>
            <button onClick={exportSummary} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">User Roles</h3>
            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                aria-label="Filter by role"
              >
                <option value="all">All roles</option>
                <option value="customer">Customer</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={exportRoles} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
            </div>
          </div>
          <div className="space-y-2">
            {filteredRoles.map((item) => (
              <div key={item.role} className="flex justify-between">
                <span className="text-gray-600 capitalize">{item.role}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Customer Loyalty</h3>
            <div className="flex items-center gap-2">
              <select
                value={loyaltyFilter}
                onChange={(e) => setLoyaltyFilter(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                aria-label="Filter by loyalty"
              >
                <option value="all">All loyalty</option>
                {data.loyaltyDistribution.map(item => (
                  <option key={item.category} value={item.category}>{item.category}</option>
                ))}
              </select>
              <button onClick={exportLoyalty} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
            </div>
          </div>
          <div className="space-y-2">
            {filteredLoyalty.map((item) => (
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [menuCategoryMap, setMenuCategoryMap] = useState<Record<string, string>>({});
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const categoryRevenue: Record<string, number> = {};
  data.topItems.forEach((t) => {
    const cat = (t.category ?? menuCategoryMap[t.itemId] ?? 'Other');
    categoryRevenue[cat] = (categoryRevenue[cat] || 0) + t.revenue;
  });
  // Fill missing from API categoryPerformance as fallback
  data.categoryPerformance.forEach((c) => {
    if (categoryRevenue[c.category] === undefined) {
      categoryRevenue[c.category] = c.revenue;
    }
  });

  useEffect(() => {
    (async () => {
      try {
        const menuItems = await (apiClient as any).getMenuItems?.();
        if (Array.isArray(menuItems)) {
          const cats = menuItems
            .map((m: any) => m.category)
            .filter(Boolean)
            .map((c: string) => c.trim());
          const map: Record<string, string> = {};
          menuItems.forEach((m: any) => {
            if (m.itemId && m.category) {
              map[m.itemId] = m.category;
            }
          });
          setMenuCategoryMap(map);
          setAllCategories(Array.from(new Set(cats)).sort());
          return;
        }
      } catch {
        // ignore and fallback to analytics
      }
      const fallback = Array.from(new Set([
        ...data.categoryPerformance.map(c => c.category),
        ...data.topItems.map(t => t.category ?? 'Other')
      ])).sort();
      setAllCategories(fallback);
    })();
  }, [data]);

  const categoryOptions = allCategories.length
    ? allCategories
    : Array.from(new Set([
        ...data.categoryPerformance.map(c => c.category),
        ...data.topItems.map(t => t.category ?? 'Other')
      ])).sort();
  const normalizedSelected = selectedCategory.toLowerCase();
  const displayCategories = selectedCategory === 'all'
    ? categoryOptions.map(cat => ({
        category: cat,
        revenue: categoryRevenue[cat] ?? 0
      }))
    : [{
        category: selectedCategory,
        revenue: categoryRevenue[selectedCategory] ?? 0
      }];
  const filteredTopItems = selectedCategory === 'all'
    ? data.topItems
    : data.topItems.filter(t => {
        const cat = (t.category ?? menuCategoryMap[t.itemId] ?? 'Other').toLowerCase();
        return cat === normalizedSelected;
      });
  const maxCategoryRevenue = displayCategories.length ? Math.max(...displayCategories.map(t => t.revenue)) : 0;
  const exportSummary = () => {
    let csv = "Metric,Value\n";
    csv += `Total Menu Items,${data.totalMenuItems}\n`;
    csv += `Active Menu Items,${data.activeMenuItems}\n`;
    downloadCsv("menu-summary.csv", csv);
  };
  const exportCategories = () => {
    let csv = "Category,Revenue\n";
    displayCategories.forEach(item => {
      csv += `${item.category},${item.revenue}\n`;
    });
    downloadCsv("menu-categories.csv", csv);
  };
  const exportTopItems = () => {
    let csv = "Item,Price,Quantity,Revenue\n";
    filteredTopItems.forEach(item => {
      csv += `${item.name},${item.price},${item.quantity},${item.revenue}\n`;
    });
    downloadCsv("menu-top-items.csv", csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categoryOptions.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Menu Summary</h3>
            <button onClick={exportSummary} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Category Performance</h3>
            <button onClick={exportCategories} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
          </div>
          <div className="space-y-2">
            {displayCategories.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <span className="text-gray-600">{item.category}</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">${item.revenue.toFixed(2)}</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{ width: `${maxCategoryRevenue ? (item.revenue / maxCategoryRevenue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Top Performing Items</h3>
          <button onClick={exportTopItems} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Export CSV</button>
        </div>
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
              {filteredTopItems.map((item) => (
                <tr key={item.itemId} className="border-b">
                  <td className="py-3">{item.name}</td>
                  <td className="text-right py-3">${item.price.toFixed(2)}</td>
                  <td className="text-right py-3">{item.quantity}</td>
                  <td className="text-right py-3 font-semibold">${item.revenue.toFixed(2)}</td>
                </tr>
              ))}
              {filteredTopItems.length === 0 && (
                <tr>
                  <td className="py-3 text-center text-gray-500" colSpan={4}>No top items for this category.</td>
                </tr>
              )}
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
    <div />
  );
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function deriveRange(period: TimePeriod) {
  if (period === 'custom') {
    return { start: '', end: '' };
  }
  const end = new Date();
  const endStr = end.toISOString().split('T')[0];
  const days = period === 'week' ? 6 : period === 'month' ? 29 : 89;
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().split('T')[0];
  return { start: startStr, end: endStr };
}

function resolveRange(startDate: string, endDate: string, period: TimePeriod) {
  if (period === 'custom' && startDate && endDate) {
    return { start: startDate, end: endDate };
  }
  return deriveRange(period);
}

function computeReservationAnalytics(items: any[]): ReservationAnalytics {
  const timelineMap: Record<string, number> = {};
  const statusMap: Record<string, number> = {};
  const partyMap: Record<number, number> = {};
  let total = 0;
  let partyTotal = 0;
  let partyCount = 0;
  items.forEach(r => {
    if (!r.startUtc) return;
    const date = r.startUtc.split('T')[0];
    timelineMap[date] = (timelineMap[date] || 0) + 1;
    statusMap[r.status || 'unknown'] = (statusMap[r.status || 'unknown'] || 0) + 1;
    partyMap[r.partySize] = (partyMap[r.partySize] || 0) + 1;
    total += 1;
    if (r.partySize) {
      partyTotal += r.partySize;
      partyCount += 1;
    }
  });

  const timeline = Object.entries(timelineMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
  const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
  const partySizeDistribution = Object.entries(partyMap).map(([partySize, count]) => ({ partySize: Number(partySize), count }));

  return {
    timeline,
    statusDistribution,
    partySizeDistribution,
    totalReservations: total,
    avgPartySize: partyCount ? partyTotal / partyCount : 0,
  };
}

function computeSalesAnalytics(items: any[]): SalesAnalytics {
  const revenueMap: Record<string, number> = {};
  const ordersMap: Record<string, number> = {};
  const sourceMap: Record<string, number> = {};
  const sourceRevenueMap: Record<string, number> = {};
  let totalRevenue = 0;
  let totalOrders = 0;

  items.forEach(o => {
    if (!o.createdUtc) return;
    if (o.status === 'cancelled') return;
    const date = o.createdUtc.split('T')[0];
    revenueMap[date] = (revenueMap[date] || 0) + (o.total || 0);
    ordersMap[date] = (ordersMap[date] || 0) + 1;
    sourceMap[o.source || 'unknown'] = (sourceMap[o.source || 'unknown'] || 0) + 1;
    sourceRevenueMap[o.source || 'unknown'] = (sourceRevenueMap[o.source || 'unknown'] || 0) + (o.total || 0);
    totalRevenue += o.total || 0;
    totalOrders += 1;
  });

  const revenueTimeline = Object.entries(revenueMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date, revenue }));
  const orderCountTimeline = Object.entries(ordersMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
  const sourceDistribution = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));
  const sourceTotals = Object.entries(sourceRevenueMap).map(([source, revenue]) => ({ source, revenue, count: sourceMap[source] || 0 }));

  return {
    revenueTimeline,
    orderCountTimeline,
    sourceDistribution,
    sourceTotals,
    totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
  };
}

function computeOverviewMetrics(orders: any[], reservations: any[], users: any[]): ReportMetrics {
  const today = new Date().toISOString().split('T')[0];
  const todaysOrders = orders.filter(o => o.createdUtc?.startsWith(today) && o.status !== 'cancelled');
  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const todaysReservations = reservations.filter(r => r.startUtc?.startsWith(today) && r.status !== 'cancelled');
  const pendingReservations = reservations.filter(r => r.status === 'pending').length;

  return {
    todayReservations: todaysReservations.length,
    pendingReservations,
    todayRevenue: todaysRevenue,
    todayOrders: todaysOrders.length,
    totalCustomers: users.length,
    totalReservations: reservations.length,
    totalOrders: orders.length,
  };
}
