'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { NotificationBell } from '../components/NotificationBell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Comment System Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">{user?.email}</span>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:border-red-700 focus:shadow-outline-red active:bg-red-700 transition ease-in-out duration-150"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Side navigation */}
      <div className="flex">
        <aside className="w-64 bg-white shadow h-screen fixed">
          <nav className="mt-5 px-2">
            <Link href="/dashboard" className="group flex items-center px-2 py-2 text-base leading-6 font-medium rounded-md text-gray-900 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition ease-in-out duration-150">
              Dashboard
            </Link>
            <Link href="/dashboard/comments" className="mt-1 group flex items-center px-2 py-2 text-base leading-6 font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition ease-in-out duration-150">
              Comments
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}