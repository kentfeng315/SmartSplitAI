import React, { useState, useRef } from 'react';
import { Bill, Member } from '../types';
import { Plus, Receipt, Camera, Loader2, X, Check, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import { parseReceiptImage } from '../services/geminiService';

interface BillListProps {
  bills: Bill[];
  members: Member[];
  onAddBill: (bill: Bill) => void;
  onDeleteBill: (id: string) => void;
  onUpdateBill: (bill: Bill) => void;
}

export const BillList: React.FC<BillListProps> = ({ bills, members, onAddBill, onDeleteBill, onUpdateBill }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const openModal = (bill?: Bill) => {
    if (bill) {
      setEditingBill(bill);
    } else {
      setEditingBill(null);
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('確定要刪除這筆帳單嗎？')) {
      onDeleteBill(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-indigo-600" />
          帳單列表
        </h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          新增帳單
        </button>
      </div>

      {bills.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
          <Receipt className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">目前沒有帳單</p>
          <p className="text-gray-400 text-sm mt-1">點擊上方按鈕開始新增</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => {
            const payer = members.find(m => m.id === bill.payerId);
            return (
              <div 
                key={bill.id} 
                onClick={() => openModal(bill)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{bill.title}</h3>
                  <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
                      {payer?.name || '未知付款人'} 先付
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>{bill.involvedIds.length} 人分攤</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(bill.amount)}</span>
                  <button 
                    onClick={(e) => handleDelete(bill.id, e)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <BillModal 
          members={members} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={(bill) => {
            if (editingBill) {
              onUpdateBill(bill);
            } else {
              onAddBill(bill);
            }
            setIsModalOpen(false);
          }}
          initialBill={editingBill || undefined}
        />
      )}
    </div>
  );
};

interface BillModalProps {
  members: Member[];
  onClose: () => void;
  onSubmit: (bill: Bill) => void;
  initialBill?: Bill;
}

const BillModal: React.FC<BillModalProps> = ({ members, onClose, onSubmit, initialBill }) => {
  const [title, setTitle] = useState(initialBill?.title || '');
  const [amount, setAmount] = useState<string>(initialBill?.amount.toString() || '');
  const [payerId, setPayerId] = useState(initialBill?.payerId || members[0]?.id || '');
  const [involvedIds, setInvolvedIds] = useState<Set<string>>(
    initialBill ? new Set(initialBill.involvedIds) : new Set(members.map(m => m.id))
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1]; 
        
        try {
          const result = await parseReceiptImage(base64Data);
          setTitle(result.title);
          setAmount(result.amount.toString());
        } catch (err) {
          alert("AI 識別失敗，請手動輸入");
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsAnalyzing(false);
    }
  };

  const toggleMember = (id: string) => {
    const newSet = new Set(involvedIds);
    if (newSet.has(id)) {
      if (newSet.size > 1) newSet.delete(id); // Prevent empty set
    } else {
      newSet.add(id);
    }
    setInvolvedIds(newSet);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !payerId) return;

    const newBill: Bill = {
      id: initialBill?.id || crypto.randomUUID(),
      title,
      amount: parseFloat(amount),
      payerId,
      involvedIds: Array.from(involvedIds),
      createdAt: initialBill?.createdAt || Date.now(),
    };
    onSubmit(newBill);
  };

  const selectAll = () => setInvolvedIds(new Set(members.map(m => m.id)));
  const clearAll = () => setInvolvedIds(new Set());

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-bold text-lg text-gray-800">
            {initialBill ? '編輯帳單' : '新增帳單'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* AI Upload */}
          {!initialBill && (
             <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
             <input 
               type="file" 
               accept="image/*" 
               className="hidden" 
               ref={fileInputRef}
               onChange={handleImageUpload}
             />
             <button 
               type="button"
               onClick={() => fileInputRef.current?.click()}
               disabled={isAnalyzing}
               className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium shadow hover:bg-indigo-700 transition-colors disabled:opacity-50 w-full justify-center"
             >
               {isAnalyzing ? (
                 <>
                   <Loader2 className="w-5 h-5 animate-spin" />
                   正在識別帳單...
                 </>
               ) : (
                 <>
                   <Camera className="w-5 h-5" />
                   AI 識別收據 (自動填寫)
                 </>
               )}
             </button>
             <p className="text-xs text-indigo-400">支援照片或截圖自動辨識</p>
           </div>
          )}
         

          {/* Form */}
          <form id="billForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">帳單名稱</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：晚餐、KTV"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金額</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">誰先付的？</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">誰要分攤？</label>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={selectAll} className="text-indigo-600 hover:underline">全選</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={clearAll} className="text-gray-500 hover:underline">重置</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {members.map(member => {
                  const isSelected = involvedIds.has(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={`cursor-pointer px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-between select-none ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="truncate mr-2">{member.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            type="button"
            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            form="billForm"
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow hover:bg-indigo-700 transition-colors"
          >
            {initialBill ? '儲存變更' : '新增'}
          </button>
        </div>
      </div>
    </div>
  );
};