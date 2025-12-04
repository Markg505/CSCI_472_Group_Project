import { useEffect, useMemo, useState } from 'react';
import { apiClient, type Order, type HistoryResult } from '../../api/client';
import {
  LinkIcon,
  EyeIcon,
  CalendarIcon,
} from '@heroicons/react/20/solid';
import AuditLogButton from '../../components/AuditLogButton';

const statusOptions = ['cart', 'placed', 'paid', 'cancelled'] as const;

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [historyMeta, setHistoryMeta] = useState<HistoryResult<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderForm, setNewOrderForm] = useState({
    userId: '',
    source: 'web',
    status: 'placed',
    itemId: '',
    qty: 1,
    price: 0
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuItems, setMenuItems] = useState<Array<{ itemId: string; name: string; price: number }>>([]);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  useEffect(() => {
    (async () => {
      try {
        const items: any = await (apiClient as any).getMenuItems?.();
        if (items && Array.isArray(items) && items.length) {
          const mapped = items.map((m: any) => ({ itemId: m.itemId, name: m.name, price: m.price ?? 0 }));
          setMenuItems(mapped);
          setNewOrderForm(f => ({ ...f, itemId: mapped[0].itemId, price: mapped[0].price }));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await apiClient.getOrderHistory({
        status: statusFilter === 'all' ? undefined : statusFilter,
        pageSize: 50,
      });
      setOrders(data.items);
      setHistoryMeta(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      await loadOrders(); // Refresh the list
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const totalRevenue = useMemo(() => 
    orders
      .filter(order => order.status === 'paid')
      .reduce((sum, order) => sum + order.total, 0),
    [orders]
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const exportCSV = () => {
    const header = ['ID', 'Customer', 'Status', 'Source', 'Subtotal', 'Tax', 'Total', 'Created'];
    const lines = orders.map(order => [
      order.orderId,
      order.userId || 'Guest',
      order.status,
      order.source,
      order.subtotal.toFixed(2),
      order.tax.toFixed(2),
      order.total.toFixed(2),
      formatDate(order.createdUtc)
    ].join(','));
    
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Order Management
          </h2>
            <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <CalendarIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
                Total Orders: {orders.length}
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="mr-2 inline-block size-2 rounded-full bg-green-500" />
                Revenue: ${totalRevenue.toFixed(2)}
              </div>
              {historyMeta && (
                <div className="mt-2 text-sm text-gray-500">
                  Retention: {historyMeta.retentionMonths} months (records start {historyMeta.retentionHorizon})
                </div>
              )}
            </div>
          </div>
        
        <div className="mt-5 flex lg:mt-0 lg:ml-4">
          <button
            type="button"
            onClick={() => {
              const cleaned = {
                ...newOrderForm,
                qty: Math.max(1, Number(newOrderForm.qty) || 1),
                price: Math.max(0, Number(newOrderForm.price) || 0)
              };
              if (!cleaned.itemId) {
                alert('Item ID required');
                return;
              }
              apiClient.createOrder({
                userId: cleaned.userId || undefined,
                source: cleaned.source as any,
                status: cleaned.status as any,
                subtotal: cleaned.qty * cleaned.price,
                tax: cleaned.qty * cleaned.price * 0.08,
                total: cleaned.qty * cleaned.price * 1.08,
                orderItems: [{
                  itemId: cleaned.itemId,
                  qty: cleaned.qty,
                  unitPrice: cleaned.price,
                  lineTotal: cleaned.qty * cleaned.price
                }]
              }).then(loadOrders).catch((e) => {
                console.error(e);
                alert('Failed to create order');
              });
            }}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            Quick Add Order
          </button>
          <select
            value={newOrderForm.itemId}
            onChange={(e) => {
              const chosen = menuItems.find(mi => mi.itemId === e.target.value);
              setNewOrderForm(prev => ({ ...prev, itemId: e.target.value, price: chosen?.price ?? prev.price }));
            }}
            className="ml-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {menuItems.map(mi => (
              <option key={mi.itemId} value={mi.itemId}>{mi.name} (${mi.price.toFixed(2)})</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={newOrderForm.qty}
            onChange={(e) => setNewOrderForm(prev => ({ ...prev, qty: Number(e.target.value) }))}
            className="ml-2 w-20 rounded-md border border-gray-300 px-2 py-2 text-sm"
            aria-label="Quantity"
          />
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <span className="hidden sm:block ml-3">
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <LinkIcon className="mr-1.5 -ml-0.5 size-5 text-gray-400" />
              Export CSV
            </button>
          </span>
          <span className="hidden sm:block ml-3">
            <AuditLogButton entityType="order" label="View Change Log" />
          </span>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading orders...</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map(order => (
                <tr key={order.orderId} className="text-sm">
                  <td className="px-3 py-2 font-mono">#{order.orderId}</td>
                  <td className="px-3 py-2">Guest {order.userId || 'N/A'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === 'paid' ? 'bg-green-100 text-green-800' :
                      order.status === 'placed' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 capitalize">{order.source}</td>
                  <td className="px-3 py-2 font-medium">${order.total.toFixed(2)}</td>
                  <td className="px-3 py-2">{formatDate(order.createdUtc)}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <EyeIcon className="size-5" />
                    </button>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.orderId!, e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Order #{selectedOrder.orderId}</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Customer</label>
                    <p>Guest {selectedOrder.userId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p>{selectedOrder.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Source</label>
                    <p>{selectedOrder.source}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total</label>
                    <p>${selectedOrder.total.toFixed(2)}</p>
                  </div>
                </div>

                {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Order Items</h4>
                    <div className="space-y-2">
                      {selectedOrder.orderItems.map(item => (
                        <div key={item.orderItemId} className="flex justify-between border-b pb-2">
                          <div>
                            <p className="font-medium">Item #{item.itemId}</p>
                            <p className="text-sm text-gray-600">Qty: {item.qty} × ${item.unitPrice.toFixed(2)}</p>
                          </div>
                          <p className="font-medium">${item.lineTotal.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
