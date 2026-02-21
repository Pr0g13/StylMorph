// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  LogOut, Settings, Plus, Save, X, Upload, Shirt, Ruler,
  ChevronRight, Menu, Zap, Camera, User, Trash2
} from 'lucide-react';
import * as api from '../services/api';
import RealisticAvatar3D from '../components/RealisticAvatar3D';

// ── Pipeline stages shown during generation ───────────────────────────────────
const PIPELINE_STAGES = [
  "📸 Uploading images…",
  "🤖 Detecting body landmarks (MediaPipe)…",
  "📐 Extracting measurements from 4 views…",
  "🧬 Fitting SMPL body model…",
  "💾 Saving to database…",
  "☁️  Uploading 3D model to Cloudinary…",
  "✅ Done!",
];

// ── Single image drop-zone ────────────────────────────────────────────────────
const ImageZone = ({ label, emoji, photo, onUpload, onRemove }) => (
  <div className="relative group/zone">
    <div
      className={`aspect-[3/4] rounded-xl border-2 border-dashed overflow-hidden transition-all duration-300 ${photo
        ? "border-green-500/60 bg-green-500/5"
        : "border-gray-700 bg-gray-900 hover:border-indigo-500/60 hover:bg-gray-800/50"
        }`}
    >
      {photo ? (
        <div className="relative w-full h-full">
          <img src={photo.preview} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-2 right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <button
            onClick={onRemove}
            className="absolute top-2 left-2 p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg backdrop-blur-sm transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="absolute bottom-2 left-2 text-white text-xs font-semibold">{label}</p>
        </div>
      ) : (
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
          <span className="text-4xl mb-2">{emoji}</span>
          <span className="text-sm font-medium text-gray-400">{label}</span>
          <span className="text-xs text-gray-600 mt-1">Click to upload</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])}
          />
        </label>
      )}
    </div>
  </div>
);

// ── Pipeline progress bar ─────────────────────────────────────────────────────
const PipelineProgress = ({ stage }) => (
  <div className="mt-6 bg-gray-900/80 border border-gray-700 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-indigo-400">Generating 3D Model</span>
      <span className="text-xs text-gray-400">
        Step {stage + 1}/{PIPELINE_STAGES.length}
      </span>
    </div>
    <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
      <div
        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-700"
        style={{ width: `${((stage + 1) / PIPELINE_STAGES.length) * 100}%` }}
      />
    </div>
    <p className="text-sm text-gray-300 animate-pulse">{PIPELINE_STAGES[stage]}</p>
  </div>
);

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

  // 4 photos for SMPL pipeline
  const [photos, setPhotos] = useState({ front: null, back: null, left: null, right: null });
  const [heightInput, setHeightInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(null); // null = hidden
  const [selectedWearable, setSelectedWearable] = useState(null);
  const [wearableInput, setWearableInput] = useState('');
  const [showRPMModal, setShowRPMModal] = useState(false);

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

  // ── Photo helpers ───────────────────────────────────────────────────────────
  const setPhoto = (key, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setPhotos((p) => ({ ...p, [key]: { file, preview: reader.result } }));
    reader.readAsDataURL(file);
  };
  const removePhoto = (key) => setPhotos((p) => ({ ...p, [key]: null }));

  // ── Generate SMPL avatar ────────────────────────────────────────────────────
  const handleGenerateAvatar = async () => {
    const { front, back, left, right } = photos;
    if (!front || !back || !left || !right) {
      alert("Please upload all 4 photos (front, back, left, right).");
      return;
    }
    if (!heightInput || isNaN(parseFloat(heightInput))) {
      alert("Please enter your height in centimetres.");
      return;
    }

    setLoading(true);
    setPipelineStage(0);

    try {
      const formData = new FormData();
      formData.append("height", heightInput);
      formData.append("front", front.file);
      formData.append("back", back.file);
      formData.append("left", left.file);
      formData.append("right", right.file);

      // Simulate stage ticks while waiting for backend
      let stage = 0;
      const tick = setInterval(() => {
        stage = Math.min(stage + 1, PIPELINE_STAGES.length - 2);
        setPipelineStage(stage);
      }, 3500);

      const result = await api.generateSMPLAvatar(formData);
      clearInterval(tick);
      setPipelineStage(PIPELINE_STAGES.length - 1);

      if (!result.success) throw new Error(result.error || "Generation failed");

      // Merge measurements into local state
      const m = result.measurements;
      setMeasurements({
        height: m.height || '',
        chest: m.chest || '',
        waist: m.waist || '',
        hips: m.hips || '',
        shoulder: m.shoulder || '',
        inseam: m.inseam || '',
        armLength: m.armLength || '',
        neckSize: m.neckSize || '',
      });

      // Update avatar in local state with new model URL
      setAvatar((prev) => ({
        ...(prev || {}),
        measurements: m,
        smplModelUrl: result.modelUrl,
      }));

      setTimeout(() => {
        setPipelineStage(null);
        setActiveTab('home');
      }, 1500);

    } catch (err) {
      setPipelineStage(null);
      alert("Failed to generate avatar:\n" + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
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
  const modelUrl = avatar?.smplModelUrl || avatar?.modelUrl || null;

  // Check how many photos are uploaded
  const photoCount = Object.values(photos).filter(Boolean).length;
  const allPhotosReady = photoCount === 4;

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
                    <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                      <User className="w-6 h-6 text-indigo-400" />
                      <span>Your 3D Avatar</span>
                      {modelUrl && <span className="ml-2 text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">SMPL Model</span>}
                    </h2>
                    <div className="h-[500px] rounded-xl overflow-hidden">
                      <RealisticAvatar3D
                        measurements={measurements}
                        showWearable={selectedWearable}
                        modelUrl={avatar?.smplModelUrl}
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
                    <h2 className="text-3xl font-bold mb-4">Build Your 3D Avatar</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                      Upload 4 body photos and we'll generate a personalised SMPL 3D model with accurate measurements.
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

              {/* Left: 4-image upload + generate */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 rounded-2xl blur-3xl transition-all duration-500" />
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-8 group-hover:border-cyan-600/50 transition-all duration-300">

                  <div className="mb-6">
                    <h2 className="text-2xl font-bold flex items-center space-x-2 mb-1">
                      <Camera className="w-6 h-6 text-cyan-400" />
                      <span>Upload 4 Body Photos</span>
                    </h2>
                    <p className="text-gray-400 text-sm">
                      We use all 4 views for more accurate measurements.
                      Wear fitted clothes, stand straight against a plain background.
                    </p>
                  </div>

                  {/* 2×2 photo grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { key: 'front', label: 'Front', emoji: '🧍' },
                      { key: 'back', label: 'Back', emoji: '🔙' },
                      { key: 'left', label: 'Left Side', emoji: '👈' },
                      { key: 'right', label: 'Right Side', emoji: '👉' },
                    ].map(({ key, label, emoji }) => (
                      <ImageZone
                        key={key}
                        label={label}
                        emoji={emoji}
                        photo={photos[key]}
                        onUpload={(f) => setPhoto(key, f)}
                        onRemove={() => removePhoto(key)}
                      />
                    ))}
                  </div>

                  {/* Photo counter */}
                  <div className="flex items-center gap-2 mb-5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < photoCount ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gray-700'
                          }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">{photoCount}/4</span>
                  </div>

                  {/* Height input */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-300 mb-2">📏 Your Height (cm)</label>
                    <input
                      type="number"
                      placeholder="e.g. 175"
                      value={heightInput}
                      onChange={(e) => setHeightInput(e.target.value)}
                      min={100}
                      max={230}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-600/20 transition-all duration-300"
                    />
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={handleGenerateAvatar}
                    disabled={loading || !allPhotosReady || !heightInput}
                    className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-600/50 transition-all duration-300 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-5 h-5" />
                    <span>{loading ? 'Generating…' : 'Generate 3D Avatar'}</span>
                    {!loading && allPhotosReady && heightInput && (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  {/* Pipeline progress */}
                  {pipelineStage !== null && <PipelineProgress stage={pipelineStage} />}
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

                {/* Ready Player Me */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 group-hover:border-purple-600/30 transition-all duration-300">
                    <h4 className="font-semibold mb-2 flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span>Advanced: Ready Player Me</span>
                    </h4>
                    <p className="text-sm text-gray-400 mb-4">Create a photorealistic avatar using Ready Player Me</p>
                    <button
                      onClick={() => setShowRPMModal(true)}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-all"
                    >
                      Open Ready Player Me
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

      {/* ── Ready Player Me Modal ──────────────────────────────────────────── */}
      {showRPMModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="relative bg-gray-950 rounded-2xl w-full max-w-4xl h-[80vh] border border-gray-800 shadow-2xl overflow-hidden">
            <button onClick={() => setShowRPMModal(false)} className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white bg-black/50 backdrop-blur-sm p-2 rounded-lg">
              <X className="w-6 h-6" />
            </button>
            <iframe src="https://demo.readyplayer.me/avatar?frameApi" className="w-full h-full" allow="camera *; microphone *" />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
      `}</style>
    </div>
  );
};

export default Dashboard;