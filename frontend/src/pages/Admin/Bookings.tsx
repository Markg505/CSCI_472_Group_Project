import { useEffect, useMemo, useState } from 'react';
import { apiClient, type Reservation } from '../../api/client';
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  LinkIcon,
  UserGroupIcon,
} from '@heroicons/react/20/solid';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';

const statusOptions = ['pending', 'confirmed', 'cancelled', 'no_show'] as const;

export default function Bookings() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const data = await apiClient.getReservations();
      setReservations(data);
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return reservations.filter(r => 
      r.startUtc.startsWith(today) && r.status !== 'cancelled'
    ).length;
  }, [reservations]);

  const handleStatusUpdate = async (reservationId: number, newStatus: string) => {
    try {
      await apiClient.updateReservationStatus(reservationId, newStatus);
      await loadReservations(); // Refresh the list
    } catch (error) {
      console.error('Error updating reservation status:', error);
      alert('Failed to update reservation status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportCSV = () => {
    const header = ['ID', 'Customer ID', 'Table ID', 'Start Time', 'End Time', 'Party Size', 'Status', 'Notes'];
    const lines = reservations.map(r => [
      r.reservationId,
      r.userId || 'N/A',
      r.tableId,
      formatDate(r.startUtc),
      formatDate(r.endUtc),
      r.partySize,
      r.status,
      (r.notes ?? '').replace(/,/g, ';') // Avoid CSV issues
    ].join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
    a.href = url;
    a.download = 'reservations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Reservations
          </h2>

          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <CalendarIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Today: {todayCount}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <UserGroupIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Total: {reservations.length}
            </div>
          </div>
        </div>

        <div className="mt-5 flex lg:mt-0 lg:ml-4">
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

          <span className="sm:ml-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <CheckIcon className="mr-1.5 -ml-0.5 size-5" />
              Print
            </button>
          </span>

          {/* Mobile dropdown */}
          <Menu as="div" className="relative ml-3 sm:hidden">
            <MenuButton className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              More
              <ChevronDownIcon className="-mr-1 ml-1.5 size-5 text-gray-400" />
            </MenuButton>
            <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={exportCSV}
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                  >
                    Export CSV
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading reservations...</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Table</th>
                <th className="px-3py-2">Time</th>
                <th className="px-3 py-2">Party Size</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reservations.map(reservation => (
                <tr key={reservation.reservationId} className="text-sm">
                  <td className="px-3 py-2">{reservation.reservationId}</td>
                  <td className="px-3 py-2">Guest {reservation.userId || 'N/A'}</td>
                  <td className="px-3 py-2">Table {reservation.tableId}</td>
                  <td className="px-3 py-2">
                    {formatDate(reservation.startUtc)}<br/>
                    to {formatDate(reservation.endUtc)}
                  </td>
                  <td className="px-3 py-2">{reservation.partySize}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {reservation.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{reservation.notes}</td>
                  <td className="px-3 py-2">
                    <select
                      value={reservation.status}
                      onChange={(e) => handleStatusUpdate(reservation.reservationId!, e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    No reservations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}