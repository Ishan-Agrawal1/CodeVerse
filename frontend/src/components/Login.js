import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('All fields are required');
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      navigate('/');
    }
  };

  const handleInputEnter = (e) => {
    if (e.code === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row justify-content-center align-items-center min-vh-100">
        <div className="col-12 col-md-5">
          <div className="card shadow-sm p-2 mb-5 bg-secondary rounded">
            <div className="card-body text-center bg-dark">
              <img
                src="/images/codeverse.png"
                alt="Logo"
                className="img-fluid mx-auto d-block"
                style={{ maxWidth: '150px' }}
              />
              <h4 className="card-title text-light mt-3 mb-4">Login to CodeVerse</h4>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-3">
                  <input
                    type="email"
                    className="form-control mb-2"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyUp={handleInputEnter}
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group mb-3">
                  <input
                    type="password"
                    className="form-control mb-2"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handleInputEnter}
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-success btn-lg btn-block w-100"
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <div className="mt-3">
                <span className="text-light">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-success">
                    Register here
                  </Link>
                </span>
              </div>

              <div className="mt-3">
                <Link to="/" className="text-info">
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
