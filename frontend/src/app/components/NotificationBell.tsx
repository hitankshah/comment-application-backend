'use client';
import { useState, useEffect } from 'react';
import useSocket from '../hooks/useSocket';
import { useAuth } from '../contexts/AuthContext';
import { Socket } from 'socket.io-client';

type Notification = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: 'reply' | 'mention';
  commentId?: string;
  parentContent?: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useSocket('/notifications'); // Add the correct namespace here
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !socket) return;

    // Listen for new notifications
    socket.on('notification', (notification: Notification) => {
      // Optimistically add the notification
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(count => count + 1);
    });

    // Fetch existing notifications
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.read).length);
      });

    return () => {
      socket.off('notification');
    };
  }, [socket, isAuthenticated]);

  const markAsRead = async (notificationId: string) => {
    // Optimistically update UI
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(count => Math.max(0, count - 1));

    // Make API call
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
    } catch (error) {
      // Revert on error
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: false } : n
        )
      );
      setUnreadCount(count => count + 1);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    
    // Optimistically update UI
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);

    // Make API call
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
    } catch (error) {
      // Revert on error
      setNotifications(prev =>
        prev.map(n => {
          const wasUnread = unreadNotifications.find(un => un.id === n.id);
          return wasUnread ? { ...n, read: false } : n;
        })
      );
      setUnreadCount(unreadNotifications.length);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-500 focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    // Navigate to the comment if there's a commentId
                    if (notification.commentId) {
                      window.location.href = `/comments#${notification.commentId}`;
                    }
                  }}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {notification.message}
                      </p>
                      {notification.parentContent && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {notification.parentContent}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
