import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AnimatedText = ({ text, className = "", delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const words = text.split(" ");
  
  return (
    <span ref={ref} className={className}>
      {words.map((word, index) => (
        <span 
          key={index} 
          className={`inline-block ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ transition: 'opacity 0.05s', transitionDelay: `${delay + index * 0.15}s` }}
        >
          {word}&nbsp;
        </span>
      ))}
    </span>
  );
};

const FAQItem = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className="border-b border-gray-800">
      <button 
        className="w-full py-6 flex justify-between items-center text-left focus:outline-none"
        onClick={onClick}
      >
        <span className="text-lg font-serif italic text-white">{question}</span>
        <span className="text-gray-400 text-2xl transition-transform duration-300" style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-gray-400 text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [openFAQ, setOpenFAQ] = useState(0);

  const handleDashboardClick = () => {
    navigate(isAuthenticated ? '/dashboard' : '/login');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-gray-300 font-sans overflow-x-hidden selection:bg-blue-500 selection:text-white">
      <style>{`
        @keyframes word-appear {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-word-appear {
          animation: word-appear 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-[#0a0c10]/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/images/codeverse.png" alt="CodeVerse" className="h-8 object-contain" />
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">How it works</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            {isAuthenticated ? (
              <>
                <button onClick={handleDashboardClick} className="text-gray-300 hover:text-white transition-colors">Dashboard</button>
                <button onClick={handleLogout} className="text-red-400 hover:text-red-300 transition-colors">Logout</button>
              </>
            ) : (
              <>
                <button onClick={handleDashboardClick} className="text-gray-300 hover:text-white transition-colors">Dashboard</button>
                <button onClick={() => navigate('/login')} className="text-gray-300 hover:text-white transition-colors">Log in</button>
                <button onClick={() => navigate('/register')} className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition-all font-semibold">Get Started</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 w-full flex flex-col lg:flex-row items-center gap-12 mt-10 max-w-7xl mx-auto">
        {/* Background Glow */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -z-10 animate-pulse"></div>

        <div className="flex-1 space-y-8 z-10">
          <p className="text-teal-400 text-sm font-mono tracking-widest uppercase">Journal Edition v2.4</p>
          <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
            <AnimatedText text="Code together." /> <br />
            <span className="font-serif italic text-gray-400"><AnimatedText text="Build faster." /></span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md">
            The ultra-low latency collaborative IDE for modern engineering teams. Real-time pair programming, integrated AI, and instant environment setup.
          </p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/register')} className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-transform hover:scale-105 duration-300 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              Get Started Free
            </button>
            <button className="border border-gray-700 bg-[#161b22] text-white px-6 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors">
              Live Demo
            </button>
          </div>
        </div>

        {/* Mock Editor Window (Animated) */}
        <div className="flex-1 w-full max-w-lg relative group overflow-hidden">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-[#0d1117] border border-gray-800 rounded-lg shadow-2xl overflow-hidden hover:-translate-y-2 transition-transform duration-500">
            {/* Editor Header */}
            <div className="bg-[#161b22] px-4 py-2 border-b border-gray-800 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              <span className="ml-4 text-xs text-gray-500 font-mono">App.js</span>
            </div>
            {/* Editor Content */}
            <div className="p-4 font-mono text-sm leading-relaxed overflow-hidden h-[300px]">
              <div className="text-gray-500">1 &nbsp;&nbsp;<span className="text-purple-400">import</span> React <span className="text-purple-400">from</span> <span className="text-green-300">'react'</span>;</div>
              <div className="text-gray-500">2 &nbsp;&nbsp;<span className="text-purple-400">import</span> {'{'} Workspace {'}'} <span className="text-purple-400">from</span> <span className="text-green-300">'@codeverse'</span>;</div>
              <div className="text-gray-500">3</div>
              <div className="text-gray-500">4 &nbsp;&nbsp;<span className="text-blue-400">const</span> App = () <span className="text-blue-400">=&gt;</span> {'{'}</div>
              <div className="text-gray-500">5 &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">return</span> (</div>
              <div className="text-gray-500">6 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-red-400">Workspace</span> <span className="text-blue-300">mode</span>=<span className="text-green-300">"live-collab"</span> /&gt;</div>
              <div className="text-gray-500">7 &nbsp;&nbsp;&nbsp;&nbsp;);</div>
              <div className="text-gray-500">8 &nbsp;&nbsp;{'}'};</div>
              <div className="text-gray-500 mt-4 animate-pulse">|</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 w-full bg-[#0d1117] border-y border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 text-center lg:text-left">
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Core Capabilities</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-white">
                <AnimatedText text="Engineered for" /> <br /><span className="font-serif italic text-gray-400"><AnimatedText text="Precision." /></span>
              </h2>
            </div>
            <p className="flex-1 max-w-xl text-gray-400 text-lg leading-relaxed lg:text-left pt-6 lg:pt-0">
              <AnimatedText 
                text="Every feature is built with the speed and reliability developers demand from their primary tools." 
                delay={0.5} 
              />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Cards */}
            {[
              { title: "Real-time collaboration", desc: "Experience zero-lag multi-user editing with state-of-the-art CRDT synchronization.", icon: "bi-lightning-charge" },
              { title: "Workspaces & files", desc: "Organize complex projects with an intuitive virtual file system.", icon: "bi-folder2-open" },
              { title: "Built-in chat", desc: "Context-aware messaging inside your editor. Reference lines of code directly in chat.", icon: "bi-chat-square-text" },
              { title: "AI assistance", desc: "Next-generation autocomplete and bug detection powered by custom AI models.", icon: "bi-stars" },
              { title: "Version history", desc: "Granular timeline of every change. Revert specific edits with a single click.", icon: "bi-clock-history" },
              { title: "Secure access", desc: "Enterprise-grade encryption and granular role-based access control for your code.", icon: "bi-shield-check" },
            ].map((feat, i) => (
              <div key={i} className="bg-[#161b22] border border-gray-800 p-8 rounded-xl hover:-translate-y-1 hover:border-blue-500/50 transition-all duration-300 group">
                <i className={`bi ${feat.icon} text-2xl text-teal-400 mb-6 block group-hover:scale-110 transition-transform`}></i>
                <h3 className="text-xl font-serif text-white mb-3">{feat.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 px-6 w-full bg-[#0a0c10]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 font-serif italic">
              <AnimatedText text="The Workflow" />
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            {/* Step 1 */}
            <div className="relative group">
              <div className="text-6xl font-serif italic text-gray-800 mb-6 group-hover:-translate-y-2 transition-transform duration-300">01</div>
              <h3 className="text-2xl font-bold text-white mb-4"><AnimatedText text="Create" /></h3>
              <p className="text-gray-400 leading-relaxed text-sm">Spin up a new workspace in seconds. Connect your GitHub repo or start from a template.</p>
            </div>
            {/* Step 2 */}
            <div className="relative group">
              <div className="text-6xl font-serif italic text-gray-800 mb-6 group-hover:-translate-y-2 transition-transform duration-300">02</div>
              <h3 className="text-2xl font-bold text-white mb-4"><AnimatedText text="Invite" /></h3>
              <p className="text-gray-400 leading-relaxed text-sm">Send a magic link to your teammates. No environment setup or "it works on my machine" issues.</p>
            </div>
            {/* Step 3 */}
            <div className="relative group">
              <div className="text-6xl font-serif italic text-gray-800 mb-6 group-hover:-translate-y-2 transition-transform duration-300">03</div>
              <h3 className="text-2xl font-bold text-white mb-4"><AnimatedText text="Collaborate" /></h3>
              <p className="text-gray-400 leading-relaxed text-sm">Code, debug, and review together. Ship features faster than ever before.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Built For Every Developer Section */}
      <section className="py-24 px-6 w-full bg-[#0d1117] border-y border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 font-serif italic">
              <AnimatedText text="Built for every developer" />
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Student teams", desc: "Nail your group projects with seamless pair-programming and easy sharing.", icon: "bi-people" },
              { title: "Developers & startups", desc: "The engine room for fast-moving teams. Code reviews happen in real-time, zero friction.", icon: "bi-rocket-takeoff" },
              { title: "Mentors & tutors", desc: "Guide students through bugs live, without screen sharing lag.", icon: "bi-mortarboard" },
              { title: "Hackathons", desc: "Micro-latency is real-time. Built for high-speed delivery.", icon: "bi-code-square" },
            ].map((item, i) => (
              <div key={i} className="bg-[#161b22] border border-gray-800 p-8 rounded-xl text-center group hover:bg-[#1f242e] hover:border-blue-500/30 transition-all duration-300">
                <i className={`bi ${item.icon} text-3xl text-teal-400 mb-6 block group-hover:-translate-y-1 transition-transform`}></i>
                <h3 className="text-lg font-serif italic text-white mb-3">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 w-full bg-[#0a0c10]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 font-serif italic">
              <AnimatedText text="Frequently Asked Questions" />
            </h2>
          </div>

          <div className="space-y-2">
            {[
              { q: "Is CodeVerse free for students?", a: "Yes! We offer a free Tier for students and open-source contributors with all core features included." },
              { q: "Can I host CodeVerse on my own infrastructure?", a: "Self-hosting options are available for our Enterprise customers. Reach out to our sales team for documentation and requirements." },
              { q: "What languages do you support?", a: "CodeVerse supports over 40+ programming languages with rich syntax highlighting, auto-completion, and formatting right out of the box." },
              { q: "Is my code secure on your platform?", a: "Absolutely. All code and communication are encrypted at rest and in transit using enterprise-grade security protocols." },
            ].map((faq, i) => (
              <FAQItem 
                key={i} 
                question={faq.q} 
                answer={faq.a} 
                isOpen={openFAQ === i} 
                onClick={() => setOpenFAQ(openFAQ === i ? -1 : i)} 
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 w-full bg-[#0d1117] border-t border-gray-800/50">
        <div className="max-w-4xl mx-auto bg-gradient-to-b from-[#161b22] to-[#0d1117] border border-gray-800 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-serif italic">Ready to collaborate?</h2>
          <p className="text-gray-400 mb-10 max-w-lg mx-auto">Join developers building the future together. Start your first session in under 60 seconds.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="bg-blue-600 text-white px-8 py-3 rounded-md font-medium hover:bg-blue-700 transition w-full sm:w-auto shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              Create Account
            </button>
            <button onClick={() => navigate('/login')} className="border border-gray-700 bg-transparent text-white px-8 py-3 rounded-md font-medium hover:bg-gray-800 transition w-full sm:w-auto">
              Log in
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 border-opacity-50 mt-10 p-8 w-full bg-[#0a0c10]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xl font-serif italic text-white font-bold">CodeVerse</div>
          <div className="text-sm text-gray-500">© 2026 CodeVerse. Precision Built for Developers.</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
