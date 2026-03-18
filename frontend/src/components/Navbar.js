import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
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
                <button className="btn btn-link nav-link" onClick={handleHome}>
                  <i className="bi bi-house-door me-1"></i>
                  Dashboard
                </button>
              </li>
            )}

            {!isAuthenticated && (
              <>
                <li className="nav-item">
                  <button className="btn btn-outline-light me-2" onClick={() => navigate('/login')}>
                    Login
                  </button>
                </li>
                <li className="nav-item">
                  <button className="btn btn-primary me-2" onClick={() => navigate('/register')}>
                    Sign Up
                  </button>
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
                    <i className="bi bi-person-circle me-1"></i>
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
                        <i className="bi bi-box-arrow-right me-2"></i>
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
