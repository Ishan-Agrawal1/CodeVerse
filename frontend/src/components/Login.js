import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

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
          <Card className="p-2 mb-4">
            <CardHeader className="text-center pb-0">
              <img
                src="/images/codeverse.png"
                alt="Logo"
                className="img-fluid mx-auto d-block"
                style={{ maxWidth: '150px' }}
              />
              <CardTitle className="mt-3 mb-2">Login to CodeVerse</CardTitle>
              <p className="mb-0" style={{ color: '#415A77' }}>Welcome back, continue your coding flow.</p>
            </CardHeader>

            <CardContent className="text-center pt-3">
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-3">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyUp={handleInputEnter}
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group mb-3">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handleInputEnter}
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-100"
                  disabled={isLoading}
                >
                  {isLoading ? <ShieldCheck size={18} /> : <LogIn size={18} />}
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>

              <div className="mt-3">
                <span style={{ color: '#1B263B' }}>
                  Don't have an account?{' '}
                  <Link to="/register" style={{ color: '#415A77', fontWeight: 700 }}>
                    <Mail size={14} className="me-1" />
                    Register here
                  </Link>
                </span>
              </div>

              <div className="mt-3">
                <Link to="/" style={{ color: '#415A77', fontWeight: 600 }}>
                  <ArrowLeft size={14} className="me-1" />
                  Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Login;
