import React, { useState, useEffect, useRef } from 'react';
import { 
  LogOut, Settings, Plus, Save, X, Upload, Shirt, Ruler, 
  ChevronRight, Menu, ArrowLeft, Zap, Camera, Download, Share2,
  User, Mail, Edit2, Eye, Maximize2, Grid3x3, MoreVertical, Trash2
} from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showWearableModal, setShowWearableModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [measurements, setMeasurements] = useState({
    height: '',
    chest: '',
    waist: '',
    hips: '',
    shoulder: '',
    inseam: '',
    armLength: '',
    neckSize: ''
  });
  const [savedSets, setSavedSets] = useState([]);
  const [currentSet, setCurrentSet] = useState(null);
  const [wearables, setWearables] = useState([]);
  const [wearableInput, setWearableInput] = useState('');
  const [user, setUser] = useState({ username: 'John Doe', email: 'john@example.com' });
  const [loading, setLoading] = useState(false);
  const [selectedWearable, setSelectedWearable] = useState(null);
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const animationRef = useRef(null);

  // Draw 3D Avatar
  const drawAvatar = (canvas, measurements, rotation = 0, showWearable = null) => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas with gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, 'rgba(17, 24, 39, 0.8)');
    bgGradient.addColorStop(1, 'rgba(5, 5, 15, 0.9)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add animated grid background
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw light source
    const lightGradient = ctx.createRadialGradient(width * 0.3, height * 0.2, 0, width * 0.5, height * 0.5, Math.max(width, height));
    lightGradient.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
    lightGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = lightGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Head
    const headGradient = ctx.createRadialGradient(-5, -15, 10, 0, -120, 40);
    headGradient.addColorStop(0, '#a78bfa');
    headGradient.addColorStop(0.7, '#818cf8');
    headGradient.addColorStop(1, '#6366f1');
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(0, -120, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Eyes with shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-12, -125, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, -125, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(-12, -125, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, -125, 3, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    const chestWidth = measurements.chest ? Math.max(30, measurements.chest / 8) : 30;
    const waistWidth = measurements.waist ? Math.max(20, measurements.waist / 10) : 20;
    const hipWidth = measurements.hips ? Math.max(25, measurements.hips / 10) : 25;

    const torsoGradient = ctx.createLinearGradient(0, -80, 0, 20);
    torsoGradient.addColorStop(0, '#c084fc');
    torsoGradient.addColorStop(0.5, '#a855f7');
    torsoGradient.addColorStop(1, '#7e22ce');
    ctx.fillStyle = torsoGradient;
    ctx.beginPath();
    ctx.moveTo(-chestWidth, -80);
    ctx.quadraticCurveTo(-waistWidth, 0, -hipWidth, 20);
    ctx.lineTo(hipWidth, 20);
    ctx.quadraticCurveTo(waistWidth, 0, chestWidth, -80);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6b21a8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Neck
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(-8, -90, 16, 15);

    // Arms
    const armLength = measurements.armLength ? measurements.armLength / 2 : 60;
    const armGradient = ctx.createLinearGradient(-50, -40, -50, 40);
    armGradient.addColorStop(0, '#f97316');
    armGradient.addColorStop(1, '#ea580c');
    ctx.strokeStyle = armGradient;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    
    // Left arm
    ctx.beginPath();
    ctx.moveTo(-chestWidth, -40);
    ctx.quadraticCurveTo(-chestWidth - 25, 0, -chestWidth - 30, armLength);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(chestWidth, -40);
    ctx.quadraticCurveTo(chestWidth + 25, 0, chestWidth + 30, armLength);
    ctx.stroke();

    // Legs
    const legLength = measurements.inseam ? measurements.inseam / 2 : 100;
    const legGradient = ctx.createLinearGradient(0, 20, 0, legLength);
    legGradient.addColorStop(0, '#06b6d4');
    legGradient.addColorStop(0.5, '#0891b2');
    legGradient.addColorStop(1, '#0e7490');
    ctx.strokeStyle = legGradient;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';

    // Left leg
    ctx.beginPath();
    ctx.moveTo(-hipWidth / 2, 20);
    ctx.lineTo(-hipWidth / 2, 20 + legLength);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(hipWidth / 2, 20);
    ctx.lineTo(hipWidth / 2, 20 + legLength);
    ctx.stroke();

    // Draw wearable on avatar
    if (showWearable) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.fillRect(-chestWidth - 5, -70, (chestWidth + 5) * 2 + 10, 85);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(-chestWidth - 5, -70, (chestWidth + 5) * 2 + 10, 85);
      
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(showWearable.thumbnail, 0, -35);
    }

    ctx.restore();

    // Draw measurements info at bottom
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    const infoY = height - 80;
    const colWidth = width / 2;
    
    ctx.fillText(`H: ${measurements.height || '0'}cm`, 20, infoY);
    ctx.fillText(`C: ${measurements.chest || '0'}cm`, 20, infoY + 20);
    ctx.fillText(`W: ${measurements.waist || '0'}cm`, 20, infoY + 40);
    
    ctx.fillText(`Hip: ${measurements.hips || '0'}cm`, colWidth, infoY);
    ctx.fillText(`Arm: ${measurements.armLength || '0'}cm`, colWidth, infoY + 20);
    ctx.fillText(`Leg: ${measurements.inseam || '0'}cm`, colWidth, infoY + 40);
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const animate = () => {
      rotationRef.current = (rotationRef.current + 0.8) % 360;
      drawAvatar(canvas, measurements, rotationRef.current, selectedWearable);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [measurements, selectedWearable]);

  const handleMeasurementSubmit = () => {
    if (Object.values(measurements).some(val => !val)) {
      alert('Please fill all measurements');
      return;
    }
    setCurrentSet({
      id: Date.now(),
      measurements: { ...measurements },
      wearables: [],
      createdAt: new Date().toLocaleDateString()
    });
    setShowMeasurementModal(false);
    alert('✓ Avatar created successfully!');
  };

  const handleAddWearable = async () => {
    if (!wearableInput.trim()) return;
    
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const garmentEmojis = ['👕', '👔', '🧥', '👗', '👖', '🩳', '🧦', '👘'];
      const randomEmoji = garmentEmojis[Math.floor(Math.random() * garmentEmojis.length)];
      
      const newWearable = {
        id: Date.now(),
        url: wearableInput,
        name: `Garment ${wearables.length + 1}`,
        thumbnail: randomEmoji,
        addedAt: new Date().toLocaleDateString()
      };
      setWearables([...wearables, newWearable]);
      setWearableInput('');
    } catch (error) {
      alert('Failed to fetch garment');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSet = () => {
    if (!currentSet || wearables.length === 0) {
      alert('Create an avatar and add at least one wearable');
      return;
    }
    const setToSave = {
      ...currentSet,
      wearables,
      name: `Look ${savedSets.length + 1}`,
      savedAt: new Date().toLocaleDateString()
    };
    setSavedSets([...savedSets, setToSave]);
    alert('✓ Look saved successfully!');
  };

  const deleteWearable = (id) => {
    setWearables(wearables.filter(w => w.id !== id));
    if (selectedWearable?.id === id) setSelectedWearable(null);
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed md:relative transition-all duration-500 ${sidebarOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-gray-950 to-black border-r border-gray-800 z-40 h-full overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 sticky top-0 bg-gradient-to-r from-gray-950 to-black">
          {sidebarOpen && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded flex items-center justify-center shadow-lg shadow-indigo-600/50">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">StylMorph</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-800 rounded transition-all duration-300">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-3 px-4 py-6">
          {[
            { id: 'home', label: 'Dashboard', icon: Camera },
            { id: 'avatar', label: 'Build Avatar', icon: Ruler },
            { id: 'wearables', label: 'Try Wearables', icon: Shirt },
            { id: 'saved', label: 'Saved Looks', icon: Save },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${sidebarOpen ? 'space-x-4' : 'justify-center'} px-4 py-3 rounded-xl transition-all duration-300 group ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/50'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-105'}`} />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button onClick={() => window.location.href = '/'} className={`w-full flex items-center ${sidebarOpen ? 'space-x-2' : 'justify-center'} px-4 py-3 bg-gray-800 hover:bg-red-600/20 border border-gray-700 hover:border-red-600/50 rounded-lg transition-all duration-300 group`}>
            <LogOut className="w-5 h-5 flex-shrink-0 group-hover:text-red-400 transition-colors" />
            {sidebarOpen && <span className="text-sm font-medium group-hover:text-red-400 transition-colors">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 bg-gradient-to-r from-gray-950 to-black border-b border-gray-800 backdrop-blur-xl px-8 py-4 flex items-center justify-between z-30 shadow-lg">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {activeTab === 'home' && '📊 Dashboard'}
            {activeTab === 'avatar' && '🎨 Build Your Avatar'}
            {activeTab === 'wearables' && '👗 Try Wearables'}
            {activeTab === 'saved' && '💾 Saved Looks'}
            {activeTab === 'settings' && '⚙️ Settings'}
          </h1>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-800 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-indigo-600/20">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={() => setShowSettingsModal(true)} className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300">
              <User className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="p-8 space-y-8 animate-fade-in">
            {/* Welcome Section */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 rounded-2xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-8 overflow-hidden group-hover:border-indigo-600/50 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-600/10 to-transparent rounded-bl-full" />
                  <div className="relative z-10">
                    <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Welcome back, {user.username}! 👋</h2>
                    <p className="text-gray-400 mb-6 text-lg leading-relaxed">Create your personalized 3D avatar and visualize how garments fit your unique body shape in real-time.</p>
                    <button
                      onClick={() => setActiveTab('avatar')}
                      className="group/btn px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300 flex items-center space-x-2 active:scale-95"
                    >
                      <span>Start Building</span>
                      <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                {[
                  { label: 'Saved Looks', value: savedSets.length, color: 'from-indigo-600/20 to-purple-600/20' },
                  { label: 'Wearables Tried', value: wearables.length, color: 'from-purple-600/20 to-pink-600/20' },
                  { label: 'Avatar Status', value: currentSet ? '✓ Ready' : '○ Pending', color: 'from-cyan-600/20 to-blue-600/20' }
                ].map((stat, idx) => (
                  <div key={idx} className="relative group">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500`} />
                    <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-6 text-center group-hover:border-indigo-600/50 transition-all duration-300">
                      <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{stat.value}</div>
                      <div className="text-sm text-gray-400 mt-2">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions & Tips */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all duration-300">
                  <h3 className="text-xl font-bold mb-6">⚡ Quick Actions</h3>
                  <div className="space-y-3">
                    {[
                      { icon: Plus, label: 'Create New Avatar', action: () => setActiveTab('avatar') },
                      { icon: Shirt, label: 'Try Wearables', action: () => setActiveTab('wearables') },
                      { icon: Save, label: 'View Saved Looks', action: () => setActiveTab('saved') }
                    ].map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <button key={idx} onClick={action.action} className="w-full flex items-center space-x-4 p-4 bg-gray-800/30 hover:bg-indigo-600/20 rounded-lg transition-all duration-300 group/action active:scale-95">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center group-hover/action:scale-110 transition-all duration-300 shadow-lg shadow-indigo-600/30">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="font-medium">{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all duration-300">
                  <h3 className="text-xl font-bold mb-6">💡 Tips & Tricks</h3>
                  <ul className="space-y-3 text-sm text-gray-400">
                    <li className="flex space-x-3">
                      <span className="text-indigo-400 font-bold text-lg">✓</span>
                      <span>Take accurate measurements for best fit visualization</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-indigo-400 font-bold text-lg">✓</span>
                      <span>Paste product URLs to try garments instantly</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-indigo-400 font-bold text-lg">✓</span>
                      <span>Save your favorite combinations for later</span>
                    </li>
                    <li className="flex space-x-3">
                      <span className="text-indigo-400 font-bold text-lg">✓</span>
                      <span>Share styled looks with friends and family</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Avatar Tab */}
        {activeTab === 'avatar' && (
          <div className="p-8 animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Canvas */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-2xl blur-3xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group-hover:border-indigo-600/50 transition-all duration-300">
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={700}
                      className="w-full h-auto"
                    />
                    <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg">
                      🔄 Auto-rotating
                    </div>
                  </div>
                </div>
              </div>

              {/* Measurements Form */}
              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />
                  <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all duration-300">
                    <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                      <Ruler className="w-6 h-6 text-indigo-400" />
                      <span>Body Measurements</span>
                    </h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                      {[
                        { key: 'height', label: 'Height (cm)', placeholder: 'e.g., 180', icon: '📏' },
                        { key: 'chest', label: 'Chest (cm)', placeholder: 'e.g., 100', icon: '👕' },
                        { key: 'waist', label: 'Waist (cm)', placeholder: 'e.g., 80', icon: '⭕' },
                        { key: 'hips', label: 'Hips (cm)', placeholder: 'e.g., 90', icon: '⬜' },
                        { key: 'shoulder', label: 'Shoulder Width (cm)', placeholder: 'e.g., 45', icon: '↔️' },
                        { key: 'inseam', label: 'Inseam (cm)', placeholder: 'e.g., 80', icon: '📐' },
                        { key: 'armLength', label: 'Arm Length (cm)', placeholder: 'e.g., 60', icon: '💪' },
                        { key: 'neckSize', label: 'Neck Size (cm)', placeholder: 'e.g., 35', icon: '⭕' }
                      ].map(field => (
                        <div key={field.key} className="group/field">
                          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                            <span>{field.icon}</span>
                            <span>{field.label}</span>
                          </label>
                          <input
                            type="number"
                            placeholder={field.placeholder}
                            value={measurements[field.key]}
                            onChange={(e) => setMeasurements({ ...measurements, [field.key]: e.target.value })}
                            className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-600 focus:shadow-lg focus:shadow-indigo-600/20 transition-all duration-300 group-hover/field:border-gray-600"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleMeasurementSubmit}
                      className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300 flex items-center justify-center space-x-2 group/btn active:scale-95"
                    >
                      <Ruler className="w-5 h-5" />
                      <span>Create Avatar</span>
                    </button>
                  </div>
                </div>

                {currentSet && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                    <div className="relative bg-gray-900 border border-green-600/50 rounded-2xl p-6 group-hover:border-green-400/70 transition-all duration-300">
                      <div className="flex items-center space-x-3 text-green-400">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        <span className="font-medium">✓ Avatar Created Successfully!</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wearables Tab */}
        {activeTab === 'wearables' && (
          <div className="p-8 space-y-8 animate-fade-in">
            {!currentSet ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Camera className="w-16 h-16 mx-auto text-gray-600 mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold mb-2">Create Avatar First</h3>
                <p className="text-gray-400 mb-6">You need to build an avatar before trying on wearables</p>
                <button
                  onClick={() => setActiveTab('avatar')}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300 active:scale-95"
                >
                  Build Avatar Now
                </button>
              </div>
            ) : (
              <>
                {/* Add Wearable */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-2xl blur-3xl opacity-0 group-hover:opacity-100 group-hover:blur-3xl transition-all duration-500" />
                  <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/50 transition-all duration-300">
                    <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                      <Shirt className="w-6 h-6 text-indigo-400" />
                      <span>Add Wearables</span>
                    </h3>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="Paste product URL (Amazon, Flipkart, etc)..."
                        value={wearableInput}
                        onChange={(e) => setWearableInput(e.target.value)}
                        className="flex-1 px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-600 focus:shadow-lg focus:shadow-indigo-600/20 transition-all duration-300"
                      />
                      <button
                        onClick={handleAddWearable}
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300 disabled:opacity-50 active:scale-95"
                      >
                        {loading ? '⏳' : '➕ Add'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Wearables Grid */}
                <div>
                  <h3 className="text-xl font-bold mb-4">Your Wearables</h3>
                  {wearables.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                      <Shirt className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">No wearables added yet. Add one to get started!</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {wearables.map((wearable) => (
                        <div key={wearable.id} className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />
                          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group-hover:border-indigo-600/50 transition-all duration-300">
                            <div className="aspect-square bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center text-6xl relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/20 to-transparent" />
                              <span className="text-5xl drop-shadow-lg">{wearable.thumbnail}</span>
                            </div>
                            <div className="p-4">
                              <h4 className="font-semibold text-sm truncate mb-2">{wearable.name}</h4>
                              <p className="text-xs text-gray-500 mb-4 truncate">{wearable.url}</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedWearable(wearable)}
                                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                    selectedWearable?.id === wearable.id
                                      ? 'bg-indigo-600 shadow-lg shadow-indigo-600/50'
                                      : 'bg-gray-800 hover:bg-indigo-600/50'
                                  }`}
                                >
                                  👁️ View
                                </button>
                                <button
                                  onClick={() => deleteWearable(wearable.id)}
                                  className="px-3 py-2 bg-gray-800 hover:bg-red-600/30 rounded-lg transition-all duration-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Outfit */}
                {wearables.length > 0 && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-600/30 to-emerald-600/30 rounded-2xl blur-3xl opacity-0 group-hover:opacity-100 group-hover:blur-3xl transition-all duration-500" />
                    <div className="relative bg-gray-900 border border-green-600/50 rounded-2xl p-8 group-hover:border-green-400/70 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold mb-2">Ready to Save Your Look?</h3>
                          <p className="text-gray-400">Store this combination for later reference</p>
                        </div>
                        <button
                          onClick={handleSaveSet}
                          className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium hover:shadow-lg hover:shadow-green-600/50 transition-all duration-300 flex items-center space-x-2 active:scale-95"
                        >
                          <Save className="w-5 h-5" />
                          <span>Save Look</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Saved Sets Tab */}
        {activeTab === 'saved' && (
          <div className="p-8 space-y-8 animate-fade-in">
            {savedSets.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Save className="w-16 h-16 mx-auto text-gray-600 mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold mb-2">No Saved Looks Yet</h3>
                <p className="text-gray-400 mb-6">Create an avatar, add wearables, and save your favorite looks!</p>
                <button
                  onClick={() => setActiveTab('wearables')}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300 active:scale-95"
                >
                  Create Your First Look
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedSets.map((set, idx) => (
                  <div key={set.id} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />
                    <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group-hover:border-indigo-600/50 transition-all duration-300">
                      <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/20 to-transparent" />
                        <div className="text-6xl drop-shadow-lg">
                          {set.wearables.map(w => w.thumbnail).join(' ')}
                        </div>
                      </div>
                      <div className="p-6">
                        <h4 className="font-bold text-lg mb-2">{set.name}</h4>
                        <div className="space-y-2 mb-4 text-sm text-gray-400">
                          <p>📅 Saved: {set.savedAt}</p>
                          <p>👕 Wearables: {set.wearables.length}</p>
                          <p>📏 Height: {set.measurements.height}cm</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-all duration-300 active:scale-95">
                            👁️ Preview
                          </button>
                          <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-all duration-300 active:scale-95">
                            📤 Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Profile Settings */}
              <div className="lg:col-span-2 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all duration-300 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                      <User className="w-6 h-6 text-indigo-400" />
                      <span>Profile Settings</span>
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={user.username}
                        readOnly
                        className="flex-1 px-4 py-2 bg-black border border-gray-700 rounded-lg text-white"
                      />
                      <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-300">
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={user.email}
                        readOnly
                        className="flex-1 px-4 py-2 bg-black border border-gray-700 rounded-lg text-white"
                      />
                      <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-300">
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-6">
                    <h4 className="font-semibold mb-4">Preferences</h4>
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                        <span>Receive email notifications</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                        <span>Share anonymous usage data</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4" />
                        <span>Enable dark mode</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all duration-300">
                  <h4 className="font-bold mb-6">Account Info</h4>
                  <div className="space-y-4 text-sm">
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400 mb-1">Account Created</p>
                      <p className="font-semibold">January 15, 2024</p>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400 mb-1">Last Active</p>
                      <p className="font-semibold">Today at 2:30 PM</p>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400 mb-1">Subscription</p>
                      <p className="font-semibold text-green-400">Premium Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-orange-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />
              <div className="relative bg-gray-900 border border-red-600/30 rounded-2xl p-8 group-hover:border-red-600/50 transition-all duration-300">
                <h3 className="text-2xl font-bold mb-6 text-red-400">⚠️ Danger Zone</h3>
                <div className="space-y-3">
                  <button className="w-full px-6 py-3 border border-red-600/50 hover:bg-red-600/20 rounded-lg font-medium transition-all duration-300">
                    🔄 Reset All Data
                  </button>
                  <button className="w-full px-6 py-3 border border-red-600/50 hover:bg-red-600/20 rounded-lg font-medium transition-all duration-300">
                    ❌ Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;