import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Home, CheckCircle2, Plus, Trash2, 
  Check, PencilLine, Share2, MapPin
} from 'lucide-react';

/**
 * 錯誤修正：加強對環境變數的檢查，避免 Script Error 崩潰
 */
let firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "homestaging-v1",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    firebaseConfig = JSON.parse(__firebase_config);
  }
} catch (e) {
  console.error("Firebase config parse error", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : "homestaging-v1";

// 初始化 Firebase 實例並封裝在 try-catch 中
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
  
  const hasLoadedInitial = useRef(false);

  // 處理身份驗證
  useEffect(() => {
    if (!auth) return;

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
        console.error("Auth process error:", err);
      }
    };
    
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 監聽數據
  useEffect(() => {
    if (!projectId || !user || !db) return;

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStagingData(data);
        if (!hasLoadedInitial.current && data.spaces?.length > 0) {
          setActiveSpaceId(data.spaces[0].id);
          hasLoadedInitial.current = true;
        }
      } else {
        const defaultData = {
          projectInfo: { name: "新建軟裝提案", address: "未設定地址", styleDesc: "北歐簡約" },
          spaces: [{ id: "s1", name: "客廳", items: [] }]
        };
        setStagingData(defaultData);
        setActiveSpaceId("s1");
        setDoc(docRef, defaultData).catch(e => console.error("Initial setDoc error:", e));
      }
    }, (err) => {
      console.error("Firestore error in snapshot:", err);
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
    stagingData?.spaces?.find(s => s.id === activeSpaceId), 
    [stagingData, activeSpaceId]
  );

  const totalBudget = useMemo(() => {
    if (!stagingData?.spaces) return 0;
    return stagingData.spaces.reduce((sum, s) => {
      const spaceTotal = s.items?.reduce((as, i) => as + (Number(i.price) || 0), 0) || 0;
      return sum + spaceTotal;
    }, 0);
  }, [stagingData]);

  if (!stagingData) return (
    <div className="flex h-screen items-center justify-center bg-[#F8F5F1]">
      <div className="text-center animate-pulse">
        <Home className="w-12 h-12 text-[#8B6B4D] mx-auto mb-4" />
        <p className="text-[#8B6B4D] font-serif tracking-widest">初始化中，請稍候...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F5F1] text-[#4A3728] font-serif">
      <style>{`
        #root { width: 100% !important; max-width: 100% !important; margin: 0 !important; border: none !important; text-align: left !important; display: block !important; }
        @media print { .print-hidden { display: none !important; } }
      `}</style>

      <header className="bg-white/80 backdrop-blur-md border-b border-[#E8DCC4] p-4 sticky top-0 z-50 shadow-sm print-hidden">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-[#8B6B4D] p-2 rounded-xl text-white shadow-md"><Home className="w-5 h-5" /></div>
            <div>
              <h1 className="font-bold text-lg leading-tight m-0">你家的好表</h1>
              <p className="text-[9px] tracking-widest text-[#A68B6D] uppercase font-sans m-0">Home Staging Portfolio</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
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
              className="px-4 py-2 bg-white border border-[#E8DCC4] rounded-full flex items-center gap-2 hover:bg-[#FDFBF7] transition-all"
            >
              {copyFeedback ? <Check className="w-3 h-3 text-green-500" /> : <Share2 className="w-3 h-3" />} 分享連結
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 transition-all ${isEditing ? 'bg-[#8B6B4D] text-white shadow-lg' : 'bg-white border border-[#E8DCC4]'}`}
            >
              {isEditing ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PencilLine className="w-3.5 h-3.5" />} {isEditing ? '完成編輯' : '編輯提案'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">
        <section className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-[#E8DCC4] shadow-xl shadow-[#8B6B4D]/5 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#8B6B4D]"></div>
          <div className="space-y-4 flex-1 w-full">
            <div className="inline-block px-3 py-1 bg-[#FDFBF7] border border-[#E8DCC4] rounded-full text-[10px] font-bold text-[#A68B6D] uppercase tracking-widest">Project Proposal</div>
            {isEditing ? (
              <input 
                className="text-4xl font-bold w-full border-b border-[#E8DCC4] outline-none bg-transparent py-2"
                value={stagingData.projectInfo?.name || ""} 
                onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, name: e.target.value}})}
              />
            ) : <h2 className="text-4xl font-bold m-0 break-words">{stagingData.projectInfo?.name}</h2>}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#A68B6D]">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {stagingData.projectInfo?.address}</p>
              <p className="px-3 py-1 bg-[#FDFBF7] rounded-lg border border-[#E8DCC4]/50">風格：{stagingData.projectInfo?.styleDesc}</p>
            </div>
          </div>
          <div className="bg-[#4A3728] text-white p-8 rounded-[2rem] min-w-[240px] text-center shadow-2xl">
            <p className="text-[10px] opacity-60 uppercase tracking-widest mb-1">Total Estimate</p>
            <p className="text-4xl font-bold font-sans tracking-tighter">${totalBudget.toLocaleString()}</p>
          </div>
        </section>

        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-60 space-y-3 print-hidden">
            <p className="text-[10px] font-bold text-[#D4C3A3] uppercase tracking-widest px-4">Spaces</p>
            {stagingData.spaces?.map(s => (
              <button 
                key={s.id} 
                onClick={() => setActiveSpaceId(s.id)} 
                className={`w-full text-left px-6 py-4 rounded-2xl transition-all font-bold ${activeSpaceId === s.id ? 'bg-[#8B6B4D] text-white shadow-lg translate-x-2' : 'bg-white text-[#8B6B4D] border border-[#E8DCC4] hover:bg-white/50'}`}
              >
                {s.name}
              </button>
            ))}
            {isEditing && (
              <button 
                onClick={() => {
                  const newId = `s${Date.now()}`;
                  syncToCloud({ ...stagingData, spaces: [...(stagingData.spaces || []), { id: newId, name: "新空間", items: [] }] });
                }} 
                className="w-full p-4 border-2 border-dashed border-[#E8DCC4] rounded-2xl text-[#D4C3A3] hover:text-[#8B6B4D] flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> 新增場域
              </button>
            )}
          </aside>

          <section className="flex-1 bg-white rounded-[2rem] border border-[#E8DCC4] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-[#F2E8D5] flex flex-wrap justify-between items-center bg-[#FDFBF7]/50 gap-4">
              <h3 className="font-bold text-xl m-0">{activeSpace?.name || "未選擇場域"} 家具清單</h3>
              {isEditing && activeSpace && (
                <button 
                  onClick={() => {
                    const newItem = { id: `i${Date.now()}`, name: "新家具品項", size: "標準規格", price: 0 };
                    const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: [...(s.items || []), newItem] } : s);
                    syncToCloud({ ...stagingData, spaces: newSpaces });
                  }} 
                  className="bg-[#8B6B4D] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#4A3728] transition-colors flex items-center gap-2 shadow-md"
                >
                  <Plus className="w-4 h-4" /> 新增品項
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-[#A68B6D] border-b border-[#F2E8D5]">
                    <th className="p-8">品項 Item</th>
                    <th className="p-8">規格 Size</th>
                    <th className="p-8 text-right">單價 Price</th>
                    {isEditing && <th className="p-8 w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8D5]">
                  {activeSpace?.items?.map(item => (
                    <tr key={item.id} className="hover:bg-[#FDFBF7]/30 transition-colors">
                      <td className="p-8">
                        {isEditing ? (
                          <input 
                            className="font-bold text-base w-full outline-none bg-transparent border-b border-[#E8DCC4]" 
                            value={item.name} 
                            onChange={(e) => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, name: e.target.value} : i) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                          />
                        ) : <span className="font-bold text-base">{item.name}</span>}
                      </td>
                      <td className="p-8 text-sm text-[#A68B6D]">
                        {isEditing ? (
                          <input 
                            className="w-full outline-none bg-transparent" 
                            value={item.size} 
                            onChange={(e) => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, size: e.target.value} : i) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                          />
                        ) : item.size}
                      </td>
                      <td className="p-8 text-right font-bold text-[#8B6B4D] font-sans">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="text-right w-24 outline-none border-b border-[#E8DCC4]" 
                            value={item.price} 
                            onChange={(e) => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, price: parseInt(e.target.value) || 0} : i) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                          />
                        ) : `$${(item.price || 0).toLocaleString()}`}
                      </td>
                      {isEditing && (
                        <td className="p-8 text-right">
                          <button 
                            onClick={() => {
                              const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s);
                              syncToCloud({...stagingData, spaces: newSpaces});
                            }} 
                            className="text-red-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
