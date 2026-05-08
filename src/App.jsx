import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Home, Sofa, Utensils, Bath, Bed, Sun, Package, 
  CheckCircle2, Plus, Trash2, 
  Layout, Coffee, Waves, Monitor, Armchair,
  Lamp, Flower2, Check, PencilLine, Share2,
  Image as ImageIcon, Upload, MapPin
} from 'lucide-react';

/**
 * [重要] 請替換為你自己的 Firebase Config
 */
const firebaseConfig = {
  apiKey: "AIzaSyA8MOkIEyWQf17TYKpmMynv6HHmIepux8Y",
  authDomain: "home-staging-portfolio.firebaseapp.com",
  projectId: "home-staging-portfolio",
  storageBucket: "home-staging-portfolio.firebasestorage.app",
  messagingSenderId: "725258548325",
  appId: "1:725258548325:web:54f29da99eb4c9619fc28c"
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let app, auth, db;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

const ICON_OPTIONS = [
  { id: 'Sofa', component: <Sofa className="w-6 h-6" /> },
  { id: 'Utensils', component: <Utensils className="w-6 h-6" /> },
  { id: 'Bath', component: <Bath className="w-6 h-6" /> },
  { id: 'Bed', component: <Bed className="w-6 h-6" /> },
  { id: 'Layout', component: <Layout className="w-6 h-6" /> }
];

const DEFAULT_DATA = {
  projectInfo: { 
    name: "新建軟裝提案", 
    address: "請輸入案件地址...",
    peopleCount: "2位大人", 
    styleDesc: "北歐簡約風",
    colorPalette: "原木色、米白"
  },
  spaces: [
    { id: "s1", name: "客廳", iconId: "Sofa", items: [] }
  ]
};

export default function App() {
  const [stagingData, setStagingData] = useState(null); 
  const [activeSpaceId, setActiveSpaceId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const hasLoadedInitial = useRef(false);

  // 1. 初始化驗證 (遵循 RULE 3)
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 處理專案 ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setProjectId(urlParams.get('project') || 'p_demo');
  }, []);

  // 3. 監聽資料 (遵循 RULE 1)
  useEffect(() => {
    if (!user || !projectId) return;

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
        setStagingData(DEFAULT_DATA);
        setActiveSpaceId(DEFAULT_DATA.spaces[0].id);
        setDoc(docRef, DEFAULT_DATA);
      }
    }, (err) => {
      console.error("Firestore Error:", err);
    });

    return () => unsubscribe();
  }, [user, projectId]);

  const syncToCloud = async (newData) => {
    if (!user || !projectId) return;
    setStagingData(newData);
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
    await setDoc(docRef, newData);
  };

  const activeSpace = useMemo(() => 
    stagingData?.spaces?.find(s => s.id === activeSpaceId), 
    [stagingData, activeSpaceId]
  );

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?project=${projectId}`;
    const textArea = document.createElement("textarea");
    textArea.value = shareUrl;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  if (!stagingData) return <div className="flex h-screen items-center justify-center bg-[#F8F5F1] text-[#8B6B4D]">載入專案中...</div>;

  return (
    <div className="min-h-screen bg-[#F8F5F1] text-[#4A3728] font-serif pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E8DCC4] p-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-[#8B6B4D] p-2 rounded-xl text-white"><Home className="w-5 h-5" /></div>
          <div>
            <h1 className="font-bold text-lg">你家的好表</h1>
            <p className="text-[9px] tracking-widest text-[#A68B6D] uppercase">Home Staging Portfolio</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={copyShareLink} className="px-4 py-2 bg-white border border-[#E8DCC4] rounded-full text-xs flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
            {copyFeedback ? <Check className="w-3 h-3 text-green-500" /> : <Share2 className="w-3 h-3" />} 分享
          </button>
          <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-md transition-all ${isEditing ? 'bg-[#8B6B4D] text-white' : 'bg-white border border-[#E8DCC4]'}`}>
            {isEditing ? <CheckCircle2 className="w-3 h-3" /> : <PencilLine className="w-3 h-3" />} {isEditing ? '完成' : '編輯'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <section className="bg-white rounded-3xl p-8 border border-[#E8DCC4] shadow-sm flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <label className="text-[10px] font-bold text-[#D4C3A3] uppercase tracking-widest block">Project Overview</label>
            {isEditing ? (
              <input className="text-3xl font-bold w-full border-b border-gray-100 outline-none" value={stagingData.projectInfo.name} onChange={(e) => syncToCloud({...stagingData, projectInfo: {...stagingData.projectInfo, name: e.target.value}})} />
            ) : <h2 className="text-3xl font-bold">{stagingData.projectInfo.name}</h2>}
            <p className="flex items-center gap-2 text-sm text-[#A68B6D]"><MapPin className="w-4 h-4" /> {stagingData.projectInfo.address}</p>
          </div>
          <div className="md:w-64 bg-[#FDFBF7] p-6 rounded-2xl border border-[#F2E8D5]">
            <p className="text-xs text-[#8B6B4D] mb-1 font-bold">風格預設</p>
            <p className="text-lg font-bold">{stagingData.projectInfo.styleDesc}</p>
          </div>
        </section>

        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-56 space-y-2">
            {stagingData.spaces.map(s => (
              <button key={s.id} onClick={() => setActiveSpaceId(s.id)} className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center gap-3 font-bold border ${activeSpaceId === s.id ? 'bg-[#8B6B4D] text-white border-[#8B6B4D] shadow-lg' : 'bg-white text-[#8B6B4D] border-[#E8DCC4] hover:bg-gray-50'}`}>
                <Layout className="w-4 h-4" /> {s.name}
              </button>
            ))}
          </aside>

          <section className="flex-1 bg-white rounded-3xl shadow-sm border border-[#E8DCC4] overflow-hidden">
            <div className="p-6 border-b border-[#F2E8D5] flex justify-between items-center bg-[#FDFBF7]">
              <h3 className="font-bold text-lg">{activeSpace?.name} 清單</h3>
              {isEditing && (
                <button onClick={() => {
                  const newItem = { id: `i${Date.now()}`, name: "新項目", size: "", price: 0 };
                  const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: [...(s.items || []), newItem] } : s);
                  syncToCloud({ ...stagingData, spaces: newSpaces });
                }} className="bg-[#4A3728] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md">
                  <Plus className="w-4 h-4" /> 增加品項
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#FDFBF7] text-[10px] uppercase tracking-widest font-bold text-[#A68B6D] border-b border-[#F2E8D5]">
                    <th className="p-6">項目名稱</th>
                    <th className="p-6">規格尺寸</th>
                    <th className="p-6 text-right">預算</th>
                    {isEditing && <th className="p-6 w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8D5]">
                  {activeSpace?.items?.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="p-6">
                        {isEditing ? <input className="font-bold text-sm w-full outline-none bg-transparent" value={item.name} onChange={(e) => {
                          const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, name: e.target.value} : i) } : s);
                          syncToCloud({...stagingData, spaces: newSpaces});
                        }} /> : <span className="font-bold text-sm">{item.name}</span>}
                      </td>
                      <td className="p-6">
                        {isEditing ? <input className="text-xs text-gray-500 w-full outline-none bg-transparent" value={item.size} onChange={(e) => {
                          const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, size: e.target.value} : i) } : s);
                          syncToCloud({...stagingData, spaces: newSpaces});
                        }} /> : <span className="text-xs text-gray-500">{item.size}</span>}
                      </td>
                      <td className="p-6 text-right font-bold text-[#8B6B4D]">
                        {isEditing ? <input type="number" className="text-right w-24 outline-none" value={item.price} onChange={(e) => {
                          const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.map(i => i.id === item.id ? {...i, price: parseInt(e.target.value) || 0} : i) } : s);
                          syncToCloud({...stagingData, spaces: newSpaces});
                        }} /> : `$${item.price.toLocaleString()}`}
                      </td>
                      {isEditing && (
                        <td className="p-6">
                          <button onClick={() => {
                            const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s);
                            syncToCloud({...stagingData, spaces: newSpaces});
                          }} className="text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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
