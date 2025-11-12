import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

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
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' };

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const newNotifications = [action.payload, ...state.notifications].slice(0, 50); // Keep last 50
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
  const [state, dispatch] = useReducer(notificationReducer, {
    notifications: [],
    unreadCount: 0
  });
  
  const { lastMessage } = useWebSocket('/RBOS/realtime');

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
  };

  // Handle WebSocket messages
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
              onClick: () => window.open('/admin/reservations', '_blank')
            }
          });
          break;
          
        case 'RESERVATION_UPDATED':
          addNotification({
            type: 'info',
            title: 'Reservation Updated',
            message: 'A reservation has been updated'
          });
          break;
          
        case 'NEW_ORDER':
          addNotification({
            type: 'success',
            title: 'New Order',
            message: 'A new order has been placed',
            action: {
              label: 'View',
              onClick: () => window.open('/admin/orders', '_blank')
            }
          });
          break;
          
        case 'ORDER_UPDATED':
          addNotification({
            type: 'info',
            title: 'Order Updated',
            message: 'An order status has been updated'
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