'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    commentsCount: 0,
    notificationsCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get user's comment count
        const commentsResponse = await api.get('/comments/user');
        
        // Get notifications count
        const notificationsResponse = await api.get('/notifications');
        
        setStats({
          commentsCount: commentsResponse.data.length || 0,
          notificationsCount: notificationsResponse.data.length || 0,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Welcome, {user?.email}!</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Your Activity</h2>
          <div className="mt-4 flex flex-col space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-md">
              <div>
                <p className="text-sm font-medium text-blue-700">Comments</p>
                <p className="text-sm text-blue-500">You have posted comments</p>
              </div>
              <div className="text-xl font-bold text-blue-700">{stats.commentsCount}</div>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-md">
              <div>
                <p className="text-sm font-medium text-green-700">Notifications</p>
                <p className="text-sm text-green-500">Recent activity notifications</p>
              </div>
              <div className="text-xl font-bold text-green-700">{stats.notificationsCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 flex flex-col space-y-2">
            <a href="/dashboard/comments" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              View Comments
            </a>
            <button 
              onClick={() => window.location.href = '/dashboard/comments'}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
              Create New Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}