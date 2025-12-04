import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { apiClient } from "../api/client";
import type { Order, Reservation, User, HistoryResult } from "../api/client";

interface UserWithPhoneAndAvatar extends User {
  phone?: string;
  profileImageUrl?: string;
}

export default function CustomerDashboard() {
  const { user, updateProfile, changePassword } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orderHistoryMeta, setOrderHistoryMeta] = useState<HistoryResult<Order> | null>(null);
  const [reservationHistoryMeta, setReservationHistoryMeta] = useState<HistoryResult<Reservation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: (user as UserWithPhoneAndAvatar)?.phone ?? "",
    profileImageUrl: (user as UserWithPhoneAndAvatar)?.profileImageUrl ?? "",
    address: user?.address ?? "",
    address2: user?.address2 ?? "",
    city: user?.city ?? "",
    state: user?.state ?? "",
    postalCode: user?.postalCode ?? "",
  });
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [orderFilters, setOrderFilters] = useState({
    status: "",
    startUtc: "",
    endUtc: "",
    page: 1,
    pageSize: 5,
  });
  const [reservationFilters, setReservationFilters] = useState({
    status: "",
    startUtc: "",
    endUtc: "",
    page: 1,
    pageSize: 5,
  });
  useEffect(() => {
    setProfileForm({
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      phone: (user as UserWithPhoneAndAvatar)?.phone ?? "",
      profileImageUrl: (user as UserWithPhoneAndAvatar)?.profileImageUrl ?? "",
      address: user?.address ?? "",
      address2: user?.address2 ?? "",
      city: user?.city ?? "",
      state: user?.state ?? "",
      postalCode: user?.postalCode ?? "",
    });
  }, [user?.fullName, user?.email, (user as UserWithPhoneAndAvatar)?.phone, (user as UserWithPhoneAndAvatar)?.profileImageUrl,
      user?.address, user?.address2, user?.city, user?.state, user?.postalCode]);

  useEffect(() => {
    if (!user?.userId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load user's orders
        const userOrders = await apiClient.getOrderHistory({
          userId: user.userId!,
          status: orderFilters.status || undefined,
          startUtc: orderFilters.startUtc || undefined,
          endUtc: orderFilters.endUtc || undefined,
          page: orderFilters.page,
          pageSize: orderFilters.pageSize,
        });
        setOrders(userOrders.items);
        setOrderHistoryMeta(userOrders);

        // Load user's reservations
        const userReservations = await apiClient.getReservationHistory({
          userId: user.userId!,
          status: reservationFilters.status || undefined,
          startUtc: reservationFilters.startUtc || undefined,
          endUtc: reservationFilters.endUtc || undefined,
          page: reservationFilters.page,
          pageSize: reservationFilters.pageSize,
        });
        const startFilter = reservationFilters.startUtc ? new Date(reservationFilters.startUtc).getTime() : null;
        const endFilter = reservationFilters.endUtc ? new Date(reservationFilters.endUtc).getTime() : null;
        const filteredItems = userReservations.items.filter((r) => {
          const start = new Date(r.startUtc).getTime();
          if (startFilter !== null && start < startFilter) return false;
          if (endFilter !== null && start > endFilter) return false;
          return true;
        });
        setReservations(filteredItems);
        setReservationHistoryMeta(userReservations);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    user?.userId,
    orderFilters.page,
    orderFilters.pageSize,
    orderFilters.status,
    orderFilters.startUtc,
    orderFilters.endUtc,
    reservationFilters.page,
    reservationFilters.pageSize,
    reservationFilters.status,
    reservationFilters.startUtc,
    reservationFilters.endUtc,
  ]);

  const totalOrderPages = orderHistoryMeta ? Math.max(1, Math.ceil(orderHistoryMeta.total / orderHistoryMeta.pageSize)) : 1;
  const totalReservationPages = reservationHistoryMeta
    ? Math.max(1, Math.ceil(reservationHistoryMeta.total / reservationHistoryMeta.pageSize))
    : 1;

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    // Note: In a real app, you'd upload the file and get back a URL
    setProfileForm(p => ({ ...p, profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" }));
  }

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileStatus(null);

    if (!profileForm.fullName.trim() || !profileForm.email.trim()) {
      setProfileError("Full name and email are required.");
      return;
    }
    if (!profileForm.address.trim() || !profileForm.city.trim() || !profileForm.state.trim() || !profileForm.postalCode.trim()) {
      setProfileError("Address, city, state, and postal code are required.");
      return;
    }

    try {
      // NOTE: The backend doesn't currently support file uploads, so we're
      // only sending the URL. A real implementation would require a separate
      // file upload step.
      await updateProfile({
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        profileImageUrl: profileForm.profileImageUrl,
        address: profileForm.address.trim(),
        address2: profileForm.address2.trim(),
        city: profileForm.city.trim(),
        state: profileForm.state.trim(),
        postalCode: profileForm.postalCode.trim(),
      });
      setProfileStatus("Profile updated successfully.");
      setPreview(null); // Clear preview after successful submission
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Unable to update profile.");
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    setPasswordError(null);

    if (!passwordForm.currentPassword.trim()) {
      setPasswordError("Current password is required.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordStatus("Password updated successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Unable to update password.");
    }
  };

  const onOrderStatusChange = (status: string) => {
    setOrderFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const onOrderDateChange = (field: "startUtc" | "endUtc", value: string) => {
    const utcValue = value
      ? new Date(`${value}T${field === "endUtc" ? "23:59:59.999" : "00:00:00"}`).toISOString()
      : "";
    setOrderFilters((prev) => ({ ...prev, [field]: utcValue, page: 1 }));
  };

  const onReservationStatusChange = (status: string) => {
    setReservationFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const onReservationDateChange = (field: "startUtc" | "endUtc", value: string) => {
    const utcValue = value
      ? new Date(`${value}T${field === "endUtc" ? "23:59:59.999" : "00:00:00"}`).toISOString()
      : "";

    setReservationFilters((prev) => {
      let nextStart = field === "startUtc" ? utcValue : prev.startUtc;
      let nextEnd = field === "endUtc" ? utcValue : prev.endUtc;

      // Keep the range valid: if start is after end, align them
      if (nextStart && nextEnd && new Date(nextStart) > new Date(nextEnd)) {
        if (field === "startUtc") {
          nextEnd = nextStart;
        } else {
          nextStart = nextEnd;
        }
      } else if (field === "startUtc" && nextStart && (!nextEnd || new Date(nextEnd) < new Date(nextStart))) {
        // If user picks a start date with no end (or an earlier end), set end to start to keep range valid
        nextEnd = nextStart;
      }

      return { ...prev, startUtc: nextStart, endUtc: nextEnd, page: 1 };
    });
  };

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
          {profileError && (
            <div className="mb-3 p-3 rounded bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {profileError}
            </div>
          )}
          {profileStatus && (
            <div className="mb-3 p-3 rounded bg-green-500/10 border border-green-500/30 text-sm text-green-300">
              {profileStatus}
            </div>
          )}
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="flex items-center gap-x-4">
               <img
                  src={preview || user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                  alt="Current avatar"
                  className="size-16 rounded-full bg-surface object-cover"
              />
              <label className="rounded-md bg-gold/10 px-3 py-2 text-sm font-semibold text-gold shadow-xs inset-ring inset-ring-gold/20 hover:bg-gold/20 cursor-pointer">
                Change
                <input id="photo" name="photo" type="file" accept="image/*" onChange={onAvatarChange} className="sr-only" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm text-mute">
                Full Name
                <input
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-mute">
                Email
                <input
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-mute">
                Phone
                <input
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-mute">
                Address
                <input
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-mute">
                Address 2 (Optional)
                <input
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                  value={profileForm.address2}
                  onChange={(e) => setProfileForm((p) => ({ ...p, address2: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-mute">
                City
                <input
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-mute">
                State
                <input
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                  value={profileForm.state}
                  onChange={(e) => setProfileForm((p) => ({ ...p, state: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-mute">
                Postal Code
                <input
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                  value={profileForm.postalCode}
                  onChange={(e) => setProfileForm((p) => ({ ...p, postalCode: e.target.value }))}
                />
              </label>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-mute">Account Type</p>
                <p className="text-fg capitalize">{user?.role?.toLowerCase() || "N/A"}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded bg-gold text-black font-semibold hover:bg-amber-300 transition"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>

        <div className="mb-8 p-6 rounded-xl bg-card border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Password</h2>
          {passwordError && (
            <div className="mb-3 p-3 rounded bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {passwordError}
            </div>
          )}
          {passwordStatus && (
            <div className="mb-3 p-3 rounded bg-green-500/10 border border-green-500/30 text-sm text-green-300">
              {passwordStatus}
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1 text-sm text-mute">
              Current Password
              <input
                type="password"
                className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-mute">
              New Password
              <input
                type="password"
                className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-mute">
              Confirm Password
              <input
                type="password"
                className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </label>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded bg-gold text-black font-semibold hover:bg-amber-300 transition"
              >
                Update Password
              </button>
            </div>
          </form>
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-2">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <label className="flex items-center gap-1">
                Start date:
                <input
                  type="date"
                  className="rounded bg-surface border border-white/10 px-2 py-1 text-fg"
                  value={orderFilters.startUtc ? orderFilters.startUtc.slice(0, 10) : ""}
                  onChange={(e) => onOrderDateChange("startUtc", e.target.value)}
                  aria-label="Order start date filter"
                />
              </label>
              <label className="flex items-center gap-1">
                End date:
                <input
                  type="date"
                  className="rounded bg-surface border border-white/10 px-2 py-1 text-fg"
                  value={orderFilters.endUtc ? orderFilters.endUtc.slice(0, 10) : ""}
                  onChange={(e) => onOrderDateChange("endUtc", e.target.value)}
                  aria-label="Order end date filter"
                />
              </label>
              <label className="flex items-center gap-1">
                Status:
                <select
                  className="rounded bg-surface border border-white/10 px-2 py-1 text-fg"
                  value={orderFilters.status}
                  onChange={(e) => onOrderStatusChange(e.target.value)}
                  aria-label="Order status filter"
                >
                  <option value="">All</option>
                  <option value="placed">Placed</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                Page size:
                <select
                  className="rounded bg-surface border border-white/10 px-2 py-1 text-fg"
                  value={orderFilters.pageSize}
                  onChange={(e) =>
                    setOrderFilters((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))
                  }
                >
                  {[5, 10, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 rounded border border-white/10 text-xs"
                  onClick={() => setOrderFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={orderFilters.page <= 1}
                >
                  Previous
                </button>
                <span className="text-mute text-xs">
                  Page {orderHistoryMeta?.page ?? 1} of {totalOrderPages}
                </span>
                <button
                  className="px-2 py-1 rounded border border-white/10 text-xs"
                  onClick={() =>
                    setOrderFilters((prev) => ({
                      ...prev,
                      page: Math.min(totalOrderPages, prev.page + 1),
                    }))
                  }
                  disabled={orderFilters.page >= totalOrderPages}
                >
                  Next
                </button>
              </div>
              {orders.length > 3 && (
                <Link to="/orders" className="text-sm text-gold hover:underline">
                  View all
                </Link>
              )}
            </div>
            <p className="text-xs text-mute">
              Use status or date filters to narrow your history; changing filters resets to page 1.
            </p>
          </div>
          {orderHistoryMeta && (
            <p className="text-xs text-mute mb-2">
              Showing up to {orderHistoryMeta.pageSize} results. Retained for {orderHistoryMeta.retentionMonths} months (records start {orderHistoryMeta.retentionHorizon}).
            </p>
          )}

          {orders.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-white/10 text-center">
              <p className="text-mute">No orders yet</p>
              <Link to="/menu" className="inline-block mt-4 text-gold hover:underline">
                Start ordering →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-2">
            <h2 className="text-xl font-semibold">Reservations</h2>
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <label className="flex items-center gap-1">
                Start date:
                <input
                  type="date"
                  className="rounded bg-surface border border-white/10 px-2 py-1 text-fg"
                  value={reservationFilters.startUtc ? reservationFilters.startUtc.slice(0, 10) : ""}
                  onChange={(e) => onReservationDateChange("startUtc", e.target.value)}
                  aria-label="Reservation start date filter"
                />
              </label>
              <label className="flex items-center gap-1">
                End date:
                <input
                  type="date"
                  className="rounded bg-surface border border-white/10 px-2 py-1 text-fg"
                  value={reservationFilters.endUtc ? reservationFilters.endUtc.slice(0, 10) : ""}
                  onChange={(e) => onReservationDateChange("endUtc", e.target.value)}
                  aria-label="Reservation end date filter"
                />
              </label>
              <label className="flex items-center gap-1">
                Status:
                <select
                  className="rounded bg-surface border border-white/10 px-2 py-1 text-fg"
                  value={reservationFilters.status}
                  onChange={(e) => onReservationStatusChange(e.target.value)}
                  aria-label="Reservation status filter"
                >
                  <option value="">All</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                Page size:
                <select
                  className="rounded bg-surface border border-white/10 px-2 py-1 text-fg"
                  value={reservationFilters.pageSize}
                  onChange={(e) =>
                    setReservationFilters((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))
                  }
                >
                  {[5, 10, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 rounded border border-white/10 text-xs"
                  onClick={() =>
                    setReservationFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={reservationFilters.page <= 1}
                >
                  Previous
                </button>
                <span className="text-mute text-xs">
                  Page {reservationHistoryMeta?.page ?? 1} of {totalReservationPages}
                </span>
                <button
                  className="px-2 py-1 rounded border border-white/10 text-xs"
                  onClick={() =>
                    setReservationFilters((prev) => ({
                      ...prev,
                      page: Math.min(totalReservationPages, prev.page + 1),
                    }))
                  }
                  disabled={reservationFilters.page >= totalReservationPages}
                >
                  Next
                </button>
              </div>
              <p className="text-xs text-mute">Date and status filters mirror orders and reset pagination when adjusted.</p>
              {reservations.length > 3 && (
                <Link to="/reservations" className="text-sm text-gold hover:underline">
                  View all
                </Link>
              )}
            </div>
          </div>
          {reservationHistoryMeta && (
            <p className="text-xs text-mute mb-2">
              Showing up to {reservationHistoryMeta.pageSize} results. Retained for {reservationHistoryMeta.retentionMonths} months (records start {reservationHistoryMeta.retentionHorizon}).
            </p>
          )}

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
              {reservations.map((reservation) => (
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
