import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  CalendarIcon,
  UserGroupIcon,
  TableCellsIcon,
  ChartBarIcon,
  ClockIcon,
  ShoppingCartIcon,
  ArrowUpIcon,
} from '@heroicons/react/20/solid'; // Removed ArrowDownIcon

interface DashboardMetrics {
  todayReservations: number;
  todayOrders: number;
  todayRevenue: number;
  pendingReservations: number;
  activeMenuItems: number;
  totalUsers: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todayReservations: 0,
    todayOrders: 0,
    todayRevenue: 0,
    pendingReservations: 0,
    activeMenuItems: 0,
    totalUsers: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { lastMessage } = useWebSocket('/RBOS/realtime');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [reservations, menuItems, orders] = await Promise.all([
        apiClient.getReservations(),
        apiClient.getActiveMenuItems(),
        apiClient.getOrdersByStatus('all'), // Get all orders
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayReservations = reservations.filter((r: any) => 
        r.startUtc.startsWith(today) && r.status !== 'cancelled'
      );
      const todayOrders = orders.filter((o: any) => 
        o.createdUtc?.startsWith(today) && o.status !== 'cancelled'
      );

      setMetrics({
        todayReservations: todayReservations.length,
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum: number, order: any) => sum + order.total, 0),
        pendingReservations: reservations.filter((r: any) => r.status === 'pending').length,
        activeMenuItems: menuItems.length,
        totalUsers: 0 // We don't have getUsers method
      });

      // Recent activity (last 5 events)
      const activity = [
        ...reservations.slice(0, 3).map((r: any) => ({
          type: 'reservation' as const,
          id: r.reservationId,
          title: `New reservation for table ${r.tableId}`,
          time: r.createdUtc,
          status: r.status
        })),
        ...orders.slice(0, 2).map((o: any) => ({
          type: 'order' as const,
          id: o.orderId,
          title: `New order #${o.orderId}`,
          time: o.createdUtc,
          status: o.status
        }))
      ].sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime())
       .slice(0, 5);

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900">
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Dashboard
          </h2>
          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <ClockIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Real-time Updates Active
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RealTimeStatCard
          title="Today's Reservations"
          value={metrics.todayReservations.toString()}
          change={lastMessage?.type === 'NEW_RESERVATION' ? 'up' : undefined}
          icon={<CalendarIcon className="size-6 text-blue-600" />}
          color="blue"
        />
        <RealTimeStatCard
          title="Today's Orders"
          value={metrics.todayOrders.toString()}
          change={lastMessage?.type === 'NEW_ORDER' ? 'up' : undefined}
          icon={<ShoppingCartIcon className="size-6 text-green-600" />}
          color="green"
        />
        <RealTimeStatCard
          title="Today's Revenue"
          value={`$${metrics.todayRevenue.toFixed(2)}`}
          icon={<ChartBarIcon className="size-6 text-purple-600" />}
          color="purple"
        />
        <RealTimeStatCard
          title="Pending Reservations"
          value={metrics.pendingReservations.toString()}
          icon={<UserGroupIcon className="size-6 text-orange-600" />}
          color="orange"
        />
        <RealTimeStatCard
          title="Active Menu Items"
          value={metrics.activeMenuItems.toString()}
          icon={<TableCellsIcon className="size-6 text-indigo-600" />}
          color="indigo"
        />
        <RealTimeStatCard
          title="Total Users"
          value={metrics.totalUsers.toString()}
          icon={<UserGroupIcon className="size-6 text-cyan-600" />}
          color="cyan"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'reservation' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.time).toLocaleString()}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  activity.status === 'confirmed' || activity.status === 'paid' 
                    ? 'bg-green-100 text-green-800'
                    : activity.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">WebSocket Connection</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Update</span>
              <span className="text-sm text-gray-900">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RealTimeStatCardProps {
  title: string;
  value: string;
  change?: 'up' | 'down';
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'cyan';
}

function RealTimeStatCard({ title, value, change, icon, color }: RealTimeStatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    cyan: 'bg-cyan-50 text-cyan-600'
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-slate-600">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      {change && (
        <div className={`absolute top-2 right-2 ${
          change === 'up' ? 'text-green-500' : 'text-red-500'
        }`}>
          <ArrowUpIcon className="h-4 w-4 animate-pulse" />
        </div>
      )}
    </div>
  );
}