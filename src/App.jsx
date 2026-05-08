import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Home, Sofa, Utensils, Bath, Bed, Plus, Trash2, 
  Image as ImageIcon, Share2, Printer, Loader2, Info,
  CheckCircle2, PlusCircle, X
} from 'lucide-react';

// --- Firebase Initialization ---
let app = null, auth = null, db = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'homestaging-portfolio';

const initFirebase = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      const config = JSON.parse(__firebase_config);
      if (config && Object.keys(config).length > 0) {
        app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
        auth = getAuth(app);
        db = getFirestore(app);
        return true;
      }
    }
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
  return false;
};

// --- Default Data ---
const defaultSpaces = [
  { id: 's1', name: '玄關', functionalZone: '落塵、換鞋', items: [] },
  { id: 's2', name: '客廳', functionalZone: '休閒、會客', items: [] },
  { id: 's3', name: '餐廳', functionalZone: '吃飯、會客', items: [] },
  { id: 's4', name: '廚房', functionalZone: '煮飯', items: [] },
  { id: 's5', name: '衛浴', functionalZone: '洗漱', items: [] },
  { id: 's6', name: '主臥室', functionalZone: '休息', items: [] },
  { id: 's7', name: '房間', functionalZone: '小孩房/客房', items: [] },
  { id: 's8', name: '書房', functionalZone: '閱讀、工作', items: [] }
];

const defaultBasicInfo = {
  projectName: '',
  occupants: '',
  condition: '',
  mustHaves: { req1: '', req2: '', req3: '' },
  designNeeds: { style: '', colorPalette: '', visualFeel: '' }
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);
  const [projectId, setProjectId] = useState('');
  
  // Data States
  const [basicInfo, setBasicInfo] = useState(defaultBasicInfo);
  const [spaces, setSpaces] = useState(defaultSpaces);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' or space id
  
  // UI States
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const skipNextSnapshot = useRef(false);

  // --- Auth & Setup ---
  useEffect(() => {
    if (!initFirebase()) {
      setIsReady(true);
      return;
    }

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

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsReady(true);
    });
    return () => unsubscribe();
  }, []);

  // --- URL & Project ID Management ---
  useEffect(() => {
    if (!isReady || !user) return;

    const params = new URLSearchParams(window.location.search);
    let currentId = params.get('pid');
    
    if (!currentId) {
      currentId = crypto.randomUUID().split('-')[0];
      const newUrl = `${window.location.pathname}?pid=${currentId}`;
      window.history.replaceState({}, '', newUrl);
    }
    setProjectId(currentId);
  }, [isReady, user]);

  // --- Data Sync ---
  useEffect(() => {
    if (!user || !projectId || !db) return;

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (skipNextSnapshot.current) {
        skipNextSnapshot.current = false;
        return;
      }
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.basicInfo) setBasicInfo(data.basicInfo);
        if (data.spaces) setSpaces(data.spaces);
      } else {
        // Init project
        setDoc(docRef, { basicInfo: defaultBasicInfo, spaces: defaultSpaces }, { merge: true });
      }
    }, (error) => {
      console.error("Sync error:", error);
    });

    return () => unsubscribe();
  }, [user, projectId]);

  // Debounced Save
  useEffect(() => {
    if (!user || !projectId || !db || !isReady) return;
    
    const saveTimer = setTimeout(async () => {
      setSaving(true);
      skipNextSnapshot.current = true;
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
        await setDoc(docRef, {
          basicInfo,
          spaces,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        console.error("Save failed:", error);
      } finally {
        setSaving(false);
      }
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [basicInfo, spaces, user, projectId, isReady]);

  // --- Handlers ---
  const handleCopyLink = () => {
    const url = window.location.href;
    const tempInput = document.createElement('input');
    tempInput.value = url;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const updateBasicInfo = (key, value, nestedKey = null) => {
    setBasicInfo(prev => {
      if (nestedKey) {
        return { ...prev, [key]: { ...prev[key], [nestedKey]: value } };
      }
      return { ...prev, [key]: value };
    });
  };

  const addSpace = () => {
    const newSpace = {
      id: crypto.randomUUID().substring(0, 8),
      name: '新空間',
      functionalZone: '',
      items: []
    };
    setSpaces([...spaces, newSpace]);
    setActiveTab(newSpace.id);
  };

  const removeSpace = (id) => {
    setSpaces(spaces.filter(s => s.id !== id));
    if (activeTab === id) setActiveTab('basic');
  };

  const updateSpace = (id, key, value) => {
    setSpaces(spaces.map(s => s.id === id ? { ...s, [key]: value } : s));
  };

  const addItem = (spaceId) => {
    const newItem = {
      id: crypto.randomUUID().substring(0, 8),
      isExisting: false,
      image: '',
      name: '',
      size: '',
      qty: 1,
      color: '',
      material: '',
      unitPrice: 0
    };
    setSpaces(spaces.map(s => {
      if (s.id === spaceId) return { ...s, items: [...s.items, newItem] };
      return s;
    }));
  };

  const updateItem = (spaceId, itemId, key, value) => {
    setSpaces(spaces.map(s => {
      if (s.id === spaceId) {
        return {
          ...s,
          items: s.items.map(item => item.id === itemId ? { ...s, [key]: value } : item)
        };
      }
      return s;
    }));
  };

  const updateItemField = (spaceId, itemId, field, value) => {
    setSpaces(prevSpaces => prevSpaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          items: space.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
        };
      }
      return space;
    }));
  };

  const removeItem = (spaceId, itemId) => {
    setSpaces(spaces.map(s => {
      if (s.id === spaceId) {
        return { ...s, items: s.items.filter(item => item.id !== itemId) };
      }
      return s;
    }));
  };

  // Image compression and upload
  const handleImageUpload = (spaceId, itemId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        updateItemField(spaceId, itemId, 'image', compressedDataUrl);
      };
    };
  };

  // Calculations
  const calculateTotals = () => {
    let existingCount = 0;
    let newCount = 0;
    let totalBudget = 0;

    spaces.forEach(space => {
      space.items.forEach(item => {
        if (item.isExisting) {
          existingCount += parseInt(item.qty || 0);
        } else {
          newCount += parseInt(item.qty || 0);
          totalBudget += (parseInt(item.qty || 0) * parseInt(item.unitPrice || 0));
        }
      });
    });

    return { existingCount, newCount, totalBudget };
  };

  const calculateSpaceTotal = (spaceId) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return 0;
    return space.items
      .filter(item => !item.isExisting)
      .reduce((sum, item) => sum + (parseInt(item.qty || 0) * parseInt(item.unitPrice || 0)), 0);
  };

  const totals = calculateTotals();

  if (!isReady) {
    return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#8B6B4D]"><Loader2 className="animate-spin w-10 h-10" /></div>;
  }

  const activeSpace = spaces.find(s => s.id === activeTab);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D241E] font-sans selection:bg-[#E8DCC4] pb-32">
      {/* Import Fonts */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@500;700;900&display=swap');
        .font-serif-tc { font-family: 'Noto Serif TC', serif; }
        .font-sans-tc { font-family: 'Noto Sans TC', sans-serif; }
        
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-full { width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; }
          .print-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}} />

      {/* Top Navigation Bar (Hidden on Print) */}
      <div className="no-print bg-white/80 backdrop-blur-md border-b border-[#E8DCC4]/50 sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-[#8B6B4D]/5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-[#8B6B4D] text-white p-2 rounded-xl rotate-3">
            <Home className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[#A68B6D] tracking-[0.2em] uppercase font-bold">Project ID: {projectId}</span>
            <span className="text-sm font-medium flex items-center gap-2">
              {saving ? <><Loader2 className="w-3 h-3 animate-spin text-[#8B6B4D]"/> 儲存中...</> : <><CheckCircle2 className="w-3 h-3 text-green-600"/> 已儲存</>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF9F6] border border-[#E8DCC4] text-[#8B6B4D] hover:bg-[#E8DCC4]/30 transition-colors text-sm font-medium">
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
            {copied ? '已複製連結' : '分享給客戶'}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2D241E] text-[#FAF9F6] hover:bg-[#2D241E]/90 transition-colors text-sm font-medium">
            <Printer className="w-4 h-4" />
            預覽 / 列印
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-20 flex flex-col lg:flex-row gap-12 print-full">
        
        {/* Left Sidebar (Space Navigation) */}
        <div className="lg:w-1/4 flex-shrink-0 no-print space-y-8">
          {/* Brand Identity */}
          <div className="mb-12">
            <h2 className="text-[#A68B6D] text-[10px] tracking-[0.4em] uppercase mb-4 font-sans-tc">HOME STAGING PORTFOLIO</h2>
            <h1 className="font-serif-tc text-5xl lg:text-6xl font-bold text-[#2D241E] mb-3 leading-tight">你家的<br/>好表</h1>
            <p className="text-[#8B6B4D] font-serif-tc text-lg tracking-widest relative inline-block">
              為你的空間 錦上添花
              <span className="absolute -bottom-2 left-0 w-1/2 h-[1px] bg-[#E8DCC4]"></span>
            </p>
            <p className="mt-8 text-sm text-[#A68B6D] font-medium">景尚空間有限公司</p>
          </div>

          <div className="bg-white rounded-[2rem] p-4 shadow-[#8B6B4D]/5 shadow-xl border border-[#E8DCC4]/50">
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('basic')}
                className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-300 font-medium ${activeTab === 'basic' ? 'bg-[#8B6B4D] text-white shadow-md' : 'text-[#8B6B4D] hover:bg-[#FAF9F6]'}`}
              >
                1. 基本資料設定
              </button>
              
              <div className="pt-4 pb-2 px-5">
                <p className="text-[10px] text-[#A68B6D] tracking-[0.2em] uppercase">2. 空間清單盤點</p>
              </div>
              
              {spaces.map(space => (
                <div key={space.id} className="group relative flex items-center">
                  <button 
                    onClick={() => setActiveTab(space.id)}
                    className={`flex-1 text-left px-5 py-3 rounded-2xl transition-all duration-300 ${activeTab === space.id ? 'bg-[#FAF9F6] text-[#2D241E] font-bold border border-[#E8DCC4]/50' : 'text-[#8B6B4D] hover:bg-[#FAF9F6]/50'}`}
                  >
                    {space.name || '未命名空間'}
                  </button>
                  <button 
                    onClick={() => removeSpace(space.id)}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 p-2 text-[#A68B6D] hover:text-red-500 transition-opacity"
                    title="刪除空間"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button 
                onClick={addSpace}
                className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border border-dashed border-[#A68B6D]/40 text-[#A68B6D] hover:bg-[#FAF9F6] hover:text-[#8B6B4D] transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> 新增空間
              </button>
            </nav>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:w-3/4 flex-1 space-y-16 print-full">
          
          {/* Mobile Header (Visible only on small screens and print) */}
          <div className="lg:hidden print:block mb-8 print:mb-12">
            <h2 className="text-[#A68B6D] text-[10px] tracking-[0.4em] uppercase mb-2">HOME STAGING PORTFOLIO</h2>
            <h1 className="font-serif-tc text-4xl print:text-5xl font-bold text-[#2D241E] mb-2">你家的好表</h1>
            <p className="text-[#8B6B4D] font-serif-tc tracking-widest text-sm print:text-base">為你的空間 錦上添花 | 景尚空間有限公司</p>
          </div>

          {activeTab === 'basic' && (
            <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-[#8B6B4D]/5 shadow-2xl border border-[#E8DCC4]/30 print-card">
              <h2 className="font-serif-tc text-3xl font-bold text-[#2D241E] mb-10 flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#8B6B4D] text-white flex items-center justify-center text-sm font-sans">1</span>
                基本資料
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-[#8B6B4D]">案件名稱</label>
                  <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#E8DCC4] transition-shadow text-[#2D241E]" 
                    value={basicInfo.projectName} onChange={e => updateBasicInfo('projectName', e.target.value)} placeholder="例如：大安區陳公館" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-[#8B6B4D]">居住人數</label>
                  <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#E8DCC4] transition-shadow text-[#2D241E]" 
                    value={basicInfo.occupants} onChange={e => updateBasicInfo('occupants', e.target.value)} placeholder="例如：2大1小" />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-sm font-bold text-[#8B6B4D]">屋況</label>
                  <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#E8DCC4] transition-shadow text-[#2D241E]" 
                    value={basicInfo.condition} onChange={e => updateBasicInfo('condition', e.target.value)} placeholder="例如：新成屋 / 預售屋客變 / 老屋翻新" />
                </div>

                <div className="md:col-span-2 mt-4 pt-8 border-t border-[#E8DCC4]/30">
                  <h3 className="text-sm font-bold text-[#8B6B4D] mb-6 tracking-wide">必要需求 (1-3個)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#E8DCC4]" 
                      value={basicInfo.mustHaves.req1} onChange={e => updateBasicInfo('mustHaves', e.target.value, 'req1')} placeholder="需求 1" />
                    <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#E8DCC4]" 
                      value={basicInfo.mustHaves.req2} onChange={e => updateBasicInfo('mustHaves', e.target.value, 'req2')} placeholder="需求 2" />
                    <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#E8DCC4]" 
                      value={basicInfo.mustHaves.req3} onChange={e => updateBasicInfo('mustHaves', e.target.value, 'req3')} placeholder="需求 3" />
                  </div>
                </div>

                <div className="md:col-span-2 mt-4 pt-8 border-t border-[#E8DCC4]/30">
                  <h3 className="text-sm font-bold text-[#8B6B4D] mb-6 tracking-wide">設計需求</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs text-[#A68B6D] px-2">1. 風格</label>
                      <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#E8DCC4]" 
                        value={basicInfo.designNeeds.style} onChange={e => updateBasicInfo('designNeeds', e.target.value, 'style')} placeholder="如：侘寂風、北歐風" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[#A68B6D] px-2">2. 色調</label>
                      <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#E8DCC4]" 
                        value={basicInfo.designNeeds.colorPalette} onChange={e => updateBasicInfo('designNeeds', e.target.value, 'colorPalette')} placeholder="如：大地色、暖白" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[#A68B6D] px-2">3. 視覺感</label>
                      <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#E8DCC4]" 
                        value={basicInfo.designNeeds.visualFeel} onChange={e => updateBasicInfo('designNeeds', e.target.value, 'visualFeel')} placeholder="如：溫馨、俐落" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSpace && (
            <div className="space-y-16">
              {/* Space Header Card */}
              <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-[#8B6B4D]/5 shadow-2xl border border-[#E8DCC4]/30 print-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FAF9F6] rounded-full -translate-y-1/2 translate-x-1/3 opacity-50"></div>
                
                <h2 className="font-serif-tc text-3xl font-bold text-[#2D241E] mb-10 flex items-center gap-4 relative z-10">
                  <span className="w-8 h-8 rounded-full bg-[#A68B6D] text-white flex items-center justify-center text-sm font-sans">2</span>
                  空間定義
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-[#8B6B4D]">空間名稱</label>
                    <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 text-xl font-serif-tc font-bold text-[#2D241E] focus:ring-2 focus:ring-[#E8DCC4]" 
                      value={activeSpace.name} onChange={e => updateSpace(activeSpace.id, 'name', e.target.value)} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-[#8B6B4D]">功能分區</label>
                    <input type="text" className="w-full bg-[#FAF9F6] border-none rounded-2xl px-6 py-4 text-[#2D241E] focus:ring-2 focus:ring-[#E8DCC4]" 
                      value={activeSpace.functionalZone} onChange={e => updateSpace(activeSpace.id, 'functionalZone', e.target.value)} placeholder="此空間的主要用途..." />
                  </div>
                </div>
              </div>

              {/* Items Table Card */}
              <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-[#8B6B4D]/5 shadow-2xl border border-[#E8DCC4]/30 print-card overflow-hidden">
                <div className="flex justify-between items-end mb-8 no-print">
                  <h3 className="font-serif-tc text-2xl font-bold text-[#2D241E]">家具與家電清單</h3>
                  <button onClick={() => addItem(activeSpace.id)} className="flex items-center gap-2 px-5 py-2.5 bg-[#8B6B4D] text-white rounded-full hover:bg-[#7a5d42] transition-colors text-sm font-medium shadow-md shadow-[#8B6B4D]/20">
                    <PlusCircle className="w-4 h-4" /> 新增物品
                  </button>
                </div>

                {activeSpace.items.length === 0 ? (
                  <div className="text-center py-20 bg-[#FAF9F6] rounded-3xl border border-dashed border-[#E8DCC4]">
                    <Sofa className="w-12 h-12 mx-auto text-[#E8DCC4] mb-4" />
                    <p className="text-[#A68B6D] font-medium">這個空間還沒有加入任何物品</p>
                    <p className="text-sm text-[#A68B6D] opacity-70 mt-2">點擊右上方按鈕開始新增</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-8 px-8 lg:mx-0 lg:px-0">
                    <table className="w-full min-w-[900px] text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[#2D241E] text-xs uppercase tracking-widest text-[#A68B6D] font-bold">
                          <th className="py-4 px-2 w-[100px]">狀態</th>
                          <th className="py-4 px-2 w-[100px]">圖片</th>
                          <th className="py-4 px-2">名稱/品牌</th>
                          <th className="py-4 px-2 w-[140px]">尺寸 (W×D×H)</th>
                          <th className="py-4 px-2 w-[80px]">顏色</th>
                          <th className="py-4 px-2 w-[100px]">材質</th>
                          <th className="py-4 px-2 w-[80px] text-center">數量</th>
                          <th className="py-4 px-2 w-[120px] text-right">單價</th>
                          <th className="py-4 px-2 w-[50px] no-print"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8DCC4]/40">
                        {activeSpace.items.map((item) => (
                          <tr key={item.id} className="group hover:bg-[#FAF9F6]/50 transition-colors">
                            {/* Toggle Existing/New */}
                            <td className="py-6 px-2 align-top">
                              <button 
                                onClick={() => updateItemField(activeSpace.id, item.id, 'isExisting', !item.isExisting)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors w-full border ${item.isExisting ? 'bg-[#FAF9F6] text-[#A68B6D] border-[#E8DCC4]' : 'bg-[#8B6B4D] text-white border-[#8B6B4D] shadow-sm'}`}
                              >
                                {item.isExisting ? '保留現有' : '新購添置'}
                              </button>
                            </td>
                            {/* Image Upload */}
                            <td className="py-6 px-2 align-top">
                              <label className="cursor-pointer block w-20 h-20 bg-[#FAF9F6] rounded-xl border border-[#E8DCC4] overflow-hidden hover:border-[#8B6B4D] transition-colors relative group/img">
                                {item.image ? (
                                  <img src={item.image} alt="preview" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-[#A68B6D]">
                                    <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                                    <span className="text-[10px]">上傳</span>
                                  </div>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(activeSpace.id, item.id, e.target.files[0])} />
                              </label>
                            </td>
                            <td className="py-6 px-2 align-top">
                              <input type="text" className="w-full bg-transparent border-none p-0 focus:ring-0 text-[#2D241E] font-medium placeholder-[#D4C3A3]" value={item.name} onChange={e => updateItemField(activeSpace.id, item.id, 'name', e.target.value)} placeholder="物品名稱與品牌" />
                            </td>
                            <td className="py-6 px-2 align-top">
                              <input type="text" className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm text-[#8B6B4D] placeholder-[#D4C3A3]" value={item.size} onChange={e => updateItemField(activeSpace.id, item.id, 'size', e.target.value)} placeholder="0x0x0 cm" />
                            </td>
                            <td className="py-6 px-2 align-top">
                              <input type="text" className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm text-[#8B6B4D] placeholder-[#D4C3A3]" value={item.color} onChange={e => updateItemField(activeSpace.id, item.id, 'color', e.target.value)} placeholder="顏色" />
                            </td>
                            <td className="py-6 px-2 align-top">
                              <input type="text" className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm text-[#8B6B4D] placeholder-[#D4C3A3]" value={item.material} onChange={e => updateItemField(activeSpace.id, item.id, 'material', e.target.value)} placeholder="材質" />
                            </td>
                            <td className="py-6 px-2 align-top text-center">
                              <input type="number" min="1" className="w-16 mx-auto bg-transparent border-none p-0 focus:ring-0 text-center text-[#2D241E] font-medium" value={item.qty} onChange={e => updateItemField(activeSpace.id, item.id, 'qty', e.target.value)} />
                            </td>
                            <td className="py-6 px-2 align-top text-right">
                              <div className={`flex items-center justify-end ${item.isExisting ? 'opacity-30' : ''}`}>
                                <span className="text-xs text-[#A68B6D] mr-1">$</span>
                                <input type="number" min="0" disabled={item.isExisting} className="w-24 bg-transparent border-none p-0 focus:ring-0 text-right text-[#2D241E] font-bold disabled:bg-transparent" value={item.unitPrice} onChange={e => updateItemField(activeSpace.id, item.id, 'unitPrice', e.target.value)} placeholder="0" />
                              </div>
                            </td>
                            <td className="py-6 px-2 align-top text-right no-print">
                              <button onClick={() => removeItem(activeSpace.id, item.id)} className="text-[#E8DCC4] hover:text-red-500 transition-colors p-1">
                                <X className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Space Subtotal */}
                {activeSpace.items.length > 0 && (
                  <div className="mt-8 pt-6 border-t-2 border-[#2D241E] flex justify-end">
                    <div className="text-right">
                      <span className="text-xs text-[#A68B6D] uppercase tracking-widest mr-4">此區新購預算小計</span>
                      <span className="font-serif-tc text-2xl font-bold text-[#8B6B4D]">
                        $ {calculateSpaceTotal(activeSpace.id).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Total Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#2D241E] text-[#FAF9F6] px-6 lg:px-12 py-5 shadow-[0_-10px_40px_rgba(45,36,30,0.2)] z-40 border-t border-[#5C4839] no-print">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-8 lg:gap-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FAF9F6]/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-[#E8DCC4]" />
              </div>
              <div>
                <div className="text-[10px] text-[#A68B6D] tracking-widest uppercase mb-1">現有物品保留</div>
                <div className="font-bold text-xl">{totals.existingCount} <span className="text-xs font-normal opacity-60">件</span></div>
              </div>
            </div>
            <div className="w-px h-10 bg-[#5C4839]"></div>
            <div>
              <div className="text-[10px] text-[#E8DCC4] tracking-widest uppercase mb-1">新購家具添置</div>
              <div className="font-bold text-xl text-[#E8DCC4]">{totals.newCount} <span className="text-xs font-normal opacity-60">件</span></div>
            </div>
          </div>
          
          <div className="flex items-end gap-6 text-right">
            <div className="hidden md:block text-[10px] text-[#A68B6D] max-w-[200px] text-right font-sans-tc leading-relaxed opacity-80 mb-1">
              * 價格僅供初步預算參考，實際報價以最終挑選品牌與採購當下為準。
            </div>
            <div>
              <div className="text-[10px] text-[#A68B6D] tracking-[0.3em] uppercase mb-1">預估總預算</div>
              <div className="font-serif-tc text-3xl lg:text-4xl font-bold text-[#E8DCC4]">
                $ {totals.totalBudget.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
