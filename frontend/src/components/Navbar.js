import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DoorOpen, Home, LogOut, UserCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleHome = () => {
    navigate('/');
  };

  const isHome = location.pathname === '/';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800/50 bg-[#0D1B2A]/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-[1600px] mx-auto">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleHome}>
          <img
            src="/images/codeverse.png"
            alt="Codeverse Logo"
            className="h-8 object-contain"
          />
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {!isHome && (
            <button 
              onClick={handleHome}
              className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              <Home size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}

          {!isAuthenticated && (
            <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4 border-l border-slate-700 pl-2 sm:pl-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-slate-300 hover:text-white hover:bg-slate-800/50">
                <DoorOpen size={16} className="mr-2 hidden sm:block" />
                Login
              </Button>
              <Button variant="default" size="sm" onClick={() => navigate('/register')} className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(8,145,178,0.2)]">
                <UserCircle2 size={16} className="mr-2 hidden sm:block" />
                Sign Up
              </Button>
            </div>
          )}

          {isAuthenticated && (
            <div className="flex items-center gap-3 sm:gap-4 ml-2 sm:ml-4 border-l border-slate-700 pl-2 sm:pl-4">
              <div className="flex items-center gap-2 text-sm text-slate-300 hidden sm:flex">
                <UserCircle2 size={16} className="text-slate-400" />
                <span className="opacity-75">Hey,</span>
                <span className="font-semibold text-white truncate max-w-[120px]">{user?.username || 'User'}</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all shadow-sm"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
