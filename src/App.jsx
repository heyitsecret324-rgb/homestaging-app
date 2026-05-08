import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Home, CheckCircle2, Plus, Trash2, 
  Check, PencilLine, Share2, MapPin, 
  Printer, Layout, ArrowRight, Layers
} from 'lucide-react';

/**
 * 核心配置與初始化
 */
function getFirebaseConfig() {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.error("Firebase config parse error", e);
  }
  return {
    apiKey: "", // 環境會自動注入
    projectId: "homestaging-v1",
  };
}

const firebaseConfig = getFirebaseConfig();
const appId = (typeof __app_id !== 'undefined' && __app_id) ? __app_id : "homestaging-v1";

let app, auth, db;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
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
  const [loading, setLoading] = useState(true);

  const hasLoadedInitial = useRef(false);

  // 1. 處理身份驗證
  useEffect(() => {
    if (!auth) return;
    const urlParams = new URLSearchParams(window.location.search);
    setProjectId(urlParams.get('project') || 'demo_project');

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error:", err); }
    };
    
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      if(u) setUser(u);
    });
  }, []);

  // 2. 監聽數據
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
          projectInfo: { name: "新建軟裝提案", address: "請輸入建案地址...", styleDesc: "現代極簡主義" },
          spaces: [{ id: "s1", name: "客廳空間", items: [{ id: "i1", name: "質感沙發", size: "W240 * D90 cm", price: 0 }] }]
        };
        setStagingData(defaultData);
        setActiveSpaceId("s1");
        setDoc(docRef, defaultData);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
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
    return stagingData?.spaces?.reduce((sum, s) => 
      sum + (s.items?.reduce((as, i) => as + (Number(i.price) || 0), 0) || 0), 0
    ) || 0;
  }, [stagingData]);

  if (loading || !stagingData) return (
    <div className="flex h-screen items-center justify-center bg-[#FDFBF7]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-[#8B6B4D] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#8B6B4D] font-serif tracking-[0.2em] text-xs uppercase animate-pulse">Refining Proposal...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D241E] font-serif selection:bg-[#8B6B4D]/10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@300;400;700&display=swap');
        :root { font-family: 'Noto Serif TC', serif; }
        .font-sans { font-family: 'Noto Sans TC', sans-serif; }
        #root { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
        @media print { .print-hidden { display: none !important; } body { background: white; } }
        .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); }
      `}</style>

      {/* 導航欄 - 更加精緻 */}
      <header className="glass border-b border-[#E8DCC4]/50 px-6 py-4 sticky top-0 z-50 print-hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#2D241E] w-10 h-10 rounded-full flex items-center justify-center text-[#FDFBF7] shadow-xl">
              <Layout size={20} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight m-0">你家的好表</h1>
              <p className="text-[10px] tracking-[0.25em] text-[#A68B6D] uppercase font-sans font-bold m-0 opacity-70">Soft-Decor Curator</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              className="p-3 bg-white border border-[#E8DCC4] rounded-full text-[#8B6B4D] hover:shadow-lg transition-all active:scale-90"
            >
              {copyFeedback ? <Check size={18} className="text-green-600" /> : <Share2 size={18} />}
            </button>
            <button 
              onClick={() => window.print()}
              className="p-3 bg-white border border-[#E8DCC4] rounded-full text-[#8B6B4D] hover:shadow-lg transition-all active:scale-90"
            >
              <Printer size={18} />
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-sans text-sm font-bold transition-all ${
                isEditing 
                ? 'bg-[#8B6B4D] text-white shadow-xl shadow-[#8B6B4D]/20' 
                : 'bg-[#2D241E] text-white shadow-xl hover:bg-black'
              }`}
            >
              {isEditing ? <CheckCircle2 size={16} /> : <PencilLine size={16} />}
              {isEditing ? '儲存變更' : '編輯內容'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 md:py-16 space-y-12">
        {/* 封面區域 - 增加簡報張力 */}
        <section className="relative group">
          <div className="absolute -inset-4 bg-[#8B6B4D]/5 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white rounded-[2.5rem] p-10 md:p-16 border border-[#E8DCC4]/60 shadow-2xl shadow-[#8B6B4D]/5 flex flex-col md:flex-row justify-between items-end gap-10">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-3">
                <span className="w-12 h-[1px] bg-[#8B6B4D]"></span>
                <span className="text-xs font-sans font-bold text-[#8B6B4D] uppercase tracking-[0.4em]">Proposal Document</span>
              </div>
              {isEditing ? (
                <div className="space-y-4 w-full">
                  <input 
                    className="text-5xl font-bold w-full border-b-2 border-[#8B6B4D]/20 outline-none bg-transparent py-2 focus:border-[#8B6B4D] transition-colors"
                    value={stagingData.projectInfo?.name || ""} 
                    onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, name: e.target.value}})}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input className="font-sans text-sm p-3 bg-[#FDFBF7] rounded-xl outline-none" value={stagingData.projectInfo?.address} onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, address: e.target.value}})} />
                    <input className="font-sans text-sm p-3 bg-[#FDFBF7] rounded-xl outline-none" value={stagingData.projectInfo?.styleDesc} onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, styleDesc: e.target.value}})} />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight">{stagingData.projectInfo?.name}</h2>
                  <div className="flex flex-wrap items-center gap-6 pt-4 text-[#A68B6D]">
                    <p className="flex items-center gap-2 m-0 text-lg"><MapPin size={20} /> {stagingData.projectInfo?.address}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8DCC4]"></span>
                    <p className="m-0 font-sans font-bold tracking-widest text-sm uppercase px-4 py-1.5 border border-[#E8DCC4] rounded-full">{stagingData.projectInfo?.styleDesc}</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="w-full md:w-auto bg-[#2D241E] text-white p-10 rounded-[2.5rem] md:min-w-[320px] shadow-2xl relative overflow-hidden group/total">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover/total:scale-150 transition-transform">
                <Layers size={80} />
              </div>
              <p className="text-[10px] font-sans font-bold opacity-50 uppercase tracking-[0.3em] mb-4">Estimate Total</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light opacity-50">$</span>
                <span className="text-5xl font-sans font-bold tracking-tighter">{totalBudget.toLocaleString()}</span>
              </div>
              <p className="mt-6 mb-0 text-xs font-sans opacity-40 leading-relaxed">此金額包含所有空間之軟裝單品估價，<br/>不含施工與稅務支出。</p>
            </div>
          </div>
        </section>

        {/* 內容區塊 */}
        <div className="flex flex-col md:flex-row gap-12 items-start">
          {/* 側邊導航 */}
          <aside className="w-full md:w-64 space-y-6 sticky top-28 print-hidden">
            <div>
              <p className="text-[10px] font-sans font-bold text-[#D4C3A3] uppercase tracking-[0.3em] mb-6 pl-4 border-l border-[#E8DCC4]">Spaces Inventory</p>
              <div className="space-y-3">
                {stagingData.spaces?.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setActiveSpaceId(s.id)} 
                    className={`w-full group flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-500 font-bold ${
                      activeSpaceId === s.id 
                      ? 'bg-[#8B6B4D] text-[#FDFBF7] shadow-2xl shadow-[#8B6B4D]/30 translate-x-3' 
                      : 'bg-white text-[#8B6B4D] border border-[#E8DCC4]/40 hover:bg-[#FDFBF7] hover:border-[#8B6B4D]'
                    }`}
                  >
                    <span>{s.name}</span>
                    <ArrowRight size={14} className={`transition-transform duration-500 ${activeSpaceId === s.id ? 'opacity-100' : 'opacity-0 -translate-x-4'}`} />
                  </button>
                ))}
              </div>
            </div>

            {isEditing && (
              <button 
                onClick={() => {
                  const newId = `s${Date.now()}`;
                  syncToCloud({ ...stagingData, spaces: [...(stagingData.spaces || []), { id: newId, name: "新場域空間", items: [] }] });
                }} 
                className="w-full p-4 border-2 border-dashed border-[#E8DCC4] rounded-2xl text-[#A68B6D] hover:text-[#8B6B4D] hover:border-[#8B6B4D] flex items-center justify-center gap-2 transition-all font-sans text-sm font-bold"
              >
                <Plus size={16} /> 新增場域
              </button>
            )}
          </aside>

          {/* 表格內容 */}
          <section className="flex-1 bg-white rounded-[3rem] border border-[#E8DCC4]/60 shadow-xl overflow-hidden">
            <div className="px-10 py-8 border-b border-[#FDFBF7] flex justify-between items-center bg-[#FDFBF7]/40">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-[#8B6B4D] rounded-full"></div>
                <h3 className="font-bold text-2xl tracking-tight">{activeSpace?.name || "Select Space"} <span className="text-[#A68B6D] font-light ml-2">清單項目</span></h3>
              </div>
              {isEditing && activeSpace && (
                <button 
                  onClick={() => {
                    const newItem = { id: `i${Date.now()}`, name: "新單品名稱", size: "規格尺寸", price: 0 };
                    const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: [...(s.items || []), newItem] } : s);
                    syncToCloud({ ...stagingData, spaces: newSpaces });
                  }} 
                  className="bg-[#2D241E] text-white px-5 py-2.5 rounded-full text-xs font-sans font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg"
                >
                  <Plus size={14} /> 新增品項
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px] border-collapse">
                <thead>
                  <tr className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A68B6D] bg-[#FDFBF7]/30">
                    <th className="px-10 py-5">品項名稱 Item Name</th>
                    <th className="px-10 py-5">規格規格 Size/Spec</th>
                    <th className="px-10 py-5 text-right">單價 Estimate</th>
                    {isEditing && <th className="px-6 py-5 w-16"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FDFBF7]">
                  {(!activeSpace?.items || activeSpace.items.length === 0) && (
                    <tr>
                      <td colSpan={isEditing ? 4 : 3} className="px-10 py-20 text-center">
                        <div className="max-w-xs mx-auto space-y-4 opacity-30">
                          <Layers size={48} className="mx-auto" />
                          <p className="font-bold tracking-widest text-sm uppercase">尚無品項資料</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {activeSpace?.items?.map((item, idx) => (
                    <tr key={item.id} className="group hover:bg-[#FDFBF7]/50 transition-colors">
                      <td className="px-10 py-8">
                        {isEditing ? (
                          <input 
                            className="font-bold text-lg w-full outline-none bg-transparent border-b border-transparent focus:border-[#8B6B4D] py-1" 
                            value={item.name} 
                            onChange={(e) => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, name: e.target.value} : i) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                          />
                        ) : <div className="flex items-center gap-4"><span className="text-[#E8DCC4] font-sans text-xs">{String(idx+1).padStart(2,'0')}</span><span className="font-bold text-lg">{item.name}</span></div>}
                      </td>
                      <td className="px-10 py-8 text-[#8B6B4D] font-sans text-sm">
                        {isEditing ? (
                          <input 
                            className="w-full outline-none bg-transparent border-b border-transparent focus:border-[#8B6B4D] py-1" 
                            value={item.size} 
                            onChange={(e) => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, size: e.target.value} : i) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                          />
                        ) : item.size}
                      </td>
                      <td className="px-10 py-8 text-right font-bold text-[#2D241E] font-sans text-xl">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs opacity-30">$</span>
                            <input 
                              type="number" 
                              className="text-right w-28 outline-none bg-[#FDFBF7] p-2 rounded-lg border border-transparent focus:border-[#8B6B4D] font-sans font-bold" 
                              value={item.price} 
                              onChange={(e) => {
                                const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, price: parseInt(e.target.value) || 0} : i) } : s);
                                syncToCloud({...stagingData, spaces: newSpaces});
                              }} 
                            />
                          </div>
                        ) : `$${(item.price || 0).toLocaleString()}`}
                      </td>
                      {isEditing && (
                        <td className="px-6 py-8 text-right">
                          <button 
                            onClick={() => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                            className="text-red-200 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* 小計 */}
                  <tr className="bg-[#FDFBF7]/20">
                    <td colSpan={2} className="px-10 py-6 text-right font-sans font-bold text-[#A68B6D] text-xs uppercase tracking-widest">Subtotal for this space</td>
                    <td className="px-10 py-6 text-right font-sans font-bold text-2xl text-[#8B6B4D]">
                      ${(activeSpace?.items?.reduce((as, i) => as + (Number(i.price) || 0), 0) || 0).toLocaleString()}
                    </td>
                    {isEditing && <td></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-12 text-center print-hidden">
        <div className="w-12 h-[1px] bg-[#E8DCC4] mx-auto mb-6"></div>
        <p className="text-[10px] font-sans font-bold text-[#D4C3A3] uppercase tracking-[0.5em] m-0">Curated by Home Staging Portfolio System</p>
      </footer>
    </div>
  );
}
