import React, { useState, Suspense } from 'react';
import { Plus, Hash, Tag as TagIcon, Settings } from 'lucide-react';
import { Tag } from '@/types';
import { COLOR_MAP } from '@/components/layout/uiConstants';

const TagManagerModal = React.lazy(() => import('@/components/layout/TagManagerModal'));

export interface TagWithCount extends Tag {
  count: number;
}

interface TagsStatsProps {
  tags: TagWithCount[];
  onRefresh?: () => void;
}

export const TagsStats: React.FC<TagsStatsProps> = ({ tags, onRefresh }) => {
  const [showTagManager, setShowTagManager] = useState(false);

  const handleTagClick = (tagId: string) => {
    // Dispatch custom event to open search palette with this tag
    window.dispatchEvent(new CustomEvent('open-search-palette', { 
      detail: { tagId } 
    }));
  };

  return (
    <div className="flex flex-col gap-2">

      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <TagIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl tracking-tight">Tag Manager</h1>
          <p className="text-xs opacity-50">Create and manage tags to organize projects, databases, notes, and workflows. Click a tag to filter.</p>
        </div>
        <div className="justify-end">
          <button 
            onClick={() => setShowTagManager(true)}
            className="btn btn-sm btn-soft gap-2 text-sm opacity-70 hover:opacity-100"
          >
          <Settings size={12} /> Manage
          </button>
        </div>
      </div>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className=" flex flex-row flex-wrap justify-start gap-2 p-4">
          <button 
            onClick={() => setShowTagManager(true)}
            className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg bg-base-300 border border-base-300 hover:border-primary/50 transition-all shrink-0 group"
          >
            <Plus size={14} className="group-hover:rotate-90 transition-transform" />
            <span className="text-xs font-medium">Add Tag</span>
          </button>

          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.id)}
              className={`
                flex items-center gap-1 px-2 py-1.5 rounded-lg border cursor-pointer transition-all shrink-0
                hover:shadow-md group active:scale-95
                ${COLOR_MAP[tag.color] || 'bg-base-200 border-zinc-700 text-zinc-400'}
              `}
            >
              <Hash size={12} className="opacity-50 group-hover:opacity-100" />
              <span className="text-xs font-bold">{tag.name}</span>
              {tag.count > 0 && (
                <span className="text-[10px] opacity-70 font-mono bg-black/20 px-1.5 rounded-lg">
                  {tag.count}
                </span>
              )}
            </button>
          ))}

          {tags.length === 0 && (
            <p className="text-xs opacity-30 italic px-2">No tags created yet</p>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        {showTagManager && (
          <TagManagerModal 
            onClose={() => {
              setShowTagManager(false);
              onRefresh?.();
            }}
            onUpdate={onRefresh || (() => {})}
            getUsageCount={(id) => tags.find(t => t.id === id)?.count || 0}
          />
        )}
      </Suspense>
    </div>
  );
};

export default TagsStats;
