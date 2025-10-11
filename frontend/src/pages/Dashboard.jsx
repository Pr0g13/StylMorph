import React, { useState } from 'react';
import { Upload, Save, Trash2, Eye, Plus, Settings, LogOut } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('measurements');
  const [measurements, setMeasurements] = useState({
    height: '',
    chest: '',
    waist: '',
    hips: '',
    inseam: '',
    skinTone: ''
  });
  const [avatars, setAvatars] = useState([
    { id: 1, name: 'Avatar 1', created: '2025-01-15', status: 'active' }
  ]);
  const [savedLooks, setSavedLooks] = useState([]);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleMeasurementChange = (field, value) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveMeasurements = () => {
    setFormSubmitted(true);
    console.log('Measurements saved:', measurements);
    setTimeout(() => setFormSubmitted(false), 3000);
  };

  const handleCreateAvatar = () => {
    const newAvatar = {
      id: avatars.length + 1,
      name: `Avatar ${avatars.length + 1}`,
      created: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    setAvatars([...avatars, newAvatar]);
  };

  const handleDeleteAvatar = (id) => {
    setAvatars(avatars.filter(avatar => avatar.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              <span className="text-white font-bold">SM</span>
            </div>
            <h1 className="text-2xl font-bold text-white">StylMorph</h1>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white transition-colors">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6 sticky top-20">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Menu</h2>
              <nav className="space-y-2">
                {[
                  { id: 'measurements', label: 'Body Measurements', icon: '📏' },
                  { id: 'avatars', label: 'My Avatars', icon: '👤' },
                  { id: 'looks', label: 'Saved Looks', icon: '👕' },
                  { id: 'settings', label: 'Settings', icon: '⚙️' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Body Measurements Tab */}
            {activeTab === 'measurements' && (
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-8">
                <h2 className="text-3xl font-bold text-white mb-2">Body Measurements</h2>
                <p className="text-slate-400 mb-8">Enter your measurements to create a personalized 3D avatar</p>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: 'Height (cm)', field: 'height' },
                      { label: 'Chest (cm)', field: 'chest' },
                      { label: 'Waist (cm)', field: 'waist' },
                      { label: 'Hips (cm)', field: 'hips' },
                      { label: 'Inseam (cm)', field: 'inseam' }
                    ].map(item => (
                      <div key={item.field}>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          {item.label}
                        </label>
                        <input
                          type="number"
                          value={measurements[item.field]}
                          onChange={(e) => handleMeasurementChange(item.field, e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
                          placeholder="Enter value"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Skin Tone
                    </label>
                    <select
                      value={measurements.skinTone}
                      onChange={(e) => handleMeasurementChange('skinTone', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select skin tone</option>
                      <option value="fair">Fair</option>
                      <option value="medium">Medium</option>
                      <option value="olive">Olive</option>
                      <option value="deep">Deep</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSaveMeasurements}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105"
                  >
                    <Save size={20} />
                    Save Measurements & Generate Avatar
                  </button>

                  {formSubmitted && (
                    <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300">
                      ✓ Measurements saved successfully! Your 3D avatar is being generated...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* My Avatars Tab */}
            {activeTab === 'avatars' && (
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">My Avatars</h2>
                    <p className="text-slate-400">Manage your 3D avatars for virtual try-ons</p>
                  </div>
                  <button
                    onClick={handleCreateAvatar}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold flex items-center gap-2 transition-all duration-200"
                  >
                    <Plus size={20} />
                    Create Avatar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {avatars.map(avatar => (
                    <div
                      key={avatar.id}
                      className="bg-slate-900/50 rounded-lg border border-slate-600/50 p-6 hover:border-purple-500/50 transition-all duration-200"
                    >
                      <div className="h-40 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg mb-4 flex items-center justify-center">
                        <span className="text-slate-500 text-4xl">👤</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{avatar.name}</h3>
                      <p className="text-sm text-slate-400 mb-4">Created: {avatar.created}</p>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white font-medium flex items-center justify-center gap-2 transition-colors">
                          <Eye size={18} />
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteAvatar(avatar.id)}
                          className="flex-1 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Trash2 size={18} />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Looks Tab */}
            {activeTab === 'looks' && (
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-8">
                <h2 className="text-3xl font-bold text-white mb-2">Saved Looks</h2>
                <p className="text-slate-400 mb-8">Your collection of virtual try-on looks</p>

                {savedLooks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">👕</div>
                    <p className="text-slate-400 mb-4">No saved looks yet</p>
                    <p className="text-slate-500 text-sm">Start by creating an avatar and trying on garments</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {savedLooks.map((look, idx) => (
                      <div key={idx} className="bg-slate-900/50 rounded-lg border border-slate-600/50 overflow-hidden hover:border-purple-500/50 transition-all duration-200">
                        <div className="h-32 bg-gradient-to-br from-slate-700 to-slate-800"></div>
                        <div className="p-4">
                          <h3 className="font-semibold text-white">{look.name}</h3>
                          <p className="text-sm text-slate-400">{look.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-8">
                <h2 className="text-3xl font-bold text-white mb-8">Settings</h2>

                <div className="space-y-6">
                  <div className="border-b border-slate-700/50 pb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <input type="email" className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white" placeholder="user@example.com" disabled />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                        <input type="text" className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white" placeholder="Your username" />
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-slate-700/50 pb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
                      <span className="text-slate-300">Receive AI recommendations</span>
                    </label>
                  </div>

                  <button className="w-full py-3 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white font-semibold transition-colors">
                    Save Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}