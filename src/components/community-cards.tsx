
'use client';

import { Plus, UserCheck, Crown } from "lucide-react";

export const CommunityCard = ({ name, memberCount, onJoin, onClick, status = 'joinable' }: {
  name: string;
  memberCount: number;
  onJoin?: () => void;
  onClick?: () => void;
  status?: 'joinable' | 'member' | 'creator';
}) => {
  const isMemberOrCreator = status === 'member' || status === 'creator';
  return (
    <div 
      className="flex flex-col items-center space-y-2 text-center"
      onClick={isMemberOrCreator ? onClick : undefined}
    >
      <div
        className={`relative w-28 h-28 md:w-32 md:h-32 group ${isMemberOrCreator ? 'cursor-pointer' : ''}`}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 shadow-xl group-hover:rotate-2 transition-all duration-300"></div>
        <div className="absolute inset-1 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-center shadow-inner">
           <span className="text-4xl font-bold text-indigo-700">{name.charAt(0).toUpperCase()}</span>
        </div>
        
        {status === 'joinable' && (
          <button
            onClick={onJoin}
            className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 border-4 border-white hover:bg-blue-600 transition-colors shadow-md transform hover:scale-110"
            aria-label="Rejoindre la communauté"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {status === 'member' && (
          <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-2 border-4 border-white shadow-md">
            <UserCheck className="w-4 h-4" />
          </div>
        )}
        {status === 'creator' && (
           <div className="absolute bottom-0 right-0 bg-yellow-500 text-white rounded-full p-2 border-4 border-white shadow-md">
            <Crown className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="w-full px-1">
        <p className="font-semibold text-sm truncate text-gray-800" title={name}>{name}</p>
        <p className="text-xs text-gray-500">{memberCount} {memberCount > 1 ? 'membres' : 'membre'}</p>
      </div>
    </div>
  );
};

export const CreateCommunityCard = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className="flex flex-col items-center space-y-2 text-center">
      <div
        onClick={onClick}
        className="relative w-28 h-28 md:w-32 md:h-32 group cursor-pointer"
      >
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all duration-300 group-hover:rotate-6"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Plus className="w-8 h-8 text-gray-400 group-hover:text-indigo-600 transition-colors" />
        </div>
      </div>
      <div className="w-full px-1">
        <p className="font-semibold text-sm text-gray-800">Créer</p>
        <p className="text-xs text-gray-500">une communauté</p>
      </div>
    </div>
  );
};
