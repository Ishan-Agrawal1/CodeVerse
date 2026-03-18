import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MailPlus, ShieldPlus, UserPlus2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !email || !password || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const result = await register(username, email, password);
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
              <CardTitle className="mt-3 mb-2">Register for CodeVerse</CardTitle>
              <p className="mb-0" style={{ color: '#415A77' }}>Create your account and start collaborating.</p>
            </CardHeader>

            <CardContent className="text-center pt-3">
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-3">
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyUp={handleInputEnter}
                    disabled={isLoading}
                  />
                </div>

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

                <div className="form-group mb-3">
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyUp={handleInputEnter}
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  className="w-100"
                  disabled={isLoading}
                >
                  {isLoading ? <ShieldPlus size={18} /> : <UserPlus2 size={18} />}
                  {isLoading ? 'Registering...' : 'Register'}
                </Button>
              </form>

              <div className="mt-3">
                <span style={{ color: '#1B263B' }}>
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: '#415A77', fontWeight: 700 }}>
                    <MailPlus size={14} className="me-1" />
                    Login here
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

export default Register;
