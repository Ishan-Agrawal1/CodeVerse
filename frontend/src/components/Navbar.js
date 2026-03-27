import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DoorOpen, LayoutDashboard, UserCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  const handleDashboard = () => {
    navigate(isAuthenticated ? '/dashboard' : '/login');
  };

  const isDashboard = location.pathname === '/dashboard';

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
          {!isDashboard && (
            <button 
              onClick={handleDashboard}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all"
              title="Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="sr-only">Dashboard</span>
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
              <button 
                onClick={handleLogout} 
                className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-slate-700/50 text-xs font-bold text-slate-300 tracking-wider uppercase rounded-sm transition-all"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
