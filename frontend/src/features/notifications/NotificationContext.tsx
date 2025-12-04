import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

const BASE = (import.meta as any)?.env?.BASE_URL || '/';
const adminPath = (p: string) => `${BASE}admin/${p}`;
const STORAGE_KEY = 'rbos_notifications_v1';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

type NotificationAction = 
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'SET_STATE'; payload: NotificationState }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' };

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'ADD_NOTIFICATION': {
      const newNotifications = [action.payload, ...state.notifications].slice(0, 50);
      const unreadCount = newNotifications.filter(n => !n.read).length;
      return { notifications: newNotifications, unreadCount };
    }
    
    case 'MARK_AS_READ': {
      const newNotifications = state.notifications.map(notification =>
        notification.id === action.payload ? { ...notification, read: true } : notification
      );
      const unreadCount = newNotifications.filter(n => !n.read).length;
      return { notifications: newNotifications, unreadCount };
    }
    
    case 'MARK_ALL_AS_READ': {
      const newNotifications = state.notifications.map(notification => ({ ...notification, read: true }));
      return { notifications: newNotifications, unreadCount: 0 };
    }
    
    case 'REMOVE_NOTIFICATION': {
      const newNotifications = state.notifications.filter(n => n.id !== action.payload);
      const unreadCount = newNotifications.filter(n => !n.read).length;
      return { notifications: newNotifications, unreadCount };
    }
    
    case 'CLEAR_ALL': 
      return { notifications: [], unreadCount: 0 };
    
    default:
      return state;
  }
};

interface NotificationContextType {
  state: NotificationState;
  dispatch: React.Dispatch<NotificationAction>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadStored = (): NotificationState => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { notifications: [], unreadCount: 0 };
      const parsed = JSON.parse(raw) as { notifications: any[]; unreadCount: number };
      const notifications = (parsed.notifications || []).map(n => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }));
      const unreadCount = notifications.filter(n => !n.read).length;
      return { notifications, unreadCount };
    } catch {
      return { notifications: [], unreadCount: 0 };
    }
  };

  const [state, dispatch] = useReducer(notificationReducer, loadStored());
  useEffect(() => {
    try {
      const serialized = JSON.stringify({
        notifications: state.notifications.map(n => ({
          ...n,
          timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp,
        })),
        unreadCount: state.unreadCount,
      });
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
    }
  }, [state]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as { notifications: any[]; unreadCount: number };
          const notifications = (parsed.notifications || []).map(n => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }));
          dispatch({ type: 'SET_STATE', payload: { notifications, unreadCount: notifications.filter(n => !n.read).length } });
        } catch {
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const { lastMessage } = useWebSocket();

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
  };

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'NEW_RESERVATION':
          addNotification({
            type: 'info',
            title: 'New Reservation',
            message: 'A new reservation has been created',
            action: {
              label: 'View',
              onClick: () => { window.location.assign(adminPath('bookings')); }
            }
          });
          break;
          
        case 'RESERVATION_UPDATED':
          addNotification({
            type: 'info',
            title: 'Reservation Updated',
            message: 'A reservation has been updated',
            action: {
              label: 'View',
              onClick: () => { window.location.assign(adminPath('bookings')); }
            }
          });
          break;
          
        case 'NEW_ORDER':
          addNotification({
            type: 'success',
            title: 'New Order',
            message: 'A new order has been placed',
            action: {
              label: 'View',
              onClick: () => { window.location.assign(adminPath('orders')); }
            }
          });
          break;
          
        case 'ORDER_UPDATED':
          addNotification({
            type: 'info',
            title: 'Order Updated',
            message: 'An order status has been updated',
            action: {
              label: 'View',
              onClick: () => { window.location.assign(adminPath('orders')); }
            }
          });
          break;
          
        default:
          console.log('Unknown WebSocket message type:', lastMessage.type);
      }
    }
  }, [lastMessage]);

  return (
    <NotificationContext.Provider value={{ state, dispatch, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
