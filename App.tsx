import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ViewState, Member, Bill, SyncStatus, FirebaseConfig } from './types';
import { Users, Receipt, Calculator, Share2, Download, Upload, AlertCircle, RotateCcw, CheckCircle2, HardDrive, Loader2, Link as LinkIcon } from 'lucide-react';
import { MemberEdit } from './components/MemberEdit';
import { BillList } from './components/BillList';
import { Settlement } from './components/Settlement';
import { Collaboration } from './components/Collaboration';
import { generateSnapshotUrl, parseSnapshotData, shortenUrl } from './utils/sharing';
import { CloudData } from './services/cloudService';
import { initFirebase, subscribeToRoom, updateRoomData, RoomData } from './services/firebaseService';

// Initial Mock Data Generator (Default 11 members)
const generateInitialMembers = (): Member[] => 
  Array.from({ length: 11 }, (_, i) => ({ 
    id: `m-${i + 1}`, 
    name: `成員 ${i + 1}` 
  }));

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<ViewState>(ViewState.BILLS);
  const [members, setMembers] = useState<Member[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [showDriveGuide, setShowDriveGuide] = useState(false);
  const [isShortening, setIsShortening] = useState(false);
  
  // Collaboration State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [roomId, setRoomId] = useState<string | null>(null);
  const isRemoteUpdate = useRef(false); // Flag to prevent echo loops

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error' | 'info'}>({ 
    show: false, message: '', type: 'success' 
  });

  // --- Initialization ---
  useEffect(() => {
    const initApp = async () => {
      // 1. Sanitize URL
      const path = window.location.pathname;
      if (path !== '/' && path !== '/index.html' && !path.includes('.')) {
        window.history.replaceState({}, '', '/' + window.location.search);
      }

      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const dataFromUrl = params.get('data');

      // Initialize Firebase config if exists in local storage
      const savedConfig = localStorage.getItem('firebase_config');
      if (savedConfig) {
        try {
           initFirebase(JSON.parse(savedConfig));
        } catch(e) { console.error("Config load fail", e) }
      }

      // Priority 1: Join Room (Collaboration Mode)
      if (roomParam) {
        setRoomId(roomParam);
        connectToRoom(roomParam);
        return;
      }

      // Priority 2: Snapshot URL
      if (dataFromUrl) {
        const parsed = parseSnapshotData(dataFromUrl);
        if (parsed) {
          setMembers(parsed.members);
          setBills(parsed.bills);
          showToast('已載入連結中的帳單資料', 'info');
          window.history.replaceState({}, '', window.location.pathname);
          return; 
        }
      } 
      
      // Priority 3: Local Storage
      loadFromLocal();
    };

    initApp();
  }, []);

  const loadFromLocal = () => {
    const savedMembers = localStorage.getItem('members');
    setMembers(savedMembers ? JSON.parse(savedMembers) : generateInitialMembers());
    
    const savedBills = localStorage.getItem('bills');
    setBills(savedBills ? JSON.parse(savedBills) : []);
  };

  const connectToRoom = (id: string) => {
     // Check if we have firebase config first
     if (!localStorage.getItem('firebase_config') && !process.env.FIREBASE_CONFIG) {
        // If no config, we can't join. But we set RoomID state so the UI prompts for config.
        setSyncStatus('offline');
        showToast('請先設定資料庫連線以加入房間', 'info');
        return;
     }

     setSyncStatus('connecting');
     
     // Subscribe
     const unsubscribe = subscribeToRoom(id, (data: RoomData) => {
        isRemoteUpdate.current = true;
        setMembers(data.members);
        setBills(data.bills);
        setSyncStatus('online');
        // Reset flag after render cycle
        setTimeout(() => { isRemoteUpdate.current = false; }, 0);
     });

     // Save unsubscribe for cleanup? 
     // For simplicity in this demo, we assume session lasts until reload or explicit disconnect.
     return unsubscribe;
  };

  const handleStartSession = (newRoomId: string) => {
    setRoomId(newRoomId);
    
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoomId);
    window.history.pushState({}, '', url);

    // Initial push of current local data to the new room
    updateRoomData(newRoomId, members, bills).then(() => {
       connectToRoom(newRoomId);
       showToast('房間已建立！', 'success');
    });
  };

  const handleDisconnect = () => {
    if(window.confirm("確定要離開線上協作模式嗎？")) {
      setSyncStatus('offline');
      setRoomId(null);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.pushState({}, '', url);
      window.location.reload(); // Simple way to clear subscriptions
    }
  };

  const handleReset = () => {
    if(window.confirm('確定要清除所有資料重置嗎？')) {
      const resetMembers = generateInitialMembers();
      setMembers(resetMembers);
      setBills([]);
      
      if (syncStatus === 'offline') {
        localStorage.removeItem('members');
        localStorage.removeItem('bills');
      }
      showToast('資料已重置', 'success');
    }
  }

  // --- Persistence & Sync ---
  useEffect(() => {
    if (members.length === 0 && bills.length === 0) return;

    // 1. Save to Firebase if Online and NOT a remote update
    if (syncStatus === 'online' && roomId && !isRemoteUpdate.current) {
       // Debounce or direct? For this scale, direct is usually fine, but let's be safe
       const timer = setTimeout(() => {
          updateRoomData(roomId, members, bills);
       }, 500); 
       return () => clearTimeout(timer);
    }

    // 2. Save to Local Storage if Offline
    if (syncStatus === 'offline') {
      localStorage.setItem('members', JSON.stringify(members));
      localStorage.setItem('bills', JSON.stringify(bills));
    }
  }, [members, bills, syncStatus, roomId]);


  // --- Sharing ---
  const handleCopyLink = async () => {
    let urlToShare = "";

    if (syncStatus === 'online' && roomId) {
      // Share Room Link
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('room', roomId);
      urlToShare = url.toString();
      
      // Use configured base URL if exists (from sharing.ts logic basically)
      // Since we want to keep it simple, we just use current href mostly
    } else {
      // Snapshot Link (Old method)
      urlToShare = generateSnapshotUrl(members, bills);
    }
    
    if (!urlToShare) {
       showToast('產生連結失敗', 'error');
       return;
    }

    // If it's a Snapshot and huge, warn
    if (syncStatus === 'offline' && urlToShare.length > 8000) {
      showToast('資料過多，請改用「備份檔案」或「線上協作」功能', 'error');
      return;
    }
    
    setIsShortening(true);
    showToast('正在處理連結...', 'info');

    try {
      // Only shorten if it's long (snapshot)
      let finalUrl = urlToShare;
      if (urlToShare.length > 100) {
         finalUrl = await shortenUrl(urlToShare);
      }
      await navigator.clipboard.writeText(finalUrl);
      showToast(syncStatus === 'online' ? "已複製協作房間連結！" : "已複製快照連結！", 'success');
    } catch (e) {
      await navigator.clipboard.writeText(urlToShare);
      showToast("已複製連結", 'success');
    } finally {
      setIsShortening(false);
    }
  };

  // --- File Export/Import ---
  const handleExportFile = () => {
    const data: CloudData = { members, bills, updatedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartSplit_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('檔案已下載', 'success');
    setShowDriveGuide(true);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json) as CloudData;
        if (data.members && data.bills) {
          if (window.confirm('確定要載入此備份檔嗎？目前的資料將被覆蓋。')) {
            setMembers(data.members);
            setBills(data.bills);
            
            // If online, this will trigger the useEffect to push to Firebase
            
            showToast('備份載入成功！', 'success');
          }
        } else {
          throw new Error('Invalid format');
        }
      } catch (err) {
        showToast('檔案格式錯誤', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), type === 'info' ? 3000 : 4000);
  };

  // --- Handlers ---
  const handleUpdateMember = (id: string, name: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, name } : m));
  };

  const handleAddMember = () => {
    setMembers(prev => [...prev, { id: `m-${Date.now()}`, name: `新成員` }]);
  };
  
  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    setBills(prev => prev.map(b => ({
      ...b,
      involvedIds: b.involvedIds.filter(mid => mid !== id)
    })));
  };

  const handleAddBill = (bill: Bill) => {
    setBills(prev => [bill, ...prev]);
  };

  const handleUpdateBill = (updatedBill: Bill) => {
    setBills(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b));
  };

  const handleDeleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-20 md:pb-0">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-2 animate-fade-in-down whitespace-nowrap ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 
          toast.type === 'info' ? 'bg-blue-600 text-white' : 'bg-gray-900/90 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : 
           toast.type === 'info' ? (toast.message.includes('正在') ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <AlertCircle className="w-4 h-4" />) : 
           <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg hidden sm:block ${syncStatus === 'online' ? 'bg-green-600' : 'bg-indigo-600'}`}>
               <Calculator className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg sm:text-xl tracking-tight text-gray-900">
               {syncStatus === 'online' ? '分帳 AI (線上)' : '分帳 AI'}
            </h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Action Bar */}
            <div className="flex items-center bg-white sm:bg-gray-50 rounded-full sm:border border-gray-200 p-0.5">
              
              {/* Import/Export Group */}
              <div className="flex items-center gap-1 mr-2">
                <button 
                  onClick={handleExportFile}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-full hover:bg-white hover:shadow-sm text-gray-600 transition-all flex items-center gap-1"
                  title="備份檔案"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs hidden md:inline">備份</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-full hover:bg-white hover:shadow-sm text-gray-600 transition-all flex items-center gap-1"
                  title="載入備份"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-xs hidden md:inline">載入</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportFile} />
              </div>

              <div className="w-[1px] h-4 bg-gray-300 mx-1 hidden sm:block"></div>

              {/* Share & Reset */}
              <div className="flex items-center gap-1">
                 <button 
                  onClick={handleCopyLink}
                  disabled={isShortening}
                  className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full transition-all border ${
                    syncStatus === 'online'
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      : isShortening 
                        ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-wait'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {isShortening ? <Loader2 className="w-4 h-4 animate-spin" /> : (syncStatus === 'online' ? <LinkIcon className="w-4 h-4"/> : <Share2 className="w-4 h-4" />)}
                  <span className="hidden sm:inline">{syncStatus === 'online' ? '邀請成員' : '複製連結'}</span>
                </button>
                
                <button 
                  onClick={handleReset}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="清除所有資料"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Collaboration Widget */}
        <Collaboration 
          status={syncStatus} 
          roomId={roomId}
          onConnect={handleStartSession}
          onDisconnect={handleDisconnect}
        />

        {/* Google Drive Guide Alert */}
        {showDriveGuide && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 relative animate-fade-in">
             <button onClick={() => setShowDriveGuide(false)} className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"><AlertCircle className="w-4 h-4"/></button>
             <div className="flex gap-3">
                <div className="bg-white p-2 rounded-full h-fit shadow-sm">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 text-sm">如何使用 Google 雲端備份？</h4>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    1. 檔案 <b>.json</b> 已下載到您的裝置。<br/>
                    2. 將檔案上傳到您的 <b>Google Drive 共享資料夾</b>。<br/>
                    3. 其他成員只需從 Drive 下載該檔案，並點擊上方的 <b><Upload className="w-3 h-3 inline"/> 載入</b> 按鈕即可同步進度。
                  </p>
                </div>
             </div>
          </div>
        )}

        {view === ViewState.MEMBERS && (
          <MemberEdit 
            members={members} 
            onUpdateMember={handleUpdateMember} 
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
          />
        )}
        {view === ViewState.BILLS && (
          <BillList 
            bills={bills} 
            members={members}
            onAddBill={handleAddBill}
            onDeleteBill={handleDeleteBill}
            onUpdateBill={handleUpdateBill}
          />
        )}
        {view === ViewState.SETTLEMENT && (
          <Settlement bills={bills} members={members} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb z-40">
        <div className="max-w-3xl mx-auto flex justify-around items-center h-16">
          <NavButton 
            active={view === ViewState.MEMBERS} 
            onClick={() => setView(ViewState.MEMBERS)} 
            icon={<Users />} 
            label="成員" 
          />
          <NavButton 
            active={view === ViewState.BILLS} 
            onClick={() => setView(ViewState.BILLS)} 
            icon={<Receipt />} 
            label="帳單" 
          />
          <NavButton 
            active={view === ViewState.SETTLEMENT} 
            onClick={() => setView(ViewState.SETTLEMENT)} 
            icon={<Calculator />} 
            label="結算" 
          />
        </div>
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
      active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
    }`}
  >
    <div className={`w-6 h-6 ${active ? 'scale-110' : ''} transition-transform`}>
      {icon}
    </div>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default App;