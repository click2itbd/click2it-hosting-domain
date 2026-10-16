import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

export function AdminUserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, profile, isAdmin, isManager, isStaff } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to log out');
    }
  };

  let roleLabel = 'User';
  if (isAdmin) roleLabel = 'Administrator';
  else if (isManager) roleLabel = 'Manager';
  else if (isStaff) roleLabel = 'Staff';

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors focus:outline-none ring-2 ring-transparent focus:ring-blue-200"
        title="User Menu"
      >
        <User size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <p className="font-semibold text-gray-800 truncate">{profile?.name || user?.email?.split('@')[0] || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <div className="flex items-center gap-1 mt-2">
              <Shield size={12} className="text-blue-500" />
              <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">{roleLabel}</span>
            </div>
          </div>
          
          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
            >
              <Settings size={16} className="text-gray-400" />
              Profile Settings
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors text-left mt-1"
            >
              <LogOut size={16} className="text-red-500" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
