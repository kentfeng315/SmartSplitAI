import React, { useState, useEffect } from 'react';
import { SyncStatus, FirebaseConfig } from '../types';
import { Cloud, Link as LinkIcon, AlertCircle, X, Check, Globe } from 'lucide-react';
import { initFirebase } from '../services/firebaseService';

interface CollaborationProps {
  status: SyncStatus;
  roomId: string | null;
  onConnect: (roomId: string) => void;
  onDisconnect: () => void;
}

export const Collaboration: React.FC<CollaborationProps> = ({ status, roomId, onConnect, onDisconnect }) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configInput, setConfigInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-load config from localStorage if available
  useEffect(() => {
    const savedConfig = localStorage.getItem('firebase_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (initFirebase(config)) {
          // Firebase initialized
        }
      } catch (e) {
        console.error("Invalid saved config");
      }
    }
  }, []);

  const handleStartSession = () => {
    const savedConfig = localStorage.getItem('firebase_config');
    if (!savedConfig && !process.env.FIREBASE_CONFIG) {
      setShowConfigModal(true);
    } else {
      // Generate a new room ID
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      onConnect(newRoomId);
    }
  };

  const handleSaveConfig = () => {
    try {
      // Allow user to paste the raw JS object or JSON
      let cleanInput = configInput.trim();
      // Heuristic to fix JS object format to JSON if user pastes from Firebase console directly
      if (!cleanInput.startsWith('{') && cleanInput.includes('apiKey')) {
         cleanInput = cleanInput.replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
         if(!cleanInput.startsWith('{')) cleanInput = '{' + cleanInput + '}';
      }

      const config: FirebaseConfig = JSON.parse(cleanInput);
      
      if (!config.databaseURL) {
        throw new Error("設定檔缺少 databaseURL");
      }

      const success = initFirebase(config);
      if (success) {
        localStorage.setItem('firebase_config', JSON.stringify(config));
        setShowConfigModal(false);
        // If we were waiting to connect, create room now
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        onConnect(newRoomId);
      } else {
        setErrorMsg("初始化失敗，請檢查設定內容");
      }
    } catch (e) {
      setErrorMsg("格式錯誤，請確保是有效的 JSON (包含 databaseURL)");
    }
  };

  if (status === 'online' && roomId) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between mb-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-full">
            <Globe className="w-5 h-5 text-green-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-green-800 text-sm">多人協作中</span>
              <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full font-mono">
                {roomId}
              </span>
            </div>
            <p className="text-xs text-green-600">所有變更將即時同步給成員</p>
          </div>
        </div>
        <button 
          onClick={onDisconnect} 
          className="text-xs text-gray-400 hover:text-red-500 underline px-2"
        >
          離開房間
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Offline Banner Prompt */}
      {status === 'offline' && !roomId && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 mb-6 text-white shadow-md flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              開啟多人協作
            </h3>
            <p className="text-indigo-100 text-xs mt-1">
              不用再手動複製連結！建立房間後，成員可同時編輯。
            </p>
          </div>
          <button 
            onClick={handleStartSession}
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap ml-4"
          >
            建立房間
          </button>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">設定即時連線 (Firebase)</h3>
              <button onClick={() => setShowConfigModal(false)}><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 border border-blue-100">
                  <p className="font-bold mb-1">初次設定：</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs opacity-90">
                    <li>前往 <a href="https://console.firebase.google.com/" target="_blank" className="underline text-blue-600">Firebase Console</a> 建立免費專案。</li>
                    <li>新增 Web App 並複製 <code>firebaseConfig</code>。</li>
                    <li>前往 <strong>Realtime Database</strong>，建立資料庫。</li>
                    <li>在「規則 (Rules)」分頁，將 read/write 設為 <code>true</code> (測試用)。</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    貼上 Firebase Config JSON:
                  </label>
                  <textarea
                    value={configInput}
                    onChange={(e) => setConfigInput(e.target.value)}
                    placeholder={'{ "apiKey": "...", "databaseURL": "..." }'}
                    className="w-full h-32 p-3 text-xs font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50"
                  />
                  {errorMsg && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errorMsg}</p>}
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                取消
              </button>
              <button 
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                儲存並連線
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
