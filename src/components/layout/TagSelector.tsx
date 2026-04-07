
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Settings, Check, Tag as TagIcon, X } from 'lucide-react';
import { Tag } from '../../types';
import { initDB } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { COLOR_MAP } from './uiConstants';

const TagManagerModal = React.lazy(() => import('./TagManagerModal'));

interface Props {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  getUsageCount: (tagId: string) => number;
  onTagsUpdated?: () => void;
}

const TagSelector: React.FC<Props> = ({ selectedTagIds, onTagsChange, getUsageCount, onTagsUpdated }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const loadTags = async () => {
    if (!user) return;
    const db = await initDB(user);
    const t = await db.getAll('tags');
    setAllTags(t);
  };

  useEffect(() => {
    loadTags();
  }, [user]);

  useEffect(() => {
    if (showDropdown && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, [showDropdown]);

  const toggleTag = (e: React.MouseEvent, tagId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
      <div className="relative" ref={triggerRef}>
        <button 
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 text-xs bg-base-300 text-base-content hover:bg-base-200 hover:text-white text-base-content px-3 py-1.5 rounded-md border border-base-100 transition-colors"
        >
          <Plus size={12} /> Add Tags
        </button>
        
        {showDropdown && createPortal(
          <>
            <div 
              className="fixed inset-0 z-[10000]" 
              onClick={() => setShowDropdown(false)} 
            />
            <div 
              style={{ 
                position: 'fixed', 
                top: coords.top + 8, 
                left: coords.left,
                minWidth: '12rem'
              }}
              className="bg-base-300 border border-base-100 rounded-xl shadow-2xl p-2 z-[10001] max-h-60 overflow-y-auto"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowTagManager(true);
                  setShowDropdown(false);
                }}
                className="flex items-center gap-2 w-full p-2 text-xs font-bold text-base-content hover:bg-base-200 rounded mb-1 text-left"
              >
                <Settings size={12} /> Manage Tags
              </button>
              <div className="h-px bg-base-100 my-1"></div>
              {allTags.map(t => (
                <div 
                  key={t.id} 
                  onClick={(e) => toggleTag(e, t.id)}
                  className="flex items-center gap-2 p-1.5 hover:bg-base-200 rounded cursor-pointer select-none"
                >
                  <div className={`w-4 h-4 shrink-0 rounded-sm border flex items-center justify-center ${selectedTagIds.includes(t.id) ? 'bg-base-200 border-base-100' : 'border-base-100'}`}>
                    {selectedTagIds.includes(t.id) && <Check size={10} className="text-white" />}
                  </div>
                  <span className={`text-xs px-1.5 rounded ${COLOR_MAP[t.color] || 'bg-base-200 text-primary'}`}>{t.name}</span>
                </div>
              ))}
              {allTags.length === 0 && <div className="text-xs text-base-content p-2 text-center">No tags defined.</div>}
            </div>
          </>,
          triggerRef.current?.closest('.modal') || document.body
        )}
      </div>

      {selectedTagIds.map(tagId => {
        const tagDef = allTags.find(t => t.id === tagId);
        if (!tagDef) return null;
        return (
          <div 
            key={tagId} 
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-sm border transition-all ${COLOR_MAP[tagDef.color] || 'bg-base-200 text-base-1300'} cursor-default`}
          >
            <TagIcon size={10} />
            {tagDef.name}
            <div 
              onClick={(e) => { e.stopPropagation(); removeTag(tagId); }} 
              className="ml-1 hover:text-white hover:bg-black/20 rounded-full p-0.5 cursor-pointer"
            >
              <X size={10} />
            </div>
          </div>
        );
      })}

      <Suspense fallback={null}>
        {showTagManager && createPortal(
          <TagManagerModal 
            onClose={() => {
              setShowTagManager(false);
              loadTags();
              if (onTagsUpdated) onTagsUpdated();
            }}
            onUpdate={() => {
              loadTags();
              if (onTagsUpdated) onTagsUpdated();
            }}
            getUsageCount={getUsageCount}
          />,
          triggerRef.current?.closest('.modal') || document.body
        )}
      </Suspense>
    </div>
  );
};

export default TagSelector;
