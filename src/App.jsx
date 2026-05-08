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
 * 環境變數讀取與 Firebase 初始化 (保留您原始版本的所有防錯邏輯)
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

  // 身份驗證監聽
  useEffect(() => {
    if (!auth) {
      setInitError('Firebase Auth 尚未初始化，請檢查環境變數。');
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

  // 數據即時監聽
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

  // 載入畫面
  if (loading && !initError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FDFBF7]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#8B6B4D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#8B6B4D] font-serif tracking-[0.2em] text-xs uppercase animate-pulse">Establishing Connection...</p>
        </div>
      </div>
    );
  }

  // 錯誤處理
  if (initError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FDFBF7] p-6">
        <div className="max-w-md w-full bg-white border border-red-100 p-8 rounded-[2rem] shadow-xl text-center">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layers size={24} />
          </div>
          <h3 className="font-bold text-lg text-red-900 mb-2">連線初始化失敗</h3>
          <p className="text-sm text-red-600/70 mb-6 leading-relaxed">{initError}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-500 text-white rounded-full text-sm font-bold">重新嘗試</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D241E] font-serif selection:bg-[#8B6B4D]/10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@300;400;700&display=swap');
        :root { font-family: 'Noto Serif TC', serif; }
        .font-sans { font-family: 'Noto Sans TC', sans-serif; }
        #root { width: 100% !important; max-width: 100% !important; margin: 0 !important; border: none !important; display: block !important; }
        @media print { .print-hidden { display: none !important; } body { background: white; } }
        .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); }
      `}</style>

      {/* 導航欄 */}
      <header className="glass border-b border-[#E8DCC4]/50 px-6 py-4 sticky top-0 z-50 print-hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#2D241E] w-10 h-10 rounded-full flex items-center justify-center text-[#FDFBF7] shadow-xl">
              <Layout size={20} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight m-0 leading-none">你家的好表</h1>
              <p className="text-[9px] tracking-[0.25em] text-[#A68B6D] uppercase font-sans font-bold m-0 mt-1 opacity-70">Curator Dashboard</p>
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
              className="p-3 bg-white border border-[#E8DCC4] rounded-full text-[#8B6B4D] hover:shadow-lg transition-all"
            >
              {copyFeedback ? <Check size={18} className="text-green-600" /> : <Share2 size={18} />}
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-sans text-sm font-bold transition-all ${
                isEditing ? 'bg-[#8B6B4D] text-white shadow-xl' : 'bg-[#2D241E] text-white shadow-xl'
              }`}
            >
              {isEditing ? <CheckCircle2 size={16} /> : <PencilLine size={16} />}
              {isEditing ? '儲存提案' : '編輯提案'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 md:py-16 space-y-12">
        {/* 封面看板 */}
        <section className="bg-white rounded-[2.5rem] p-10 md:p-16 border border-[#E8DCC4]/60 shadow-2xl shadow-[#8B6B4D]/5 flex flex-col md:flex-row justify-between items-end gap-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#8B6B4D]"></div>
          <div className="space-y-6 flex-1 w-full">
            <div className="flex items-center gap-3">
              <span className="w-12 h-[1px] bg-[#8B6B4D]"></span>
              <span className="text-xs font-sans font-bold text-[#8B6B4D] uppercase tracking-[0.4em]">Staging Proposal</span>
            </div>
            {isEditing ? (
              <div className="space-y-4">
                <input 
                  className="text-5xl font-bold w-full border-b border-[#E8DCC4] outline-none bg-transparent py-2 focus:border-[#8B6B4D]"
                  value={stagingData.projectInfo?.name || ""} 
                  onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, name: e.target.value}})}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="font-sans text-sm p-3 bg-[#FDFBF7] rounded-xl outline-none" value={stagingData.projectInfo?.address} onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, address: e.target.value}})} placeholder="地址" />
                  <input className="font-sans text-sm p-3 bg-[#FDFBF7] rounded-xl outline-none" value={stagingData.projectInfo?.styleDesc} onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, styleDesc: e.target.value}})} placeholder="風格描述" />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight m-0">{stagingData.projectInfo?.name}</h2>
                <div className="flex flex-wrap items-center gap-6 pt-4 text-[#A68B6D]">
                  <p className="flex items-center gap-2 m-0 text-lg"><MapPin size={20} /> {stagingData.projectInfo?.address}</p>
                  <p className="m-0 font-sans font-bold tracking-widest text-sm uppercase px-4 py-1.5 border border-[#E8DCC4] rounded-full">{stagingData.projectInfo?.styleDesc}</p>
                </div>
              </>
            )}
          </div>
          
          <div className="w-full md:w-auto bg-[#2D241E] text-white p-10 rounded-[2.5rem] md:min-w-[320px] shadow-2xl">
            <p className="text-[10px] font-sans font-bold opacity-50 uppercase tracking-[0.3em] mb-4">Estimate Total</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-light opacity-50">$</span>
              <span className="text-5xl font-sans font-bold tracking-tighter">{totalBudget.toLocaleString()}</span>
            </div>
            <p className="mt-6 mb-0 text-[11px] font-sans opacity-40 leading-relaxed">此為家具與裝飾之總計估額，<br/>不含現場施工費用。</p>
          </div>
        </section>

        {/* 空間選擇與內容 */}
        <div className="flex flex-col md:flex-row gap-12">
          {/* 左側空間切換 */}
          <aside className="w-full md:w-64 space-y-6 sticky top-28 print-hidden">
            <p className="text-[10px] font-sans font-bold text-[#D4C3A3] uppercase tracking-[0.3em] mb-6 pl-4 border-l border-[#E8DCC4]">Spaces Inventory</p>
            <div className="space-y-3">
              {stagingData.spaces?.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => setActiveSpaceId(s.id)} 
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 font-bold ${
                    activeSpaceId === s.id 
                    ? 'bg-[#8B6B4D] text-[#FDFBF7] shadow-xl translate-x-3' 
                    : 'bg-white text-[#8B6B4D] border border-[#E8DCC4]/40 hover:bg-[#FDFBF7]'
                  }`}
                >
                  <span>{s.name}</span>
                  <ArrowRight size={14} className={activeSpaceId === s.id ? 'opacity-100' : 'opacity-0'} />
                </button>
              ))}
            </div>

            {isEditing && (
              <button 
                onClick={() => {
                  const newId = `s${Date.now()}`;
                  syncToCloud({ ...stagingData, spaces: [...(stagingData.spaces || []), { id: newId, name: "新空間", items: [] }] });
                }} 
                className="w-full p-4 border-2 border-dashed border-[#E8DCC4] rounded-2xl text-[#A68B6D] hover:text-[#8B6B4D] flex items-center justify-center gap-2 transition-all font-sans text-xs font-bold"
              >
                <Plus size={14} /> 新增場域
              </button>
            )}
          </aside>

          {/* 右側表格 */}
          <section className="flex-1 bg-white rounded-[3rem] border border-[#E8DCC4]/60 shadow-xl overflow-hidden self-start">
            <div className="px-10 py-8 border-b border-[#FDFBF7] flex justify-between items-center bg-[#FDFBF7]/40">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-[#8B6B4D] rounded-full"></div>
                <h3 className="font-bold text-2xl tracking-tight">{activeSpace?.name || "請選取空間"} <span className="text-[#A68B6D] font-light ml-2">清單項目</span></h3>
              </div>
              {isEditing && activeSpace && (
                <button 
                  onClick={() => {
                    const newItem = { id: `i${Date.now()}`, name: "新家具品項", size: "規格", price: 0 };
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
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A68B6D] bg-[#FDFBF7]/30 border-b border-[#FDFBF7]">
                    <th className="px-10 py-5">品項名稱 Item</th>
                    <th className="px-10 py-5">規格尺寸 Spec</th>
                    <th className="px-10 py-5 text-right">估價 Price</th>
                    {isEditing && <th className="px-6 py-5 w-16"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FDFBF7]">
                  {(!activeSpace?.items || activeSpace.items.length === 0) && (
                    <tr>
                      <td colSpan={isEditing ? 4 : 3} className="px-10 py-20 text-center opacity-30">
                        <Layers size={40} className="mx-auto mb-4" />
                        <p className="font-bold tracking-widest text-xs">此空間尚無家具品項</p>
                      </td>
                    </tr>
                  )}
                  {activeSpace?.items?.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[#FDFBF7]/30 transition-colors">
                      <td className="px-10 py-8">
                        {isEditing ? (
                          <input 
                            className="font-bold text-lg w-full outline-none bg-transparent border-b border-[#E8DCC4] py-1" 
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
                            className="w-full outline-none bg-transparent border-b border-[#E8DCC4] py-1" 
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
                          <input 
                            type="number" 
                            className="text-right w-28 outline-none bg-[#FDFBF7] p-2 rounded-lg border border-[#E8DCC4] font-sans font-bold" 
                            value={item.price} 
                            onChange={(e) => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, price: parseInt(e.target.value) || 0} : i) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                          />
                        ) : `$${(item.price || 0).toLocaleString()}`}
                      </td>
                      {isEditing && (
                        <td className="px-6 py-8 text-right">
                          <button 
                            onClick={() => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                            className="text-red-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-[#FDFBF7]/40">
                    <td colSpan={2} className="px-10 py-6 text-right font-sans font-bold text-[#A68B6D] text-[10px] uppercase tracking-widest">Subtotal</td>
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
        <p className="text-[10px] font-sans font-bold text-[#D4C3A3] uppercase tracking-[0.5em] m-0">Curated by Home Staging Portfolio</p>
      </footer>
    </div>
  );
}
