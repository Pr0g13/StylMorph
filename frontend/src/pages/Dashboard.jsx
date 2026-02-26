// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  LogOut, Settings, Plus, Save, X, Upload, Shirt, Ruler,
  ChevronRight, Menu, Zap, Camera, User, Trash2
} from 'lucide-react';
import * as api from '../services/api';
import RealisticAvatar3D from '../components/RealisticAvatar3D';

// ══════════════════════════════════════════════════════════════════════════════
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [measurements, setMeasurements] = useState({
    height: '', chest: '', waist: '', hips: '',
    shoulder: '', inseam: '', armLength: '', neckSize: '',
  });

  const [loading, setLoading] = useState(false);
  const [selectedWearable, setSelectedWearable] = useState(null);
  const [wearableInput, setWearableInput] = useState('');
  const [pifuImage, setPifuImage] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!storedUser) { window.location.href = "/"; return; }
    setUser(storedUser);
    loadAvatar();
  }, []);

  const loadAvatar = async () => {
    try {
      const data = await api.getAvatar();
      if (data.msg === "Avatar not found" || data.error) { setAvatar(null); return; }
      setAvatar(data);
      if (data.measurements) setMeasurements(data.measurements);
    } catch (err) { console.error("loadAvatar:", err); }
  };

  // ── Manual measurement save ─────────────────────────────────────────────────
  const handleMeasurementSubmit = async () => {
    if (Object.values(measurements).some((v) => !v)) {
      alert("Please fill all measurement fields");
      return;
    }
    setLoading(true);
    try {
      const result = await api.saveAvatar(measurements);
      alert(result.msg || "Saved!");
      await loadAvatar();
    } catch (err) {
      alert(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  // ── 3D Upload ───────────────────────────────────────────────────────────
  const handlePifuSubmit = async (e) => {
    e.preventDefault();
    if (!pifuImage) {
      alert("Please select an image first!");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", pifuImage);
      const result = await api.generateModels(formData);
      alert(result.msg || "3D Model Generated!");
      await loadAvatar();
    } catch (err) {
      alert(err.message || "Failed to generate PIFuHD model");
    } finally {
      setLoading(false);
      setPifuImage(null);
    }
  };

  // ── Wearables ───────────────────────────────────────────────────────────────
  const handleAddWearable = async () => {
    if (!wearableInput.trim()) return;
    if (!avatar) { alert("Create an avatar first!"); return; }
    setLoading(true);
    try {
      const emojis = ['👕', '👔', '🧥', '👗', '👖', '🩳', '🧦', '👘'];
      await api.addWearable(
        wearableInput,
        `Garment ${(avatar?.wearables?.length || 0) + 1}`,
        emojis[Math.floor(Math.random() * emojis.length)]
      );
      await loadAvatar();
      setWearableInput('');
    } catch { alert("Failed to add wearable"); }
    finally { setLoading(false); }
  };

  const deleteWearable = async (id) => {
    setLoading(true);
    try { await api.deleteWearable(id); await loadAvatar(); if (selectedWearable?._id === id) setSelectedWearable(null); }
    catch { alert("Failed to delete"); }
    finally { setLoading(false); }
  };

  const deleteSet = async (id) => {
    setLoading(true);
    try { await api.deleteSet(id); await loadAvatar(); }
    catch { alert("Failed to delete"); }
    finally { setLoading(false); }
  };

  const handleSaveSet = async () => {
    if (!avatar?.wearables?.length) { alert("Add wearables first"); return; }
    setLoading(true);
    try { await api.saveSet(`Look ${(avatar?.savedSets?.length || 0) + 1}`, avatar.wearables); await loadAvatar(); }
    catch { alert("Failed to save look"); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // Determine the model URL to show in Three.js
  const modelUrl = avatar?.pifuhdUrl || avatar?.modelUrl || null;


  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
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
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center ${sidebarOpen ? 'space-x-4' : 'justify-center'} px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/50'
                : 'hover:bg-gray-800/50'
                }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${activeTab === id ? 'scale-110' : 'group-hover:scale-105'}`} />
              {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button onClick={handleLogout} className={`w-full flex items-center ${sidebarOpen ? 'space-x-2' : 'justify-center'} px-4 py-3 bg-gray-800 hover:bg-red-600/20 border border-gray-700 hover:border-red-600/50 rounded-lg transition-all duration-300 group`}>
            <LogOut className="w-5 h-5 flex-shrink-0 group-hover:text-red-400 transition-colors" />
            {sidebarOpen && <span className="text-sm font-medium group-hover:text-red-400 transition-colors">Logout</span>}
          </button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
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
            <span className="text-sm text-gray-400">Welcome, <span className="text-white font-semibold">{user?.username}</span></span>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
        </header>

        {/* ── HOME TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'home' && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-2xl blur-3xl group-hover:blur-3xl transition-all duration-500" />
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-8 group-hover:border-indigo-600/50 transition-all duration-300">
                {avatar ? (
                  <div>
                    <h2 className="text-2xl font-bold mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-6 h-6 text-indigo-400" />
                        <span>Your 3D Avatar</span>
                        {modelUrl && avatar?.pifuhdUrl === modelUrl && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full hidden sm:inline-block">PIFuHD</span>}
                      </div>

                    </h2>
                    <div className="h-[500px] rounded-xl overflow-hidden">
                      <RealisticAvatar3D
                        measurements={measurements}
                        showWearable={selectedWearable}
                        modelUrl={modelUrl}
                      />
                    </div>
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Height', value: `${measurements.height || '—'}cm` },
                        { label: 'Chest', value: `${measurements.chest || '—'}cm` },
                        { label: 'Waist', value: `${measurements.waist || '—'}cm` },
                        { label: 'Hips', value: `${measurements.hips || '—'}cm` },
                      ].map((s, i) => (
                        <div key={i} className="bg-gray-800/50 rounded-lg p-4 text-center">
                          <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                          <div className="text-lg font-bold text-indigo-400">{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                      <Ruler className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Build Your Photorealistic Avatar</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                      Generate a 1:1 photorealistic digital twin from a single photo.
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

            {/* Stats */}
            <div className="grid lg:grid-cols-3 gap-6">
              {[
                { label: 'Saved Looks', value: avatar?.savedSets?.length || 0, color: 'from-indigo-600/20 to-purple-600/20' },
                { label: 'Wearables Tried', value: avatar?.wearables?.length || 0, color: 'from-purple-600/20 to-pink-600/20' },
                { label: 'Avatar Status', value: avatar ? '✓ Ready' : '○ Pending', color: 'from-cyan-600/20 to-blue-600/20' },
              ].map((s, i) => (
                <div key={i} className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.color} rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500`} />
                  <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-6 text-center group-hover:border-indigo-600/50 transition-all duration-300">
                    <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{s.value}</div>
                    <div className="text-sm text-gray-400 mt-2">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AVATAR TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'avatar' && (
          <div className="p-8 animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-8">

              <div className="space-y-6 lg:col-span-2">
                <div className="relative group max-w-2xl mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl blur-3xl transition-all duration-500" />
                  <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-8 group-hover:border-purple-600/50 transition-all duration-300">
                    <div className="mb-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Upload Photo for 3D Avatar</h2>
                      <p className="text-gray-400 text-sm max-w-sm mx-auto">
                        Upload a clear, full-body image of yourself to generate a 3D digital twin.
                      </p>
                    </div>
                    <form onSubmit={handlePifuSubmit} className="space-y-4">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-xl cursor-pointer bg-black/50 hover:bg-black hover:border-purple-500 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">
                              <span className="font-semibold text-purple-400">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{pifuImage ? pifuImage.name : "PNG, JPG up to 10MB"}</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => setPifuImage(e.target.files[0])}
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        disabled={loading || !pifuImage}
                        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-600/50 transition-all duration-300 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
                      >
                        <Zap className="w-5 h-5" />
                        <span>{loading ? "Generating Model..." : "Generate 3D Avatar"}</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Right: manual measurements */}
              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all duration-300">
                    <h3 className="text-2xl font-bold mb-2 flex items-center space-x-2">
                      <Ruler className="w-6 h-6 text-indigo-400" />
                      <span>Measurements</span>
                    </h3>
                    <p className="text-gray-500 text-sm mb-6">Auto-filled after generation, or enter manually.</p>
                    <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                      {[
                        { key: 'height', label: 'Height (cm)', placeholder: '175', icon: '📏' },
                        { key: 'chest', label: 'Chest (cm)', placeholder: '96', icon: '👕' },
                        { key: 'waist', label: 'Waist (cm)', placeholder: '80', icon: '⭕' },
                        { key: 'hips', label: 'Hips (cm)', placeholder: '98', icon: '⬜' },
                        { key: 'shoulder', label: 'Shoulder Width (cm)', placeholder: '45', icon: '↔️' },
                        { key: 'inseam', label: 'Inseam (cm)', placeholder: '80', icon: '📐' },
                        { key: 'armLength', label: 'Arm Length (cm)', placeholder: '60', icon: '💪' },
                        { key: 'neckSize', label: 'Neck Size (cm)', placeholder: '37', icon: '⭕' },
                      ].map(({ key, label, placeholder, icon }) => (
                        <div key={key} className="group/field">
                          <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center space-x-2">
                            <span>{icon}</span><span>{label}</span>
                          </label>
                          <input
                            type="number"
                            placeholder={placeholder}
                            value={measurements[key]}
                            onChange={(e) => setMeasurements({ ...measurements, [key]: e.target.value })}
                            className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all duration-300 group-hover/field:border-gray-600"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleMeasurementSubmit}
                      disabled={loading}
                      className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'Saving…' : (avatar ? 'Update Measurements' : 'Save Measurements')}</span>
                    </button>
                  </div>
                </div>


              </div>
            </div>
          </div>
        )}

        {/* ── WEARABLES TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'wearables' && (
          <div className="p-8 space-y-8 animate-fade-in">
            {!avatar ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Camera className="w-16 h-16 mx-auto text-gray-600 mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold mb-2">Create Avatar First</h3>
                <p className="text-gray-400 mb-6">Generate your 3D avatar before trying on wearables</p>
                <button onClick={() => setActiveTab('avatar')} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg transition-all active:scale-95">Build Avatar Now</button>
              </div>
            ) : (
              <>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-2xl blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/50 transition-all duration-300">
                    <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                      <Shirt className="w-6 h-6 text-indigo-400" /><span>Add Wearables</span>
                    </h3>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="Paste product URL (Amazon, Myntra, etc.)…"
                        value={wearableInput}
                        onChange={(e) => setWearableInput(e.target.value)}
                        className="flex-1 px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                      <button onClick={handleAddWearable} disabled={loading} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50">
                        {loading ? '⏳' : '➕ Add'}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-4">Your Wearables ({avatar.wearables?.length || 0})</h3>
                  {!avatar.wearables?.length ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                      <Shirt className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">No wearables yet. Add one above!</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {avatar.wearables.map((w) => (
                        <div key={w._id} className="relative group">
                          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group-hover:border-indigo-600/50 transition-all duration-300">
                            <div className="aspect-square bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center text-5xl">
                              {w.thumbnail}
                            </div>
                            <div className="p-4">
                              <h4 className="font-semibold text-sm truncate mb-1">{w.name}</h4>
                              <p className="text-xs text-gray-500 mb-3 truncate">{w.url}</p>
                              <div className="flex gap-2">
                                <button onClick={() => setSelectedWearable(w)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${selectedWearable?._id === w._id ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-indigo-600/50'}`}>👁️ View</button>
                                <button onClick={() => deleteWearable(w._id)} disabled={loading} className="px-3 py-2 bg-gray-800 hover:bg-red-600/30 rounded-lg transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {avatar.wearables?.length > 0 && (
                  <div className="relative group">
                    <div className="relative bg-gray-900 border border-green-600/50 rounded-2xl p-8 group-hover:border-green-400/70 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold mb-1">Ready to Save Your Look?</h3>
                          <p className="text-gray-400">Store this combination for later</p>
                        </div>
                        <button onClick={handleSaveSet} disabled={loading} className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium hover:shadow-lg transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50">
                          <Save className="w-5 h-5" /><span>{loading ? 'Saving…' : 'Save Look'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SAVED SETS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'saved' && (
          <div className="p-8 space-y-8 animate-fade-in">
            {!avatar?.savedSets?.length ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Save className="w-16 h-16 mx-auto text-gray-600 mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold mb-2">No Saved Looks Yet</h3>
                <p className="text-gray-400 mb-6">Build an avatar, add wearables, and save your favourite looks!</p>
                <button onClick={() => setActiveTab('wearables')} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium hover:shadow-lg transition-all active:scale-95">Create Your First Look</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {avatar.savedSets.map((set) => (
                  <div key={set._id} className="relative group">
                    <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group-hover:border-indigo-600/50 transition-all">
                      <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-5xl">
                        {set.wearables.map((w) => w.thumbnail).join(' ')}
                      </div>
                      <div className="p-6">
                        <h4 className="font-bold text-lg mb-2">{set.name}</h4>
                        <div className="text-sm text-gray-400 space-y-1 mb-4">
                          <p>📅 {new Date(set.savedAt).toLocaleDateString()}</p>
                          <p>👕 {set.wearables.length} wearable{set.wearables.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-all active:scale-95">👁️ Preview</button>
                          <button onClick={() => deleteSet(set._id)} disabled={loading} className="px-3 py-2 bg-gray-800 hover:bg-red-600/30 rounded-lg transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 relative group">
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all space-y-6">
                  <h3 className="text-2xl font-bold flex items-center space-x-2">
                    <User className="w-6 h-6 text-indigo-400" /><span>Profile Settings</span>
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <input type="text" value={user?.username || ''} readOnly className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input type="email" value={user?.email || ''} readOnly className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white" />
                  </div>
                </div>
              </div>
              <div className="relative group">
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 group-hover:border-indigo-600/30 transition-all">
                  <h4 className="font-bold mb-6">Account Info</h4>
                  <div className="space-y-4 text-sm">
                    {[
                      { label: 'Avatar Status', value: avatar ? '✅ Active' : '⏳ Pending' },
                      { label: '3D Model', value: modelUrl ? '✅ Generated' : '⏳ Not yet' },
                      { label: 'Saved Looks', value: avatar?.savedSets?.length || 0 },
                      { label: 'Wearables', value: avatar?.wearables?.length || 0 },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-4 bg-gray-800/50 rounded-lg">
                        <p className="text-gray-400 mb-1">{label}</p>
                        <p className="font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
      `}</style>
    </div >
  );
};

export default Dashboard;