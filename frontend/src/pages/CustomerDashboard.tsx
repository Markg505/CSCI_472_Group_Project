import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { apiClient } from "../api/client";
import type { Order, Reservation, User } from "../api/client";

interface UserWithPhone extends User {
  phone?: string;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.userId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load user's orders
        const userOrders = await apiClient.getOrdersByUser(user.userId!);
        setOrders(userOrders);

        // Load user's reservations
        const userReservations = await apiClient.getReservationsForUser(user.userId!);
        setReservations(userReservations);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.userId]);

  if (loading) {
    return (
      <div className="container-xl py-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
          <p className="mt-4 text-mute">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xl py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gold mb-2">My Dashboard</h1>
          <p className="text-mute">Welcome back, {user?.fullName || "Guest"}!</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Profile Section */}
        <div className="mb-8 p-6 rounded-xl bg-card border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-mute mb-1">Full Name</p>
              <p className="text-fg">{user?.fullName || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-mute mb-1">Phone</p>
              <p className="text-fg">{(user as UserWithPhone)?.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-mute mb-1">Account Type</p>
              <p className="text-fg capitalize">{user?.role?.toLowerCase() || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            to="/menu"
            className="p-6 rounded-xl bg-card border border-white/10 hover:border-gold/50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">🍽️</div>
            <h3 className="font-semibold mb-1">Order Food</h3>
            <p className="text-sm text-mute">Browse our menu</p>
          </Link>
          <Link
            to="/reservations"
            className="p-6 rounded-xl bg-card border border-white/10 hover:border-gold/50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">📅</div>
            <h3 className="font-semibold mb-1">Make Reservation</h3>
            <p className="text-sm text-mute">Book a table</p>
          </Link>
          <Link
            to="/cart"
            className="p-6 rounded-xl bg-card border border-white/10 hover:border-gold/50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">🛒</div>
            <h3 className="font-semibold mb-1">View Cart</h3>
            <p className="text-sm text-mute">Complete your order</p>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            {orders.length > 3 && (
              <Link to="/orders" className="text-sm text-gold hover:underline">
                View all
              </Link>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-white/10 text-center">
              <p className="text-mute">No orders yet</p>
              <Link to="/menu" className="inline-block mt-4 text-gold hover:underline">
                Start ordering →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.orderId}
                  className="p-4 rounded-xl bg-card border border-white/10"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">Order #{order.orderId}</p>
                      <p className="text-sm text-mute">
                        {new Date(order.createdUtc || "").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gold">${order.total.toFixed(2)}</p>
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          order.status === "paid"
                            ? "bg-green-500/20 text-green-400"
                            : order.status === "placed"
                            ? "bg-blue-500/20 text-blue-400"
                            : order.status === "cancelled"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                  {order.orderItems && order.orderItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-sm text-mute">
                        {order.orderItems.length} item(s)
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Reservations */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Reservations</h2>
            {reservations.length > 3 && (
              <Link to="/reservations" className="text-sm text-gold hover:underline">
                View all
              </Link>
            )}
          </div>

          {reservations.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-white/10 text-center">
              <p className="text-mute">No reservations yet</p>
              <Link
                to="/reservations"
                className="inline-block mt-4 text-gold hover:underline"
              >
                Make a reservation →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.slice(0, 5).map((reservation) => (
                <div
                  key={reservation.reservationId}
                  className="p-4 rounded-xl bg-card border border-white/10"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">
                        Table for {reservation.partySize}
                      </p>
                      <p className="text-sm text-mute">
                        {new Date(reservation.startUtc).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {reservation.notes && (
                        <p className="text-sm text-mute mt-1">{reservation.notes}</p>
                      )}
                    </div>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        reservation.status === "confirmed"
                          ? "bg-green-500/20 text-green-400"
                          : reservation.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : reservation.status === "cancelled"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {reservation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
