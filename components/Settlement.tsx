import React from 'react';
import { Member, Bill } from '../types';
import { calculateSettlements, formatCurrency } from '../utils/calculations';
import { ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';

interface SettlementProps {
  bills: Bill[];
  members: Member[];
}

export const Settlement: React.FC<SettlementProps> = ({ bills, members }) => {
  const { summary, transactions } = calculateSettlements(bills, members);

  const totalSpent = bills.reduce((sum, b) => sum + b.amount, 0);

  if (bills.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">尚無帳單資料，請先新增帳單。</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Overview Cards */}
      <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <h3 className="text-indigo-100 text-sm font-medium mb-1">總支出</h3>
        <p className="text-4xl font-bold">{formatCurrency(totalSpent)}</p>
        <div className="mt-4 pt-4 border-t border-indigo-500/30 flex gap-6 text-sm">
          <div>
            <span className="text-indigo-200">帳單數量</span>
            <p className="font-semibold text-lg">{bills.length}</p>
          </div>
          <div>
            <span className="text-indigo-200">平均每人</span>
            <p className="font-semibold text-lg">{formatCurrency(totalSpent / members.length)}</p>
          </div>
        </div>
      </div>

      {/* Transfer Plan */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-600" />
          轉帳方案 (最佳化)
        </h3>
        
        {transactions.length === 0 ? (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3">
             <CheckCircle2 className="w-6 h-6" />
             <span className="font-medium">太棒了！目前沒有人需要轉帳。</span>
          </div>
        ) : (
          <div className="grid gap-3">
            {transactions.map((t, idx) => {
              const fromMember = members.find(m => m.id === t.fromId);
              const toMember = members.find(m => m.id === t.toId);
              return (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800">{fromMember?.name}</span>
                      <span className="text-xs text-gray-400">支付者</span>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="flex flex-col items-center w-full px-2">
                        <span className="text-xs text-gray-400 mb-1">轉給</span>
                        <div className="h-[1px] w-full bg-gray-200 relative">
                          <ArrowRight className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="font-bold text-gray-800">{toMember?.name}</span>
                      <span className="text-xs text-gray-400">收款者</span>
                    </div>
                  </div>
                  <div className="ml-4 pl-4 border-l border-gray-100">
                    <span className="text-lg font-bold text-indigo-600">{formatCurrency(t.amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Balances */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">詳細結餘</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {summary.sort((a,b) => b.balance - a.balance).map((s) => {
             const member = members.find(m => m.id === s.memberId);
             const isPositive = s.balance > 0;
             const isZero = Math.abs(s.balance) < 0.01;
             
             return (
               <div key={s.memberId} className="flex justify-between items-center p-4 border-b last:border-0 hover:bg-gray-50 transition-colors">
                 <span className="font-medium text-gray-700">{member?.name}</span>
                 <span className={`font-mono font-bold ${
                   isZero ? 'text-gray-400' : 
                   isPositive ? 'text-emerald-600' : 'text-red-500'
                 }`}>
                   {isZero ? '-' : (isPositive ? `+${formatCurrency(s.balance)}` : formatCurrency(s.balance))}
                 </span>
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};