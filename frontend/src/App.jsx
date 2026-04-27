import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, User, Clock, Calendar, CheckCircle, Download, LogOut, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api/attendance';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [records, setRecords] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchRecords();
    }
    // Cleanup camera on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLoggedIn]);

  const fetchRecords = async () => {
    try {
      const res = await axios.get(API_URL);
      setRecords(res.data);
    } catch (err) {
      console.error('Error fetching records:', err);
      // Fallback for demo if backend is not yet running
      const local = JSON.parse(localStorage.getItem('swiftcheck_logs') || '[]');
      if (local.length > 0) setRecords(local);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      setIsLoggedIn(true);
    } else {
      alert("Please enter both username and password.");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        setStatus('Camera ready. Align your face.');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('Could not access camera.');
    }
  };

  const takeAttendance = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setLoading(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        const now = new Date();
        
        const record = {
          name: username,
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString(),
          status: 'Present',
          image: imageData
        };

        await axios.post(API_URL, record);
        setStatus('Attendance marked successfully!');
        fetchRecords();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setStatus('Failed to save to MongoDB. (Check if server is running)');
      
      // Local fallback
      const now = new Date();
      const fallbackRecord = {
        _id: Date.now().toString(),
        name: username,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        status: 'Present',
        image: canvas.toDataURL('image/png')
      };
      const local = JSON.parse(localStorage.getItem('swiftcheck_logs') || '[]');
      localStorage.setItem('swiftcheck_logs', JSON.stringify([fallbackRecord, ...local]));
      setRecords(prev => [fallbackRecord, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchRecords();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const exportToCSV = () => {
    if (records.length === 0) return;
    const headers = "Name,Date,Time,Status\n";
    const csvContent = records.map(r => `${r.name},${r.date},${r.time},${r.status}`).join("\n");
    const blob = new Blob([headers + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative">
        <div className="mesh-container">
          <div className="mesh-circle c1"></div>
          <div className="mesh-circle c2"></div>
          <div className="mesh-circle c3"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card p-12 rounded-[2.5rem] w-full max-w-md relative overflow-hidden group"
        >
          {/* Subtle Glow Overlay */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-[60px] group-hover:bg-indigo-500/20 transition-all duration-700"></div>
          
          <div className="flex flex-col items-center mb-10 relative">
            <motion.div 
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              className="bg-indigo-500/10 p-5 rounded-3xl mb-6 ring-1 ring-white/10"
            >
              <ShieldCheck className="w-12 h-12 text-indigo-400" />
            </motion.div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">SwiftCheck</h1>
            <p className="text-slate-500 text-center text-sm font-medium uppercase tracking-widest">AI Attendance Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8 relative">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Administrator Name</label>
              <div className="relative group/input">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="glass-input w-full pl-14"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative group/input">
                <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-14"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-5 text-lg group">
              Access Dashboard 
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <CheckCircle className="w-5 h-5" />
              </motion.div>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12 relative">
      <div className="mesh-container">
        <div className="mesh-circle c1"></div>
        <div className="mesh-circle c2"></div>
        <div className="mesh-circle c3"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-6"
          >
            <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-xl shadow-indigo-500/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">System Terminal</h1>
              <p className="text-slate-400 font-medium">Logged in as <span className="text-indigo-400 font-bold underline underline-offset-4 decoration-indigo-500/30">{username}</span></p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <button onClick={exportToCSV} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2">
              <Download className="w-5 h-5" /> Export Logs
            </button>
            <button onClick={() => window.location.reload()} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border border-rose-500/10">
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Camera Section */}
          <div className="lg:col-span-5 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-[2.5rem] overflow-hidden relative aspect-video group"
            >
              {!isCameraActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md">
                  <div className="bg-indigo-500/10 p-8 rounded-full mb-4 border border-white/5 group-hover:scale-110 transition-transform duration-700">
                    <Camera className="w-12 h-12 text-indigo-400" />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Awaiting Lens Initialization</p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
              
              <AnimatePresence>
                {loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-indigo-600/30 backdrop-blur-xl flex items-center justify-center"
                  >
                    <RefreshCw className="w-16 h-16 text-white animate-spin" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute top-6 left-6 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full animate-pulse ${isCameraActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                  {isCameraActive ? 'Lens Live' : 'Lens Offline'}
                </span>
              </div>
            </motion.div>

            <div className="flex gap-4">
              {!isCameraActive ? (
                <button onClick={startCamera} className="btn-primary flex-1 py-5">
                  <Camera className="w-6 h-6" /> Initialize Lens
                </button>
              ) : (
                <button 
                  onClick={takeAttendance} 
                  disabled={loading}
                  className="btn-secondary flex-1 py-5 shadow-2xl shadow-emerald-500/20"
                >
                  <CheckCircle className="w-6 h-6" /> Confirm Presence
                </button>
              )}
            </div>
            
            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-4 rounded-2xl text-center font-bold text-sm border ${
                    status.includes('successfully') 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {status}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Table Section */}
          <div className="lg:col-span-7">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="font-black text-xl text-white tracking-tight">Activity Feed</h3>
                <span className="bg-indigo-600 text-white text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-tighter shadow-lg shadow-indigo-500/20">
                  {records.length} Verified Sessions
                </span>
              </div>
              
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-10">
                    <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-8 py-6">Participant</th>
                      <th className="px-8 py-6">Timestamp</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {records.map((record) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={record._id || record.id} 
                        className="group hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img src={record.image} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-indigo-500/50 transition-all duration-500" />
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#020617]"></div>
                            </div>
                            <span className="font-bold text-slate-100 text-base">{record.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-slate-300 font-bold uppercase tracking-wider">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {record.date}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black">
                              <Clock className="w-3.5 h-3.5" /> {record.time}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            {record.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <button 
                            onClick={() => deleteRecord(record._id || record.id)}
                            className="p-3 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-8 py-32 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <RefreshCw className="w-12 h-12 text-slate-800" />
                            <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No activity detected on current frequency</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
