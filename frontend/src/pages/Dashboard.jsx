import React, { useState, useEffect, useRef } from 'react';
import { 
  LogOut, Settings, Plus, Save, X, Upload, Shirt, Ruler, 
  ChevronRight, Menu, ArrowLeft, Zap, Camera, Download, Share2,
  User, Mail, Edit2, Eye, Maximize2, Grid3x3, MoreVertical, Trash2
} from 'lucide-react';
import * as api from '../services/api';
import RealisticAvatar3D from '../components/RealisticAvatar3D';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState(null);
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
  const [wearableInput, setWearableInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedWearable, setSelectedWearable] = useState(null);
  const [showRPMModal, setShowRPMModal] = useState(false);
  const [frontPhoto, setFrontPhoto] = useState(null);
  const [showPhotoGuidelines, setShowPhotoGuidelines] = useState(false);

  // Fetch user and avatar data on mount
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      loadAvatar();
    } else {
      window.location.href = "/";
    }
  }, []);

  const loadAvatar = async () => {
    try {
      const data = await api.getAvatar();
      if (data.msg === "Avatar not found") {
        setAvatar(null);
      } else {
        setAvatar(data);
        setMeasurements(data.measurements);
      }
    } catch (err) {
      console.error("Error loading avatar:", err);
    }
  };

  const handleMeasurementSubmit = async () => {
    if (Object.values(measurements).some(val => !val)) {
      alert('Please fill all measurements');
      return;
    }

    setLoading(true);
    try {
      const result = await api.saveAvatar(measurements);
      alert(result.msg);
      await loadAvatar();
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to save avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWearable = async () => {
    if (!wearableInput.trim()) return;
    
    if (!avatar) {
      alert("Create an avatar first!");
      return;
    }
    
    setLoading(true);
    try {
      const garmentEmojis = ['👕', '👔', '🧥', '👗', '👖', '🩳', '🧦', '👘'];
      const randomEmoji = garmentEmojis[Math.floor(Math.random() * garmentEmojis.length)];
      
      const result = await api.addWearable(
        wearableInput, 
        `Garment ${(avatar?.wearables?.length || 0) + 1}`,
        randomEmoji
      );
      
      alert(result.msg);
      await loadAvatar();
      setWearableInput('');
    } catch (error) {
      alert('Failed to add wearable');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSet = async () => {
    if (!avatar || !avatar.wearables || avatar.wearables.length === 0) {
      alert('Add at least one wearable first');
      return;
    }

    setLoading(true);
    try {
      const result = await api.saveSet(
        `Look ${(avatar?.savedSets?.length || 0) + 1}`,
        avatar.wearables
      );
      alert(result.msg);
      await loadAvatar();
    } catch (error) {
      alert('Failed to save set');
    } finally {
      setLoading(false);
    }
  };

  const deleteWearable = async (wearableId) => {
    setLoading(true);
    try {
      const result = await api.deleteWearable(wearableId);
      alert(result.msg);
      await loadAvatar();
      if (selectedWearable?._id === wearableId) setSelectedWearable(null);
    } catch (error) {
      alert('Failed to delete wearable');
    } finally {
      setLoading(false);
    }
  };

  const deleteSet = async (setId) => {
    setLoading(true);
    try {
      const result = await api.deleteSet(setId);
      alert(result.msg);
      await loadAvatar();
    } catch (error) {
      alert('Failed to delete set');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

const handlePhotoUpload = (file) => {
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setFrontPhoto({
        file: file,
        preview: reader.result
      });
    };
    reader.readAsDataURL(file);
  }
};

const handleRemovePhoto = () => {
  setFrontPhoto(null);
};

const handleSubmitPhoto = async () => {
  if (!frontPhoto) {
    alert("Please upload a photo");
    return;
  }

  setLoading(true);
  try {
    const formData = new FormData();
    // ✅ Change this line - use "photo" to match backend
    formData.append("photo", frontPhoto.file); // Changed from "image" to "photo"

    const result = await api.uploadPhoto(formData);
    console.log("PiFuHD started:", result);

    alert("3D model generation started!");
  } catch (err) {
    console.error(err);
    alert("Failed to process image");
  } finally {
    setLoading(false);
  }
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
          <button onClick={handleLogout} className={`w-full flex items-center ${sidebarOpen ? 'space-x-2' : 'justify-center'} px-4 py-3 bg-gray-800 hover:bg-red-600/20 border border-gray-700 hover:border-red-600/50 rounded-lg transition-all duration-300 group`}>
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
            <div className="text-sm text-gray-400">
              Welcome, <span className="text-white font-semibold">{user?.username}</span>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300">
              <User className="w-5 h-5" />
            </div>
          </div>
        </header>

        {/* Home Tab */}
{/* Home Tab */}
        {activeTab === 'home' && (
          <div className="p-8 space-y-8 animate-fade-in">
            {/* Avatar Display or Build CTA */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-2xl blur-3xl group-hover:blur-3xl transition-all duration-500" />
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-8 group-hover:border-indigo-600/50 transition-all duration-300">
                {avatar ? (
                  <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                      <User className="w-6 h-6 text-indigo-400" />
                      <span>Your Avatar</span>
                    </h2>
                    <div className="h-[500px] rounded-xl overflow-hidden">
                      <RealisticAvatar3D 
                        measurements={measurements} 
                        showWearable={selectedWearable}
                      />
                    </div>
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Height', value: `${measurements.height}cm` },
                        { label: 'Chest', value: `${measurements.chest}cm` },
                        { label: 'Waist', value: `${measurements.waist}cm` },
                        { label: 'Hips', value: `${measurements.hips}cm` }
                      ].map((stat, idx) => (
                        <div key={idx} className="bg-gray-800/50 rounded-lg p-4 text-center">
                          <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
                          <div className="text-lg font-bold text-indigo-400">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                      <Ruler className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Build Your Avatar</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                      Create your personalized 3D avatar by entering your measurements. 
                      This will help you virtually try on clothes with accurate fit.
                    </p>
                    <button
                      onClick={() => setActiveTab('avatar')}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300 active:scale-95"
                    >
                      Start Building Avatar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid lg:grid-cols-3 gap-6">
              {[
                { label: 'Saved Looks', value: avatar?.savedSets?.length || 0, color: 'from-indigo-600/20 to-purple-600/20' },
                { label: 'Wearables Tried', value: avatar?.wearables?.length || 0, color: 'from-purple-600/20 to-pink-600/20' },
                { label: 'Avatar Status', value: avatar ? '✓ Ready' : '○ Pending', color: 'from-cyan-600/20 to-blue-600/20' }
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
        )}

{activeTab === 'avatar' && (
          <div className="p-8 animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Photo Upload Section - Single Front Image */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 rounded-2xl blur-3xl group-hover:blur-3xl transition-all duration-500" />
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-8 group-hover:border-cyan-600/50 transition-all duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center space-x-2">
                        <Camera className="w-6 h-6 text-cyan-400" />
                        <span>Upload Front Photo</span>
                      </h2>
                      <p className="text-gray-400 mt-2">Upload a front-facing photo for reference</p>
                    </div>
                    <button
                      onClick={() => setShowPhotoGuidelines(!showPhotoGuidelines)}
                      className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-600/50 rounded-lg text-sm font-medium transition-all duration-300"
                    >
                      {showPhotoGuidelines ? 'Hide' : 'Show'} Guidelines
                    </button>
                  </div>

                  {/* Photo Guidelines */}
                  {showPhotoGuidelines && (
                    <div className="mb-6 bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-3 text-sm max-h-64 overflow-y-auto custom-scrollbar">
                      <h3 className="font-semibold text-cyan-400 text-base mb-3">📋 Photo Guidelines</h3>
                      <ul className="list-disc list-inside text-gray-300 space-y-2 ml-2">
                        <li>Wear tight-fitting clothes (leggings, fitted t-shirt)</li>
                        <li>Stand straight with arms slightly away from body</li>
                        <li>Use a plain, solid background</li>
                        <li>Ensure good, even lighting</li>
                        <li>Keep camera at chest height</li>
                        <li>Face directly toward camera</li>
                        <li>High resolution (1080p or higher)</li>
                      </ul>
                    </div>
                  )}

                  {/* Single Photo Upload */}
                  <div className="relative group/photo mb-6">
                    <div className="aspect-[9/16] max-h-[500px] bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl overflow-hidden hover:border-cyan-600/50 transition-all duration-300">
                      {frontPhoto ? (
                        <div className="relative w-full h-full">
                          <img
                            src={frontPhoto.preview}
                            alt="Front view"
                            className="w-full h-full object-cover"
                          />
                          {/* Green Check Mark */}
                          <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <button
                            onClick={handleRemovePhoto}
                            className="absolute top-2 left-2 p-2 bg-red-600/80 hover:bg-red-600 rounded-lg backdrop-blur-sm transition-all duration-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <p className="text-white font-semibold text-sm">Front View</p>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-750 transition-all duration-300">
                          <Upload className="w-16 h-16 text-gray-500 mb-4" />
                          <span className="text-lg font-medium text-gray-400">Front View Photo</span>
                          <span className="text-sm text-gray-500 mt-2">Click to upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files[0] && handlePhotoUpload(e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitPhoto}
                    disabled={loading || !frontPhoto}
                    className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-600/50 transition-all duration-300 flex items-center justify-center space-x-2 group/btn active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-5 h-5" />
                    <span>{loading ? 'Processing...' : 'Submit Photo'}</span>
                    {!loading && frontPhoto && (
                      <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                    )}
                  </button>
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
                      disabled={loading}
                      className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300 flex items-center justify-center space-x-2 group/btn active:scale-95 disabled:opacity-50"
                    >
                      <Ruler className="w-5 h-5" />
                      <span>{loading ? 'Saving...' : (avatar ? 'Update Avatar' : 'Create Avatar')}</span>
                    </button>
                  </div>
                </div>

                {/* Ready Player Me Integration */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />
                  <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 group-hover:border-purple-600/30 transition-all duration-300">
                    <h4 className="font-semibold mb-3 flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-purple-400" />
                      <span>Advanced: Ready Player Me</span>
                    </h4>
                    <p className="text-sm text-gray-400 mb-4">
                      Create a photorealistic avatar using Ready Player Me
                    </p>
                    <button
                      onClick={() => setShowRPMModal(true)}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-all duration-300"
                    >
                      Open Ready Player Me
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wearables Tab */}
        {activeTab === 'wearables' && (
          <div className="p-8 space-y-8 animate-fade-in">
            {!avatar ? (
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
                  <h3 className="text-xl font-bold mb-4">Your Wearables ({avatar.wearables?.length || 0})</h3>
                  {!avatar.wearables || avatar.wearables.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                      <Shirt className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">No wearables added yet. Add one to get started!</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {avatar.wearables.map((wearable) => (
                        <div key={wearable._id} className="relative group">
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
                                    selectedWearable?._id === wearable._id
                                      ? 'bg-indigo-600 shadow-lg shadow-indigo-600/50'
                                      : 'bg-gray-800 hover:bg-indigo-600/50'
                                  }`}
                                >
                                  👁️ View
                                </button>
                                <button
                                  onClick={() => deleteWearable(wearable._id)}
                                  disabled={loading}
                                  className="px-3 py-2 bg-gray-800 hover:bg-red-600/30 rounded-lg transition-all duration-300 disabled:opacity-50"
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
                {avatar.wearables && avatar.wearables.length > 0 && (
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
                          disabled={loading}
                          className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium hover:shadow-lg hover:shadow-green-600/50 transition-all duration-300 flex items-center space-x-2 active:scale-95 disabled:opacity-50"
                        >
                          <Save className="w-5 h-5" />
                          <span>{loading ? 'Saving...' : 'Save Look'}</span>
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
            {!avatar || !avatar.savedSets || avatar.savedSets.length === 0 ? (
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
                {avatar.savedSets.map((set) => (
                  <div key={set._id} className="relative group">
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
                          <p>📅 Saved: {new Date(set.savedAt).toLocaleDateString()}</p>
                          <p>👕 Wearables: {set.wearables.length}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-all duration-300 active:scale-95">
                            👁️ Preview
                          </button>
                          <button 
                            onClick={() => deleteSet(set._id)}
                            disabled={loading}
                            className="px-3 py-2 bg-gray-800 hover:bg-red-600/30 rounded-lg transition-all duration-300 disabled:opacity-50"
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
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all duration-300 space-y-6">
                  <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                    <User className="w-6 h-6 text-indigo-400" />
                    <span>Profile Settings</span>
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      readOnly
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all duration-300">
                  <h4 className="font-bold mb-6">Account Info</h4>
                  <div className="space-y-4 text-sm">
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400 mb-1">Avatar Status</p>
                      <p className="font-semibold">{avatar ? '✅ Active' : '⏳ Pending'}</p>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400 mb-1">Saved Looks</p>
                      <p className="font-semibold">{avatar?.savedSets?.length || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400 mb-1">Wearables</p>
                      <p className="font-semibold">{avatar?.wearables?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ready Player Me Modal */}
      {showRPMModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="relative bg-gray-950 rounded-2xl w-full max-w-4xl h-[80vh] border border-gray-800 shadow-2xl overflow-hidden">
            <button
              onClick={() => setShowRPMModal(false)}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white transition-colors bg-black/50 backdrop-blur-sm p-2 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <iframe
              src="https://demo.readyplayer.me/avatar?frameApi"
              className="w-full h-full"
              allow="camera *; microphone *"
            />
          </div>
        </div>
      )}

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