import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';
import { 
  Home, Sofa, Utensils, Bath, Bed, Sun, Package, 
  Loader2, CheckCircle2, Plus, Trash2, 
  Layout, Coffee, Waves, Monitor, Armchair,
  Lamp, Flower2, Check, PencilLine, Share2,
  Building2, Lightbulb, Palette, Image as ImageIcon, Upload, MapPin,
  AlertTriangle
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

const appId = "home-staging-portfolio";

// 初始化 Firebase 實例
let app, auth, db;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  try {
    enableIndexedDbPersistence(db).catch(() => {});
  } catch (e) {}
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

const ICON_OPTIONS = [
  { id: 'Sofa', component: <Sofa className="w-6 h-6" /> },
  { id: 'Utensils', component: <Utensils className="w-6 h-6" /> },
  { id: 'Bed', component: <Bed className="w-6 h-6" /> },
  { id: 'Monitor', component: <Monitor className="w-6 h-6" /> },
  { id: 'Package', component: <Package className="w-6 h-6" /> },
  { id: 'Layout', component: <Layout className="w-6 h-6" /> }
];

export default function App() {
  const [stagingData, setStagingData] = useState(null); 
  const [activeSpaceId, setActiveSpaceId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [error, setError] = useState(null);
  
  const hasLoadedInitial = useRef(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setProjectId(urlParams.get('project') || 'p_demo');

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) { console.error(err); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!projectId || !user) return;

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
          projectInfo: { name: "新提案", address: "地址", styleDesc: "現代風" },
          spaces: [{ id: "s1", name: "客廳", iconId: "Sofa", items: [] }]
        };
        setStagingData(defaultData);
        setActiveSpaceId("s1");
        setDoc(docRef, defaultData);
      }
    }, (err) => {
      if (err.code === 'permission-denied') setError("權限不足，請檢查 Firebase Rules");
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const syncToCloud = async (newData) => {
    setStagingData(newData);
    setIsSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
      await setDoc(docRef, newData);
    } finally { setIsSaving(false); }
  };

  const activeSpace = useMemo(() => 
    stagingData?.spaces?.find(s => s.id === activeSpaceId), 
    [stagingData, activeSpaceId]
  );

  if (error) return <div className="p-20 text-center text-red-500">{error}</div>;
  if (!stagingData) return <div className="p-20 text-center">載入中...</div>;

  return (
    <div className="min-h-screen bg-[#F8F5F1] text-[#4A3728] font-serif">
      <header className="bg-white border-b border-[#E8DCC4] p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#8B6B4D] p-2 rounded-lg text-white"><Home className="w-5 h-5" /></div>
          <h1 className="font-bold">你家的好表</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
          }} className="px-3 py-1.5 border rounded-lg text-sm flex items-center gap-2 bg-white">
            {copyFeedback ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />} 分享
          </button>
          <button onClick={() => setIsEditing(!isEditing)} className="px-3 py-1.5 bg-[#8B6B4D] text-white rounded-lg text-sm">
            {isEditing ? "儲存" : "編輯"}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-48 space-y-2">
          {stagingData.spaces.map(s => (
            <button key={s.id} onClick={() => setActiveSpaceId(s.id)} className={`w-full text-left p-3 rounded-xl transition-all ${activeSpaceId === s.id ? 'bg-[#8B6B4D] text-white shadow-md' : 'bg-white'}`}>
              {s.name}
            </button>
          ))}
        </aside>

        <section className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-[#E8DCC4]">
          <h2 className="text-xl font-bold mb-4">{activeSpace?.name} 清單</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#FDFBF7] text-xs text-[#A68B6D]">
                <tr>
                  <th className="p-3">項目</th>
                  <th className="p-3">規格</th>
                  <th className="p-3 text-right">單價</th>
                </tr>
              </thead>
              <tbody>
                {activeSpace?.items?.map(item => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="p-3 text-sm font-bold">{item.name}</td>
                    <td className="p-3 text-xs text-gray-400">{item.size}</td>
                    <td className="p-3 text-right text-sm">{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isEditing && (
              <button onClick={() => {
                const newItem = { id: Date.now().toString(), name: "新家具", size: "尺寸", price: 0 };
                const newSpaces = stagingData.spaces.map(s => s.id === activeSpaceId ? { ...s, items: [...s.items, newItem] } : s);
                syncToCloud({ ...stagingData, spaces: newSpaces });
              }} className="w-full mt-4 p-2 border-2 border-dashed rounded-xl text-gray-300 hover:text-[#8B6B4D] hover:border-[#8B6B4D]">
                + 新增項目
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
