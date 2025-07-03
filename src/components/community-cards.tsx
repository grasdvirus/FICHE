
'use client';

import { Plus, UserCheck, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CommunityCard = ({ name, memberCount, onJoin, status = 'joinable' }: {
  name: string;
  memberCount: number;
  onJoin?: () => void;
  status?: 'joinable' | 'member' | 'creator';
}) => {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div
        className="relative w-28 h-28 md:w-32 md:h-32 group"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 shadow-xl group-hover:rotate-2 transition-all duration-300"></div>
        <div className="absolute inset-1 rounded-full bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center shadow-inner space-y-1 p-2">
          <div className="text-xl md:text-2xl font-bold text-indigo-700 truncate">{name}</div>
          <div className="text-xs text-gray-500">{memberCount} membres</div>
        </div>
        {status === 'member' && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1.5 border-2 border-white">
            <UserCheck className="w-3 h-3" />
          </div>
        )}
        {status === 'creator' && (
           <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white rounded-full p-1.5 border-2 border-white">
            <Crown className="w-3 h-3" />
          </div>
        )}
      </div>
      <Button 
        onClick={onJoin} 
        disabled={status !== 'joinable'} 
        size="sm" 
        className="w-full"
      >
        {status === 'joinable' ? 'Rejoindre' : status === 'member' ? 'Membre' : 'Créateur'}
      </Button>
    </div>
  );
};

export const CreateCommunityCard = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div
        onClick={onClick}
        className="relative w-28 h-28 md:w-32 md:h-32 group cursor-pointer transform transition-transform hover:scale-110"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-200 via-blue-200 to-indigo-200 shadow-inner group-hover:rotate-3 transition-all duration-300"></div>
        <div className="absolute inset-1 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center">
          <Plus className="w-8 h-8 text-indigo-600" />
        </div>
      </div>
      <div className="h-9"></div>
    </div>
  );
};
