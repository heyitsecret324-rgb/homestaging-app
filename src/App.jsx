import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Home, CheckCircle2, Plus, Trash2, 
  Check, PencilLine, Share2, MapPin, 
  Printer, Layout, ArrowRight, Layers,
  ChevronRight, Calendar
} from 'lucide-react';

/**
 * 環境變數讀取與 Firebase 初始化
 */
function pickViteEnv(key, fallback = '') {
  try {
    const v = import.meta?.env?.[key];
    return typeof v === 'string' ? v : fallback;
  } catch {
    return fallback;
  }
}

function getFirebaseConfig() {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.error("Firebase config parse error", e);
  }

  return {
    apiKey: pickViteEnv('VITE_FIREBASE_API_KEY'),
    authDomain: pickViteEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: pickViteEnv('VITE_FIREBASE_PROJECT_ID', 'homestaging-v1'),
    storageBucket: pickViteEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: pickViteEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: pickViteEnv('VITE_FIREBASE_APP_ID'),
  };
}

const firebaseConfig = getFirebaseConfig();
const appId = (typeof __app_id !== 'undefined' && __app_id) ? __app_id : pickViteEnv('VITE_FIREBASE_APP_ID', "homestaging-v1");

let app, auth, db;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase init failed", error);
}

export default function App() {
  const [stagingData, setStagingData] = useState(null); 
  const [activeSpaceId, setActiveSpaceId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [initError, setInitError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const hasLoadedInitial = useRef(false);

  useEffect(() => {
    if (!auth) {
      setInitError('Firebase Auth 尚未初始化');
      setLoading(false);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('project') || 'demo_project';
    setProjectId(pid);

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  useEffect(() => {
    if (!projectId || !user || !db) return;

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
    
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStagingData(data);
        if (!hasLoadedInitial.current && data.spaces?.length > 0) {
          setActiveSpaceId(data.spaces[0].id);
          hasLoadedInitial.current = true;
        }
      } else {
        const defaultData = {
          projectInfo: { name: "新建軟裝提案", address: "未設定地址", styleDesc: "現代極簡" },
          spaces: [{ id: "s1", name: "客廳", items: [] }]
        };
        setStagingData(defaultData);
        setActiveSpaceId("s1");
        setDoc(docRef, defaultData).catch(console.error);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore snapshot error:", err);
      setInitError(`資料庫連線失敗: ${err.message}`);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [projectId, user]);

  const syncToCloud = async (newData) => {
    if (!user || !db || !projectId) return;
    setStagingData(newData);
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
    await setDoc(docRef, newData).catch(console.error);
  };

  const activeSpace = useMemo(() => 
    stagingData?.spaces?.find(s => s.id === activeSpaceId) || stagingData?.spaces?.[0], 
    [stagingData, activeSpaceId]
  );

  const totalBudget = useMemo(() => {
    if (!stagingData?.spaces) return 0;
    return stagingData.spaces.reduce((sum, s) => {
      return sum + (s.items?.reduce((as, i) => as + (Number(i.price) || 0), 0) || 0);
    }, 0);
  }, [stagingData]);

  if (loading && !initError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#8B6B4D] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[#8B6B4D] font-serif tracking-[0.3em] text-xs uppercase">Connecting to Database</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6] p-6">
        <div className="max-w-md w-full bg-white border border-red-50 p-10 rounded-[3rem] shadow-2xl text-center">
          <Layers size={32} className="text-red-300 mx-auto mb-6" />
          <h3 className="font-bold text-xl text-[#2D241E] mb-4">初始化異常</h3>
          <p className="text-sm text-[#A68B6D] mb-8 leading-relaxed">{initError}</p>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-[#2D241E] text-white rounded-2xl text-sm font-bold tracking-widest">RELOAD PAGE</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D241E] font-serif selection:bg-[#8B6B4D]/10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@300;400;700&display=swap');
        :root { font-family: 'Noto Serif TC', serif; }
        .font-sans { font-family: 'Noto Sans TC', sans-serif; }
        #root { width: 100% !important; max-width: 100% !important; margin: 0 !important; border: none !important; display: block !important; }
        @media print { .print-hidden { display: none !important; } body { background: white; } }
        .glass { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); }
        .slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <header className="glass border-b border-[#E8DCC4]/30 px-8 py-5 sticky top-0 z-50 print-hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-[#2D241E] w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3">
              <Layout size={22} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight m-0 leading-none">你家的好表</h1>
              <p className="text-[9px] tracking-[0.4em] text-[#A68B6D] uppercase font-sans font-bold m-0 mt-1.5 opacity-60">Staging Dashboard v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const el = document.createElement('input');
                el.value = window.location.href;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                setCopyFeedback(true);
                setTimeout(() => setCopyFeedback(false), 2000);
              }} 
              className="p-3 bg-white border border-[#E8DCC4]/50 rounded-full text-[#8B6B4D] hover:bg-[#8B6B4D] hover:text-white transition-all shadow-sm"
            >
              {copyFeedback ? <Check size={18} /> : <Share2 size={18} />}
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`flex items-center gap-3 px-8 py-3 rounded-full font-sans text-xs font-bold tracking-[0.1em] transition-all ${
                isEditing ? 'bg-[#8B6B4D] text-white shadow-xl scale-105' : 'bg-[#2D241E] text-white shadow-lg'
              }`}
            >
              {isEditing ? <CheckCircle2 size={16} /> : <PencilLine size={16} />}
              {isEditing ? 'FINISH EDIT' : 'EDIT PROPOSAL'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12 md:py-20 space-y-16 slide-up">
        {/* Project Hero Section */}
        <section className="relative bg-white rounded-[3rem] p-12 md:p-20 border border-[#E8DCC4]/40 shadow-2xl shadow-[#8B6B4D]/5 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDFBF7] rounded-full -mr-32 -mt-32 z-0"></div>
          <div className="absolute bottom-0 left-0 w-32 h-1 bg-[#8B6B4D]"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
            <div className="flex-1 space-y-8">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-sans font-bold text-[#8B6B4D] uppercase tracking-[0.5em] bg-[#FDFBF7] px-4 py-1.5 rounded-full border border-[#E8DCC4]/30">Interior Proposal</span>
                <span className="text-[10px] font-sans font-bold text-[#A68B6D] uppercase tracking-[0.2em] opacity-40">/ 2024 Edition</span>
              </div>
              
              {isEditing ? (
                <div className="space-y-6">
                  <input 
                    className="text-5xl md:text-7xl font-bold w-full border-b-2 border-[#E8DCC4] outline-none bg-transparent py-2 focus:border-[#8B6B4D] transition-all"
                    value={stagingData.projectInfo?.name || ""} 
                    onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, name: e.target.value}})}
                  />
                  <div className="flex flex-wrap gap-4">
                    <input className="font-sans text-sm px-5 py-3 bg-[#FAF9F6] rounded-2xl border border-[#E8DCC4]/30 outline-none w-full md:w-auto min-w-[300px]" value={stagingData.projectInfo?.address} onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, address: e.target.value}})} placeholder="輸入案件地址..." />
                    <input className="font-sans text-sm px-5 py-3 bg-[#FAF9F6] rounded-2xl border border-[#E8DCC4]/30 outline-none w-full md:w-auto" value={stagingData.projectInfo?.styleDesc} onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, styleDesc: e.target.value}})} placeholder="風格描述..." />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-5xl md:text-7xl font-bold leading-[1] tracking-tight m-0 text-[#2D241E]">{stagingData.projectInfo?.name}</h2>
                  <div className="flex flex-wrap items-center gap-8 text-[#A68B6D]">
                    <p className="flex items-center gap-2.5 m-0 text-lg font-medium italic"><MapPin size={18} className="text-[#8B6B4D]" /> {stagingData.projectInfo?.address}</p>
                    <div className="h-4 w-[1px] bg-[#E8DCC4] hidden md:block"></div>
                    <p className="m-0 font-sans font-bold tracking-widest text-[10px] uppercase bg-[#FAF9F6] px-5 py-2 rounded-full border border-[#E8DCC4]/30">{stagingData.projectInfo?.styleDesc}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Price Tag Box - Refined */}
            <div className="w-full md:w-[340px] bg-[#2D241E] text-white p-12 rounded-[2.5rem] shadow-3xl transform hover:-translate-y-2 transition-transform duration-500">
              <div className="flex justify-between items-center mb-6 opacity-40">
                <p className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] m-0">Project Valuation</p>
                <Calendar size={14} />
              </div>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-2xl font-light opacity-30">$</span>
                <span className="text-6xl font-sans font-bold tracking-tighter tabular-nums">{totalBudget.toLocaleString()}</span>
              </div>
              <div className="space-y-1.5 opacity-30 text-[10px] font-sans leading-relaxed">
                <p className="m-0">估值僅包含家具與家飾清單</p>
                <p className="m-0">實際報價依採購當時官網與庫存為準</p>
              </div>
            </div>
          </div>
        </section>

        {/* Content Layout */}
        <div className="flex flex-col md:flex-row gap-16 items-start">
          {/* Navigation Sidebar */}
          <aside className="w-full md:w-72 space-y-10 sticky top-32 print-hidden">
            <div>
              <p className="text-[10px] font-sans font-bold text-[#8B6B4D] uppercase tracking-[0.4em] mb-6 pl-5 border-l-2 border-[#8B6B4D]">Space Catalog</p>
              <div className="space-y-4">
                {stagingData.spaces?.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setActiveSpaceId(s.id)} 
                    className={`w-full flex items-center justify-between px-8 py-5 rounded-[1.5rem] transition-all duration-500 group ${
                      activeSpaceId === s.id 
                      ? 'bg-white text-[#2D241E] shadow-2xl shadow-[#8B6B4D]/10 border border-[#E8DCC4]/40 translate-x-4' 
                      : 'text-[#A68B6D] hover:text-[#8B6B4D] hover:translate-x-2'
                    }`}
                  >
                    <span className={`font-bold text-lg ${activeSpaceId === s.id ? 'opacity-100' : 'opacity-60'}`}>{s.name}</span>
                    <ChevronRight size={16} className={`transition-all ${activeSpaceId === s.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} />
                  </button>
                ))}
              </div>
            </div>

            {isEditing && (
              <button 
                onClick={() => {
                  const newId = `s${Date.now()}`;
                  syncToCloud({ ...stagingData, spaces: [...(stagingData.spaces || []), { id: newId, name: "新場域", items: [] }] });
                }} 
                className="w-full p-6 border-2 border-dashed border-[#E8DCC4] rounded-[1.5rem] text-[#D4C3A3] hover:text-[#8B6B4D] hover:border-[#8B6B4D] flex items-center justify-center gap-3 transition-all font-sans text-[11px] font-bold tracking-widest uppercase"
              >
                <Plus size={16} /> Add New Space
              </button>
            )}
          </aside>

          {/* Table Content */}
          <section className="flex-1 w-full bg-white rounded-[3rem] border border-[#E8DCC4]/40 shadow-xl shadow-[#8B6B4D]/5 overflow-hidden">
            {/* Table Header */}
            <div className="px-12 py-10 border-b border-[#FAF9F6] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-[#FDFBF7]/50">
              <div className="flex items-center gap-6">
                <div className="w-1.5 h-10 bg-[#8B6B4D] rounded-full"></div>
                <div>
                  <h3 className="font-bold text-3xl tracking-tight m-0">{activeSpace?.name || "場域內容"}</h3>
                  <p className="text-[10px] font-sans font-bold text-[#A68B6D] uppercase tracking-[0.3em] mt-1.5">Furniture Inventory & Specs</p>
                </div>
              </div>
              {isEditing && activeSpace && (
                <button 
                  onClick={() => {
                    const newItem = { id: `i${Date.now()}`, name: "新家具品項", size: "規格描述", price: 0 };
                    const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: [...(s.items || []), newItem] } : s);
                    syncToCloud({ ...stagingData, spaces: newSpaces });
                  }} 
                  className="bg-[#2D241E] text-white px-8 py-3.5 rounded-full text-xs font-sans font-bold hover:bg-black transition-all flex items-center gap-3 shadow-lg group"
                >
                  <Plus size={14} className="group-hover:rotate-90 transition-transform" /> ADD ITEM
                </button>
              )}
            </div>
            
            {/* Table Body */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4C3A3] border-b border-[#FAF9F6]">
                    <th className="px-12 py-6">Item Description</th>
                    <th className="px-12 py-6">Specifications</th>
                    <th className="px-12 py-6 text-right">Estimate</th>
                    {isEditing && <th className="px-8 py-6 w-20"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF9F6]">
                  {(!activeSpace?.items || activeSpace.items.length === 0) ? (
                    <tr>
                      <td colSpan={isEditing ? 4 : 3} className="px-12 py-32 text-center">
                        <div className="max-w-[200px] mx-auto opacity-20 space-y-4">
                          <Layers size={48} className="mx-auto" />
                          <p className="font-sans font-bold tracking-[0.2em] text-xs">NO ITEMS ADDED</p>
                        </div>
                      </td>
                    </tr>
                  ) : activeSpace.items.map((item, idx) => (
                    <tr key={item.id} className="group hover:bg-[#FAF9F6]/40 transition-colors">
                      <td className="px-12 py-9">
                        {isEditing ? (
                          <input 
                            className="font-bold text-lg w-full outline-none bg-transparent border-b border-[#E8DCC4] py-1 focus:border-[#8B6B4D]" 
                            value={item.name} 
                            onChange={(e) => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, name: e.target.value} : i) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                          />
                        ) : (
                          <div className="flex items-baseline gap-5">
                            <span className="text-[10px] font-sans font-bold text-[#D4C3A3] tabular-nums">{(idx + 1).toString().padStart(2, '0')}</span>
                            <span className="font-bold text-xl text-[#2D241E]">{item.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-12 py-9">
                        {isEditing ? (
                          <input 
                            className="w-full outline-none bg-transparent border-b border-[#E8DCC4] py-1 font-sans text-sm focus:border-[#8B6B4D]" 
                            value={item.size} 
                            onChange={(e) => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, size: e.target.value} : i) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                          />
                        ) : <span className="font-sans text-sm text-[#8B6B4D] font-medium leading-relaxed">{item.size}</span>}
                      </td>
                      <td className="px-12 py-9 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-2 bg-[#FAF9F6] p-2 rounded-xl border border-[#E8DCC4]/30">
                            <span className="text-xs opacity-30">$</span>
                            <input 
                              type="number" 
                              className="text-right w-24 outline-none bg-transparent font-sans font-bold" 
                              value={item.price} 
                              onChange={(e) => {
                                const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, price: parseInt(e.target.value) || 0} : i) } : s);
                                syncToCloud({...stagingData, spaces: newSpaces});
                              }} 
                            />
                          </div>
                        ) : (
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="text-xs opacity-30 font-light">$</span>
                            <span className="font-sans font-bold text-2xl tracking-tighter text-[#2D241E] tabular-nums">{(item.price || 0).toLocaleString()}</span>
                          </div>
                        )}
                      </td>
                      {isEditing && (
                        <td className="px-8 py-9 text-right">
                          <button 
                            onClick={() => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                            className="text-[#E8DCC4] hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Space Footer */}
                  <tr className="bg-[#FDFBF7]/50">
                    <td colSpan={2} className="px-12 py-8 text-right font-sans font-bold text-[#D4C3A3] text-[10px] uppercase tracking-[0.4em]">Space Subtotal</td>
                    <td className="px-12 py-8 text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xs opacity-30">$</span>
                        <span className="font-sans font-bold text-3xl tracking-tighter text-[#8B6B4D] tabular-nums">
                          ${(activeSpace?.items?.reduce((as, i) => as + (Number(i.price) || 0), 0) || 0).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    {isEditing && <td></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-20 text-center opacity-40">
        <div className="w-16 h-[1px] bg-[#8B6B4D] mx-auto mb-10"></div>
        <p className="text-[9px] font-sans font-bold text-[#2D241E] uppercase tracking-[0.6em] m-0">Designed & Curated by Home Staging Portfolio</p>
        <p className="text-[8px] font-sans mt-4 tracking-widest opacity-60">© 2024 ALL RIGHTS RESERVED</p>
      </footer>
    </div>
  );
}
