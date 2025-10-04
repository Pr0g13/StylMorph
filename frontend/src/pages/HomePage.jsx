import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, Zap, ShoppingBag, User, X, Mail, Lock, ArrowRight, Play } from 'lucide-react';

const StylMorphHomepage = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ username: '', email: '', password: '' });
  const videoRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = () => {
    if (!loginData.email || !loginData.password) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Login functionality will be connected to backend!');
      setShowLogin(false);
      setLoginData({ email: '', password: '' });
    }, 1500);
  };

  const handleSignup = () => {
    if (!signupData.username || !signupData.email || !signupData.password) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Signup functionality will be connected to backend!');
      setShowSignup(false);
      setSignupData({ username: '', email: '', password: '' });
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-black/90 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'}`}>
        <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">StylMorph</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-10">
            <a href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors">How it Works</a>
            <a href="#technology" className="text-sm text-gray-300 hover:text-white transition-colors">Technology</a>
          </div>

          <button
            onClick={() => setShowLogin(true)}
            className="px-6 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-300"
          >
            Sign In
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-black to-purple-950 opacity-50" />
        
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full mb-8">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-gray-300">AI-Powered Virtual Fitting Room</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="block">Experience Fashion</span>
            <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Before You Buy
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Create your personalized 3D avatar with precise body measurements and visualize how any garment fits—powered by advanced computer vision and AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => setShowSignup(true)}
              className="group px-8 py-4 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-all duration-300 flex items-center space-x-2 shadow-2xl shadow-white/20"
            >
              <span>Create Your Avatar</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg font-medium hover:bg-white/10 transition-all duration-300 flex items-center space-x-2">
              <Play className="w-5 h-5" />
              <span>Watch Demo</span>
            </button>
          </div>

          {/* 3D Avatar Showcase */}
          <div className="relative max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-gray-900 to-black shadow-2xl">
              {/* Simulated Interface */}
              <div className="aspect-video bg-gradient-to-br from-indigo-950/50 to-purple-950/50 flex items-center justify-center relative">
                {/* 3D Model Placeholder */}
                <div className="relative w-64 h-96">
                  {/* Scanning Effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent animate-pulse" />
                  
                  {/* Human Silhouette */}
                  <svg viewBox="0 0 200 400" className="w-full h-full filter drop-shadow-2xl">
                    <defs>
                      <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    
                    {/* Head */}
                    <ellipse cx="100" cy="50" rx="25" ry="30" fill="url(#bodyGrad)" filter="url(#glow)" />
                    
                    {/* Torso */}
                    <path d="M 75 80 Q 100 75 125 80 L 120 200 Q 100 205 80 200 Z" fill="url(#bodyGrad)" filter="url(#glow)" />
                    
                    {/* Arms */}
                    <line x1="75" y1="100" x2="50" y2="180" stroke="url(#bodyGrad)" strokeWidth="12" strokeLinecap="round" filter="url(#glow)" />
                    <line x1="125" y1="100" x2="150" y2="180" stroke="url(#bodyGrad)" strokeWidth="12" strokeLinecap="round" filter="url(#glow)" />
                    
                    {/* Legs */}
                    <line x1="85" y1="200" x2="85" y2="350" stroke="url(#bodyGrad)" strokeWidth="16" strokeLinecap="round" filter="url(#glow)" />
                    <line x1="115" y1="200" x2="115" y2="350" stroke="url(#bodyGrad)" strokeWidth="16" strokeLinecap="round" filter="url(#glow)" />
                    
                    {/* Measurement Lines */}
                    <line x1="60" y1="120" x2="140" y2="120" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
                    <line x1="60" y1="180" x2="140" y2="180" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
                    <line x1="70" y1="200" x2="130" y2="200" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
                  </svg>

                  {/* Measurement Labels */}
                  <div className="absolute top-1/4 -left-16 text-xs text-cyan-400 font-mono">
                    <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">Chest: 38"</div>
                  </div>
                  <div className="absolute top-1/2 -right-16 text-xs text-cyan-400 font-mono">
                    <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">Waist: 32"</div>
                  </div>
                  <div className="absolute bottom-1/4 -left-16 text-xs text-cyan-400 font-mono">
                    <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">Inseam: 32"</div>
                  </div>
                </div>

                {/* Corner Accents */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-indigo-500" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-indigo-500" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-indigo-500" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-indigo-500" />
              </div>
            </div>

            {/* Floating Stats */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
              <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl px-6 py-3">
                <div className="text-2xl font-bold text-white">99.5%</div>
                <div className="text-xs text-gray-400">Accuracy</div>
              </div>
              <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl px-6 py-3">
                <div className="text-2xl font-bold text-white">&lt;30s</div>
                <div className="text-xs text-gray-400">Scan Time</div>
              </div>
              <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl px-6 py-3">
                <div className="text-2xl font-bold text-white">50+</div>
                <div className="text-xs text-gray-400">Measurements</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Precision Meets Innovation</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Industry-leading technology that transforms how you shop online
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Camera,
                title: 'Advanced Body Scanning',
                desc: 'Military-grade computer vision captures 50+ body measurements with 99.5% accuracy using just your smartphone camera.'
              },
              {
                icon: ShoppingBag,
                title: 'Universal Compatibility',
                desc: 'Virtually try on garments from any e-commerce platform. Paste a link and see how it fits your unique body shape.'
              },
              {
                icon: Zap,
                title: 'AI Style Intelligence',
                desc: 'Machine learning algorithms analyze your preferences, body type, and fashion trends to recommend perfect fits.'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group relative p-8 bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 hover:border-indigo-600/50 transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 bg-gradient-to-br from-indigo-950 to-purple-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Shopping Experience?
          </h2>
          <p className="text-xl text-gray-300 mb-12">
            Join thousands of users who have discovered their perfect fit
          </p>
          <button
            onClick={() => setShowSignup(true)}
            className="px-10 py-5 bg-white text-black rounded-xl text-lg font-medium hover:bg-gray-100 transition-all duration-300 shadow-2xl shadow-white/20"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="relative bg-gray-950 p-8 md:p-10 rounded-2xl w-full max-w-md border border-gray-800 shadow-2xl">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
              <p className="text-gray-400">Sign in to your account</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-black border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-black border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setShowLogin(false);
                    setShowSignup(true);
                  }}
                  className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="relative bg-gray-950 p-8 md:p-10 rounded-2xl w-full max-w-md border border-gray-800 shadow-2xl">
            <button
              onClick={() => setShowSignup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Create account</h2>
              <p className="text-gray-400">Start your journey with StylMorph</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="johndoe"
                    value={signupData.username}
                    onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-black border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-black border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-black border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleSignup}
                disabled={isLoading}
                className="w-full py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setShowSignup(false);
                    setShowLogin(true);
                  }}
                  className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StylMorphHomepage;