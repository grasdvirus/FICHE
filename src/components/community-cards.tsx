
'use client';

import { Plus, UserCheck, Crown, X } from "lucide-react";

export const CommunityCard = ({ name, memberCount, onJoin, onLeave, onClick, status = 'joinable', unreadCount = 0 }: {
  name: string;
  memberCount: number;
  onJoin?: () => void;
  onLeave?: () => void;
  onClick?: () => void;
  status?: 'joinable' | 'member' | 'creator';
  unreadCount?: number;
}) => {
  const isMemberOrCreator = status === 'member' || status === 'creator';

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'joinable' && onJoin) {
        onJoin();
    } else if (status === 'member' && onLeave) {
        onLeave();
    }
  }

  return (
    <div 
      className="flex flex-col items-center space-y-2 text-center group"
      onClick={isMemberOrCreator ? onClick : undefined}
    >
      <div
        className={`relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 ${isMemberOrCreator ? 'cursor-pointer' : ''}`}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 shadow-xl group-hover:rotate-2 transition-all duration-300"></div>
        <div className="absolute inset-1 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-center shadow-inner">
           <span className="text-3xl sm:text-4xl font-bold text-indigo-700">{name.charAt(0).toUpperCase()}</span>
        </div>
        
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
        
        {status === 'joinable' && (
          <button
            onClick={handleActionClick}
            className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1.5 sm:p-2 border-2 sm:border-4 border-white hover:bg-blue-600 transition-colors shadow-md transform hover:scale-110"
            aria-label="Rejoindre la communauté"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        )}
        {status === 'member' && (
          <button
            onClick={handleActionClick}
            className="absolute bottom-0 right-0 bg-red-500 text-white rounded-full p-1.5 sm:p-2 border-2 sm:border-4 border-white hover:bg-red-600 transition-colors shadow-md transform hover:scale-110"
            aria-label="Quitter la communauté"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        )}
        {status === 'creator' && (
           <div className="absolute bottom-0 right-0 bg-yellow-500 text-white rounded-full p-1.5 sm:p-2 border-2 sm:border-4 border-white shadow-md">
            <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
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
        className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 group cursor-pointer"
      >
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all duration-300 group-hover:rotate-6"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 group-hover:text-indigo-600 transition-colors" />
        </div>
      </div>
      <div className="w-full px-1">
        <p className="font-semibold text-sm text-gray-800">Créer</p>
        <p className="text-xs text-gray-500">une communauté</p>
      </div>
    </div>
  );
};
