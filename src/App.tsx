import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertCircle, 
  CheckCircle, 
  Building, 
  MapPin, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Info,
  X,
  Bell,
  Activity,
  Terminal,
  Volume2
} from 'lucide-react';

// --- TYPES ---
interface CrisisEvent {
  id: number;
  room: string;
  floor: string;
  building: string;
  type: string;
  urgency: 'Low' | 'Medium' | 'High';
  summary: string;
  timestamp: number;
  status: 'Active' | 'Escalated' | 'Resolved';
}

interface Toast {
  id: number;
  message: string;
  room: string;
}

// --- MOCK AI ---
const simulateAIProcessing = (input: string) => {
  const text = input.toLowerCase();

  if (text.includes("fire") || text.includes("smoke")) {
    return { type: "Fire", urgency: "High" as const, summary: "Potential fire/smoke detected in vicinity." };
  }
  
  const medicalKeywords = [
    "hurt", "blood", "pain", "unconscious", 
    "heart", "chest", "cardiac", "stroke", "numb", "speech", "face",
    "seizure", "fit", "convulsion", "allergic", "allergy", "sting", "anaphylaxis",
    "breath", "choke", "asthma", "suffocate"
  ];

  if (medicalKeywords.some(key => text.includes(key))) {
    let specificMsg = "Medical emergency reported.";
    if (text.includes("heart") || text.includes("chest")) specificMsg = "Cardiac emergency/Heart attack symptoms reported.";
    if (text.includes("stroke") || text.includes("speech") || text.includes("numb")) specificMsg = "Stroke symptoms detected (FAST check required).";
    if (text.includes("allergic") || text.includes("anaphylaxis")) specificMsg = "Severe allergic reaction/Anaphylaxis reported.";
    if (text.includes("breath") || text.includes("choke")) specificMsg = "Respiratory distress/Choking reported.";
    
    return { 
      type: "Medical", 
      urgency: "High" as const, 
      summary: `${specificMsg} Immediate medical assistance needed.` 
    };
  }

  if (text.includes("intruder") || text.includes("weapon") || text.includes("fight")) {
    return { type: "Security", urgency: "High" as const, summary: "Security threat detected. Lockdown protocols advised." };
  }

  return {
    type: "Incident",
    urgency: "Medium" as const,
    summary: input.length > 40 ? input.slice(0, 40) + "..." : input
  };
};

const getSuggestedAction = (type: string) => {
  switch (type) {
    case "Medical": return "Send medical staff immediately. Prepare first aid kit and clear hallways for stretcher access.";
    case "Fire": return "Trigger fire protocol. Evacuate nearby rooms and activate smoke suppression if manual.";
    case "Security": return "Alert security personnel. Initiate lockdown of the wing and monitor CCTV feeds.";
    default: return "Investigate incident area immediately. Report findings back to central monitoring node.";
  }
};

export default function App() {
  const [building, setBuilding] = useState("Building A");
  const [floor, setFloor] = useState("1");
  const [events, setEvents] = useState<CrisisEvent[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("101");
  const [isProcessing, setIsProcessing] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  // New UI States
  const [selectedEventForModal, setSelectedEventForModal] = useState<CrisisEvent | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isGlobalAlertActive, setIsGlobalAlertActive] = useState(false);

  const rooms = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const roomSuffix = (i + 1).toString().padStart(2, '0');
      return `${floor}${roomSuffix}`;
    });
  }, [floor]);

  useEffect(() => {
    setSelectedRoom(`${floor}01`);
  }, [floor]);

  // Audio simulation
  const playAlertSound = () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.2);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => prev.map(e => {
        if (e.status === "Active" && (Date.now() - e.timestamp) > 20000) {
          return { ...e, status: "Escalated" };
        }
        return e;
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sync Global Banner with Active Events
  useEffect(() => {
    const hasActive = events.some(e => e.status !== "Resolved");
    setIsGlobalAlertActive(hasActive);
  }, [events]);

  const triggerSOS = () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setAlertMessage(`Alerting Reception for Room ${selectedRoom}...`);

    setTimeout(() => {
      const ai = simulateAIProcessing(inputText);
      const newId = Date.now();
      const newEvent: CrisisEvent = {
        id: newId,
        room: selectedRoom,
        floor,
        building,
        ...ai,
        timestamp: Date.now(),
        status: "Active"
      };

      setEvents(prev => [newEvent, ...prev]);
      
      // Multi-channel alerts
      playAlertSound();
      const newToast = { id: newId, message: `Emergency detected in Room ${selectedRoom}`, room: selectedRoom };
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newId));
      }, 4000);

      setInputText("");
      setIsProcessing(false);
      setTimeout(() => setAlertMessage(null), 4000);
    }, 1500);
  };

  const resolveEvent = (id: number) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: "Resolved" } : e));
    if (selectedEventForModal?.id === id) {
      setSelectedEventForModal(null);
    }
  };

  const getStatusStyles = (event?: CrisisEvent) => {
    if (!event) return "bg-gray-50 text-gray-400 border border-gray-200 cursor-default";
    if (event.status === "Resolved") return "bg-green-100 text-green-700 border border-green-200 cursor-default";
    if (event.status === "Escalated") return "bg-red-700 text-white border border-red-800 shadow-lg shadow-red-200 cursor-pointer hover:bg-red-800";
    if (event.urgency === "High") return "bg-red-500 text-white border border-red-600 cursor-pointer hover:bg-red-600";
    if (event.urgency === "Medium") return "bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-200";
    return "bg-blue-500 text-white border border-blue-600 cursor-pointer hover:bg-blue-600";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* GLOBAL ALERT BANNER */}
      <AnimatePresence>
        {isGlobalAlertActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white text-center py-2 px-4 font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 overflow-hidden relative"
          >
            <motion.div 
              animate={{ opacity: [1, 0, 1] }} 
              transition={{ repeat: Infinity, duration: 1 }}
              className="flex items-center gap-3"
            >
              <AlertTriangle size={14} />
              ACTIVE EMERGENCY – RESPONSE REQUIRED
              <AlertTriangle size={14} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFCATIONS */}
      <div className="fixed top-20 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ x: 300, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 min-w-[300px] pointer-events-auto"
            >
              <div className="bg-red-600 p-2 rounded-lg">
                <Bell size={18} className="animate-bounce" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{toast.message}</p>
                <p className="text-[10px] text-slate-400 font-mono uppercase">Node Sync: Active</p>
              </div>
              <button 
                className="pointer-events-auto"
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              >
                <X size={16} className="text-slate-500 hover:text-white" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-opacity-90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-2 rounded-lg text-white">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">AegisAI</h1>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100">V2.4</span>
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Hospitality Emergency System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-full px-3 py-1.5 gap-2 border border-slate-200">
            <Building size={14} className="text-slate-400" />
            <select 
              value={building} 
              onChange={e => setBuilding(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option>Building A</option>
              <option>Building B</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 rounded-full px-3 py-1.5 gap-2 border border-slate-200">
            <MapPin size={14} className="text-slate-400" />
            <select 
              value={floor} 
              onChange={e => setFloor(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="1">Floor 1</option>
              <option value="2">Floor 2</option>
              <option value="3">Floor 3</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Trigger Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative">
            <div className="absolute top-4 right-4 flex items-center gap-1.5 text-slate-300">
              <Terminal size={12} />
              <span className="text-[10px] font-mono tracking-tighter uppercase">Reception Node</span>
            </div>

            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              Trigger SOS
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Target Selection</label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-red-500 focus:outline-none transition-all appearance-none"
                >
                  {rooms.map(r => <option key={r} value={r}>Room {r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Observation Logs</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm min-h-[120px] focus:ring-2 focus:ring-red-500 focus:outline-none transition-all resize-none"
                  placeholder="Describe emergency (e.g. 'heart attack symptoms', 'smoke on balcony')..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={triggerSOS}
                disabled={isProcessing || !inputText.trim()}
                className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all tracking-widest uppercase ${
                  isProcessing 
                    ? 'bg-slate-100 text-slate-400' 
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-100'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Syncing Node...
                  </>
                ) : (
                  <>
                    <Volume2 size={20} />
                    Deploy SOS Alert
                  </>
                )}
              </motion.button>

              <AnimatePresence>
                {alertMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 flex items-center gap-3"
                  >
                    <Info size={18} className="shrink-0" />
                    <p className="text-sm font-medium">{alertMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="font-black text-slate-500 text-[10px] uppercase mb-2 tracking-widest">Protocol Notice</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                AegisAI is a distributed response engine. All triggers are mirrored across Floor Staff, Security, and Management nodes simultaneously.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
              <ShieldAlert size={140} />
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative">
            <div className="absolute top-4 right-6 flex items-center gap-1.5 text-slate-300">
              <Activity size={12} />
              <span className="text-[10px] font-mono tracking-tighter uppercase">Central Monitoring Node</span>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Building className="text-blue-500" size={20} />
                  Floor Operations Grid
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{building} • Floor {floor}</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                  Nominal
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                  Active
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {rooms.map(room => {
                const ev = events.find(e => e.room === room && e.status !== "Resolved");
                
                return (
                  <motion.div
                    key={room}
                    whileHover={ev ? { scale: 1.05, y: -2 } : {}}
                    whileTap={ev ? { scale: 0.95 } : {}}
                    onClick={() => ev && setSelectedEventForModal(ev)}
                    className={`h-28 rounded-2x flex flex-col items-center justify-center gap-1 transition-all relative rounded-2xl ${getStatusStyles(ev)}`}
                  >
                    <span className="text-[10px] font-black opacity-60 tracking-widest">ROOM</span>
                    <span className="text-3xl font-black tracking-tighter">{room}</span>
                    
                    {ev && ev.status === "Escalated" && (
                      <motion.div 
                        initial={{ opacity: 0.5, scale: 0.8 }}
                        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 border-4 border-red-400 rounded-2xl"
                      />
                    )}
                    {ev && (
                      <div className="absolute top-2 right-2">
                        <Activity size={12} className="opacity-50" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <span className="text-[10px] text-slate-300 font-mono tracking-wider italic uppercase">Floor Staff Node Visibility: Localized</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 pl-2">
              <Clock className="text-slate-500" size={20} />
              Recent Event Log
            </h2>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {events.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center"
                  >
                    <p className="text-slate-400 font-medium tracking-tight">System standing by. No anomalies detected.</p>
                  </motion.div>
                ) : (
                  events.map(e => (
                    <motion.div
                      key={e.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => e.status !== "Resolved" && setSelectedEventForModal(e)}
                      className={`bg-white border p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-start cursor-pointer group transition-all ${
                        e.status === 'Resolved' ? 'border-slate-100 opacity-60' : 'border-slate-200 shadow-sm hover:border-slate-300'
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-xl shrink-0 ${
                          e.status === 'Resolved' ? 'bg-green-100 text-green-600' : 
                          e.status === 'Escalated' ? 'bg-red-100 text-red-600' : 'bg-red-50 text-red-500'
                        }`}>
                          {e.status === 'Resolved' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-lg">Room {e.room}</span>
                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                              e.status === 'Resolved' ? 'bg-green-100 text-green-700' : 
                              e.status === 'Escalated' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {e.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="font-bold text-sm text-slate-800 mb-1">{e.type} Discovery</p>
                          <p className="text-sm text-slate-500 leading-snug">{e.summary}</p>
                        </div>
                      </div>

                      {e.status !== "Resolved" ? (
                        <div className="flex flex-col items-end gap-2 shrink-0 self-end sm:self-center">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest hidden group-hover:block transition-all animate-pulse">View Details</span>
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      ) : (
                        <div className="text-[10px] font-black text-slate-300 uppercase self-center tracking-widest">Closed</div>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-100">
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          Synchronized across distributed emergency response nodes • AegisAI Mesh Protocol V2
        </p>
      </footer>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedEventForModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedEventForModal(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className={`p-6 text-white flex justify-between items-start ${
                selectedEventForModal.status === 'Escalated' ? 'bg-red-700' : 'bg-red-600'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Crisis Intelligence</span>
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter">Room {selectedEventForModal.room}</h3>
                </div>
                <button 
                  onClick={() => setSelectedEventForModal(null)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Crisis Type</p>
                    <p className="font-bold text-slate-800">{selectedEventForModal.type}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Urgency Level</p>
                    <p className={`font-black ${
                      selectedEventForModal.urgency === 'High' ? 'text-red-600' : 'text-amber-600'
                    }`}>{selectedEventForModal.urgency}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Sync</p>
                    <p className="font-medium text-slate-600">
                      {new Date(selectedEventForModal.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status State</p>
                    <p className="font-black text-slate-800 uppercase text-xs">{selectedEventForModal.status}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">AI Summary</p>
                  <p className="text-sm leading-relaxed text-slate-700 italic">"{selectedEventForModal.summary}"</p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal size={14} className="text-blue-600" />
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Suggested Action</p>
                    </div>
                    <p className="text-sm font-bold text-blue-900 leading-relaxed">
                      {getSuggestedAction(selectedEventForModal.type)}
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
                    <Terminal size={80} />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => resolveEvent(selectedEventForModal.id)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black text-sm tracking-[0.2em] uppercase shadow-lg shadow-green-100 transition-colors"
                >
                  Confirm Resolution
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
