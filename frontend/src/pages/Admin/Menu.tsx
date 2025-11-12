import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import {
  PlusIcon,
  LinkIcon,
  TagIcon,
} from '@heroicons/react/20/solid';


type MenuItemType = {
  itemId: number;
  name: string;
  price: number;
  active: boolean;
};

export default function MenuAdmin() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    price: '',
    active: true,
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const data = await apiClient.getMenuItems();
      setMenuItems(data);
    } catch (error) {
      console.error('Error loading menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = useMemo(() => 
    menuItems.filter(item => item.active).length, 
    [menuItems]
  );

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createMenuItem({
        name: form.name,
        price: parseFloat(form.price),
        active: form.active,
      });
      await loadMenuItems();
      setForm({ name: '', price: '', active: true });
      setShowAdd(false);
    } catch (error) {
      console.error('Error creating menu item:', error);
      alert('Failed to create menu item');
    }
  };

  const handleToggleActive = async (itemId: number, currentActive: boolean) => {
    try {
      // Find the existing menu item to preserve all its data
      const existingItem = menuItems.find(item => item.itemId === itemId);
      if (!existingItem) {
        console.error('Menu item not found');
        return;
      }
    
      // Create updated item with all original data, just toggling active status
      const updatedItem = {
        ...existingItem,
        active: !currentActive
      };
    
      await apiClient.updateMenuItem(updatedItem);
      await loadMenuItems();
    } catch (error) {
      console.error('Error updating menu item:', error);
      alert('Failed to update menu item');
    }
  };

  const exportCSV = () => {
    const header = ['ID', 'Name', 'Price', 'Active'];
    const lines = menuItems.map(item => [
      item.itemId,
      item.name,
      item.price.toFixed(2),
      item.active ? 'Yes' : 'No'
    ].join(','));
    
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Menu Management
          </h2>

          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <TagIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Total Items: {menuItems.length}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-2 inline-block size-2 rounded-full bg-green-500" />
              Active: {activeCount}
            </div>
          </div>
        </div>

        <div className="mt-5 flex lg:mt-0 lg:ml-4">
          <span className="hidden sm:block">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <PlusIcon className="mr-1.5 -ml-0.5 size-5 text-gray-400" />
              New Item
            </button>
          </span>

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
        </div>
      </div>

      {/* Add Item Form */}
      {showAdd && (
        <form onSubmit={handleAddItem} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Add New Menu Item</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Item name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.price}
                onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Menu Items Table */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading menu items...</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {menuItems.map(item => (
                <tr key={item.itemId} className="text-sm">
                  <td className="px-3 py-2">{item.itemId}</td>
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2">${item.price.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                  <button
                    onClick={() => handleToggleActive(item.itemId, item.active)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      item.active
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {item.active ? 'Deactivate' : 'Activate'}
                  </button>
                  </td>
                </tr>
              ))}
              {menuItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    No menu items found.
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