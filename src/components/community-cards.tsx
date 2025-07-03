'use client';

import { Plus } from "lucide-react";

export const CommunityCard = ({ name, memberCount, onClick }: {
  name: string;
  memberCount: number;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className="relative w-28 h-28 md:w-32 md:h-32 group cursor-pointer transform transition-transform hover:scale-105"
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 shadow-xl group-hover:rotate-2 transition-all duration-300"></div>
      <div className="absolute inset-1 rounded-full bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center shadow-inner space-y-1">
        <div className="text-xl md:text-2xl font-bold text-indigo-700">{name.charAt(0).toUpperCase()}</div>
        <div className="text-xs text-gray-500">{memberCount} membres</div>
      </div>
    </div>
  );
};
export const CreateCommunityCard = ({ onClick }: { onClick: () => void }) => {
  return (
    <div
      onClick={onClick}
      className="relative w-28 h-28 md:w-32 md:h-32 group cursor-pointer transform transition-transform hover:scale-110"
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-200 via-blue-200 to-indigo-200 shadow-inner group-hover:rotate-3 transition-all duration-300"></div>
      <div className="absolute inset-1 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center">
        <Plus className="w-8 h-8 text-indigo-600" />
      </div>
    </div>
  );
};
