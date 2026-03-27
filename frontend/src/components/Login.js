import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogIn, Mail, ShieldCheck } from 'lucide-react';
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
      navigate('/dashboard');
    }
  };

  const handleInputEnter = (e) => {
    if (e.code === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1117] flex flex-col relative overflow-hidden font-sans text-slate-300">
      
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Navigation */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-[#12151E] rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
             <img src="/images/logo.png" alt="Codeverse Icon" className="w-full h-full object-contain" />
           </div>
           <span className="text-xl font-bold tracking-tight text-white">Codeverse</span>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors group px-4 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>
      </div>

      {/* Main Login Card Container */}
      <div className="flex-1 flex items-center justify-center p-4 z-10 my-8">
        <div className="w-full max-w-[440px] bg-[#12151E] rounded-2xl border border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-8 py-10 sm:px-10">
          
          <div className="flex justify-center mb-6">
            <img src="/images/codeverse.png" alt="Codeverse Logo" className="h-10 object-contain" />
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-wide">Login to Codeverse</h1>
            <p className="text-sm text-slate-500">Welcome back, continue your coding flow.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyUp={handleInputEnter}
                  disabled={isLoading}
                  placeholder="architect@codeverse.io"
                  className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                <Link to="#" className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300">Forgot?</Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <ShieldCheck className="w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleInputEnter}
                  disabled={isLoading}
                  placeholder="••••••••"
                  className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-[#384b64] hover:bg-[#435976] text-white rounded-xl py-3.5 px-4 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-[#485f7d]/50"
            >
              {isLoading ? 'Authenticating...' : 'Login'}
              {!isLoading && <LogIn size={16} />}
            </button>
          </form>

          <div className="mt-8 pt-6 text-center border-t border-slate-800/80">
            <span className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-white font-semibold hover:text-cyan-400 transition-colors underline decoration-slate-700 underline-offset-4 hover:decoration-cyan-400">
                Register here
              </Link>
            </span>
          </div>
          
        </div>
      </div>

      {/* Bottom Footer Details */}
      <div className="w-full border-t border-slate-800/50 py-6 px-8 flex justify-between items-center z-10 mt-auto text-[10px] font-medium text-slate-600 uppercase tracking-widest">
        <span>© 2026 Codeverse Architecture. All Rights Reserved.</span>
        <div className="flex gap-6">
          <Link to="#" className="hover:text-slate-400">Privacy Policy</Link>
          <Link to="#" className="hover:text-slate-400">Terms of Service</Link>
          <Link to="#" className="hover:text-slate-400">System Status</Link>
        </div>
      </div>

    </div>
  );
}

export default Login;
