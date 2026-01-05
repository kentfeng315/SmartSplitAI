import React from 'react';
import { Member } from '../types';
import { Users, Trash2 } from 'lucide-react';

interface MemberEditProps {
  members: Member[];
  onUpdateMember: (id: string, name: string) => void;
  onRemoveMember: (id: string) => void;
  onAddMember: () => void;
}

export const MemberEdit: React.FC<MemberEditProps> = ({ members, onUpdateMember, onRemoveMember, onAddMember }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          成員名單 ({members.length})
        </h2>
        <button 
          onClick={onAddMember}
          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          + 新增成員
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {members.map((member, index) => (
          <div key={member.id} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-sm">#{index + 1}</span>
            </div>
            <input
              type="text"
              value={member.name}
              onChange={(e) => onUpdateMember(member.id, e.target.value)}
              className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
              placeholder={`成員 ${index + 1}`}
            />
            {members.length > 2 && (
               <button
               onClick={() => onRemoveMember(member.id)}
               className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-300 hover:text-red-500 transition-colors"
               title="移除成員"
             >
               <Trash2 className="w-4 h-4" />
             </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="text-center text-sm text-gray-500 mt-6 bg-gray-50 p-4 rounded-lg">
        提示：您可以隨時修改成員名稱，這些名稱將同步更新到所有帳單中。
      </div>
    </div>
  );
};