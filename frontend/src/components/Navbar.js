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
    <nav className="navbar navbar-expand-lg shadow-sm" style={{ background: 'rgba(13, 27, 42, 0.9)', backdropFilter: 'blur(8px)' }}>
      <div className="container-fluid">
        <img
          src="/images/codeverse.png"
          alt="Logo"
          className="img-fluid mx-auto d-block"
          style={{ maxWidth: '100px' }}
        />
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {!isHome && (
              <li className="nav-item">
                <button className="btn btn-link nav-link d-flex align-items-center gap-1 text-light" onClick={handleHome}>
                  <Home size={16} />
                  Dashboard
                </button>
              </li>
            )}

            {!isAuthenticated && (
              <>
                <li className="nav-item">
                  <Button className="me-2" variant="ghost" size="md" onClick={() => navigate('/login')}>
                    <DoorOpen size={16} />
                    Login
                  </Button>
                </li>
                <li className="nav-item">
                  <Button className="me-2" variant="secondary" size="md" onClick={() => navigate('/register')}>
                    <UserCircle2 size={16} />
                    Sign Up
                  </Button>
                </li>
              </>
            )}

            {isAuthenticated && (
              <>
                <li className="nav-item d-flex align-items-center text-white px-2">
                  <small className="opacity-75">Signed in as</small>
                  <strong className="ms-2">{user?.username || 'User'}</strong>
                </li>
                <li className="nav-item dropdown">
                  <button
                    className="btn btn-link nav-link dropdown-toggle text-white"
                    id="userDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <UserCircle2 size={16} className="me-1" />
                    Account
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li>
                      <span className="dropdown-item-text">
                        <small className="text-muted">{user?.email}</small>
                      </span>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item" onClick={handleLogout}>
                        <LogOut size={15} className="me-2" />
                        Logout
                      </button>
                    </li>
                  </ul>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
