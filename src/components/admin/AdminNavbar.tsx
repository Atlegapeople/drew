'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';

export default function AdminNavbar() {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100';
  };
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin" className="font-bold text-xl text-[#ff66c4]">
                D.R.E.W. Admin
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin')}`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/inventory"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin/inventory')}`}
              >
                Inventory
              </Link>
              <Link
                href="/admin/reports"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin/reports')}`}
              >
                Reports
              </Link>
              <Link
                href="/admin/users"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin/users')}`}
              >
                User Management
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3 py-2 mr-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              User View
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
