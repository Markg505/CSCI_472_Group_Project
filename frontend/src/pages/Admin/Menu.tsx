import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { ImageUploadComponent } from '../../components/admin/ImageUploadComponent';
import {
  PlusIcon,
  LinkIcon,
  TagIcon,
} from '@heroicons/react/20/solid';
import type { MenuItem } from '../../lib/adminApi';

const FALLBACK_IMG = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

type MenuItemType = {
  itemId: string;
  name: string;
  price: number;
  active: boolean;
  description: string;
  category: string;
  imageUrl: string;
  dietaryTags: string;
};

interface EditModalProps {
  item: MenuItemType;
  onClose: () => void;
  onUpdate: (updatedItem: MenuItemType) => void;
}

function EditModal({ item, onClose, onUpdate }: EditModalProps) {
  const [form, setForm] = useState({
    name: item.name,
    price: item.price.toString(),
    active: item.active,
    description: item.description,
    category: item.category,
    dietaryTags: item.dietaryTags
  });
  const [imageUrl, setImageUrl] = useState(item.imageUrl);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updatedItem: MenuItemType = {
        ...item,
        name: form.name,
        price: parseFloat(form.price),
        active: form.active,
        description: form.description,
        category: form.category,
        dietaryTags: form.dietaryTags,
        imageUrl: imageUrl
      };

      await apiClient.updateMenuItem(updatedItem);
      onUpdate(updatedItem);
      onClose();
    } catch (error) {
      console.error('Error updating menu item:', error);
      alert('Failed to update menu item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Edit Menu Item</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Image
              </label>
              <ImageUploadComponent
                itemId={item.itemId}
                currentImageUrl={imageUrl}
                onImageUpdated={setImageUrl}
              />
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select Category</option>
                <option value="Pizza">Pizza</option>
                <option value="Salad">Salad</option>
                <option value="Pasta">Pasta</option>
                <option value="Main">Main Course</option>
                <option value="Side">Side</option>
                <option value="Dessert">Dessert</option>
                <option value="Beverage">Beverage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Describe the menu item..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Tags (JSON array)
              </label>
              <input
                type="text"
                value={form.dietaryTags}
                onChange={(e) => setForm(prev => ({ ...prev, dietaryTags: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder='["veg", "gf"]'
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter as JSON array: ["veg", "gf", "spicy"]
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MenuAdmin() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [form, setForm] = useState({
    itemId: '',
    name: '',
    price: '',
    active: true,
    imageUrl: '',
    dietaryTags: '',
    description: '',
    category: ''
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
        itemId: form.itemId,
        name: form.name,
        price: parseFloat(form.price),
        active: form.active,
        imageUrl: form.imageUrl,
        dietaryTags: form.dietaryTags,
        description: form.description,
        category: form.category
      });
      await loadMenuItems();
      setForm({ itemId: '', name: '', price: '', active: true, imageUrl: '', dietaryTags: '', description: '', category: ''});
      setShowAdd(false);
    } catch (error) {
      console.error('Error creating menu item:', error);
      alert('Failed to create menu item');
    }
  };

   const handleUpdateItem = (updatedItem: MenuItemType) => {
    setMenuItems(prev => prev.map(item => 
      item.itemId === updatedItem.itemId ? updatedItem : item
    ));
  };

    const handleEdit = (item: MenuItemType) => {
    setEditingItem(item);
  };

  const handleToggleActive = async (itemId: string, currentActive: boolean) => {
    try {
      // Find the existing menu item to preserve all its data
      const existingItem = menuItems.find(item => item.itemId === itemId);
      if (!existingItem) {
        console.error('Menu item not found');
        return;
      }
    
      // Create updated item with all original data, just toggling active status
      const updatedItem: MenuItem = {
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select Category</option>
                <option value="Pizza">Pizza</option>
                <option value="Salad">Salad</option>
                <option value="Pasta">Pasta</option>
                <option value="Main">Main Course</option>
                <option value="Side">Side</option>
                <option value="Dessert">Dessert</option>
                <option value="Beverage">Beverage</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Describe the menu item..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Tags (JSON array)</label>
            <input
              type="text"
              value={form.dietaryTags}
              onChange={(e) => setForm(prev => ({ ...prev, dietaryTags: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder='["veg", "gf"]'
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter as JSON array: ["veg", "gf", "spicy"]
            </p>
          </div>

          <div className="flex items-center justify-between">
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
                <th className="px-3 py-2">Image</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {menuItems.map(item => (
                <tr key={item.itemId} className="text-sm hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMG;
                          }}
                        />
                      ) : (
                        <div className="text-gray-400 text-xs text-center">No image</div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{item.itemId}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {item.category || 'Uncategorized'}
                    </span>
                  </td>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        Edit
                      </button>
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
                    </div>
                  </td>
                </tr>
              ))}
              {menuItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No menu items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={handleUpdateItem}
        />
      )}

    </div>
  );
}