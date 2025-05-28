'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import AdminNavbar from '@/components/admin/AdminNavbar';
import InventoryPanel from '@/components/admin/InventoryPanel';
import UsageChart from '@/components/admin/UsageChart';
import AccessLogsPanel from '@/components/admin/AccessLogsPanel';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { isAuthenticated, accessLevel, logout } = useAuth();
  const router = useRouter();
  const [inventory, setInventory] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/lock');
    } else if (accessLevel !== 'admin') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, accessLevel, router]);
  
  // Fetch inventory data
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/inventory');
        const data = await response.json();
        
        if (data.success) {
          setInventory(data.data);
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
      }
    };
    
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/admin/logs?limit=5');
        const data = await response.json();
        
        if (data.success) {
          setAccessLogs(data.data);
        }
      } catch (error) {
        console.error('Error fetching access logs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated && accessLevel === 'admin') {
      fetchInventory();
      fetchLogs();
    }
  }, [isAuthenticated, accessLevel]);
  
  if (!isAuthenticated || accessLevel !== 'admin') {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex space-x-2">
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              User Dashboard
            </Link>
            <button 
              onClick={logout}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inventory Section */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              Inventory Status
            </h2>
            <InventoryPanel inventory={inventory} />
          </div>
          
          {/* Usage Stats Section */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              Usage Trends
            </h2>
            <UsageChart />
          </div>
          
          {/* Recent Access Logs */}
          <div className="bg-white p-5 rounded-lg shadow md:col-span-2">
            <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-.257-.257A6 6 0 1118 8zm-6-4a1 1 0 10-2 0v1a1 1 0 102 0V4zm7 0a1 1 0 10-2 0v1a1 1 0 102 0V4z" clipRule="evenodd" />
              </svg>
              Recent Access Logs
            </h2>
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-pink-500 border-r-2 border-b-2 border-gray-200"></div>
                <p className="mt-2 text-sm text-gray-500">Loading logs...</p>
              </div>
            ) : (
              <AccessLogsPanel logs={accessLogs} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
