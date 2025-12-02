import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../features/notifications/NotificationContext';
import { BellIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function NotificationBell() {
  const { state, dispatch } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = (id: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: id });
  };

  const markAllAsRead = () => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const safeAction = (e: React.MouseEvent, fn: () => void) => {
    e.stopPropagation();
    fn();
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
      >
        <BellIcon className="h-6 w-6" />
        {state.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {state.unreadCount > 9 ? '9+' : state.unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && createPortal(
        <div className="fixed right-4 top-16 w-80 origin-top-right rounded-md bg-white shadow-xl ring-2 ring-black/10 focus:outline-none z-[200000] drop-shadow-2xl"
             onMouseDown={(e) => e.stopPropagation()}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              <div className="flex gap-2">
                {state.unreadCount > 0 && (
                  <button
                    onClick={(e) => safeAction(e, markAllAsRead)}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {state.notifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No notifications
                </p>
              ) : (
                <div className="space-y-3">
                  {state.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${
                        notification.read 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-white border-indigo-100 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${
                              notification.type === 'success' ? 'bg-green-500' :
                              notification.type === 'warning' ? 'bg-yellow-500' :
                              notification.type === 'error' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`} />
                            <h4 className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatTime(notification.timestamp)}
                            </span>
                            <div className="flex gap-2">
                              {notification.action && notification.action.onClick && (
                                <button
                                  onClick={(e) => safeAction(e, () => notification.action?.onClick?.())}
                                  className="text-xs text-indigo-600 hover:text-indigo-500"
                                >
                                  {notification.action.label}
                                </button>
                              )}
                              {!notification.read && (
                                <button
                                  onClick={(e) => safeAction(e, () => markAsRead(notification.id))}
                                  className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => safeAction(e, () => removeNotification(notification.id))}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
