import React from 'react';
import { COLOR_MAP } from './uiConstants';
import { X } from 'lucide-react';

interface Props {
  tag: { id: string; name: string; color: string };
  onRemove?: () => void;
  className?: string;
}

const TagBadge: React.FC<Props> = ({ tag, onRemove, className = '' }) => {
  const colorClass = COLOR_MAP[tag.color] || 'text-zinc-500 bg-zinc-500/20 border-zinc-500/20';

  return (
    <div className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${colorClass} ${className}`}>
      <span className="font-medium">{tag.name}</span>
      {onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }} 
          className="p-0.5 rounded-full hover:bg-black/20 transition-colors"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
};

export default TagBadge;
