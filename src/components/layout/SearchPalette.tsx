import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, FileText, Folder, ChevronRight, Hash, Globe, Workflow, LayoutDashboard, Key } from 'lucide-react';
import { COLOR_MAP } from './uiConstants';
import TagBadge from './TagBadge';

export interface SearchableItem {
  id: string;
  title: string;
  type: 'nav' | 'note' | 'domain' | 'workflow' | 'credential';
  categoryId: string; // Maps to navItems (e.g., 'domains', 'notes')
  tags: string[];
  content?: string; // Optional, for text search
  action: () => void; // For navigation or actions
}

interface Props {
  items: SearchableItem[];
  categories: { id: string; name: string }[];
  tags: { id: string; name: string; color: string }[];
  onSelect: (item: SearchableItem) => void;
  onClose: () => void;
  initialCategoryId?: string;
  initialTagId?: string;
}

const SearchPalette: React.FC<Props> = ({ items, categories, tags, onSelect, onClose, initialCategoryId, initialTagId }) => {
  const [query, setQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>(initialCategoryId || '');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    initialTagId ? new Set([initialTagId]) : new Set()
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Update state if props change (re-opening modal)
  useEffect(() => {
      if(initialCategoryId) setSelectedCatId(initialCategoryId);
      if(initialTagId) setSelectedTagIds(new Set([initialTagId]));
  }, [initialCategoryId, initialTagId]);

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleTag = (tagId: string) => {
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setSelectedTagIds(next);
  };

  const stripHtml = (html: string = '') => {
    return html.replace(/<[^>]*>?/gm, '');
  };

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(item => {
      // 1. Text Match
      const contentText = stripHtml(item.content || '').toLowerCase();
      const titleText = item.title.toLowerCase();
      
      // Get tag names for this item to include in search
      const itemTagNames = item.tags.map(tId => {
          const t = tags.find(tag => tag.id === tId);
          return t ? t.name.toLowerCase() : '';
      }).join(' ');

      const matchesText = !q || 
                          titleText.includes(q) || 
                          contentText.includes(q) || 
                          itemTagNames.includes(q);

      // 2. Category Match
      const matchesCategory = !selectedCatId || item.categoryId === selectedCatId;

      // 3. Tag Match (AND Logic: Item must have ALL selected tags)
      const matchesTags = selectedTagIds.size === 0 || 
                          Array.from(selectedTagIds).every(tId => item.tags.includes(tId));

      return matchesText && matchesCategory && matchesTags;
    });
  }, [items, query, selectedCatId, selectedTagIds]);

  const getIcon = (type: string) => {
      switch(type) {
          case 'nav': return LayoutDashboard;
          case 'note': return FileText;
          case 'domain': return Globe;
          case 'workflow': return Workflow;
          case 'credential': return Key;
          default: return FileText;
      }
  };

  return (
    <>
      {/* Invisible Backdrop to handle click-outside */}
      <div className="fixed inset-0 z-[60]" onClick={onClose} />

      {/* Palette Container */}
      <div className="fixed top-12 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[70] animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="bg-base-300/70 backdrop-blur-xl border border-base-100 rounded-lg shadow-2xl/30 flex flex-col overflow-hidden">
          
          {/* Input Section */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-base-100">
            <Search className="text-base-content" size={20} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-base-300 text-lg text-white placeholder:text-base-content/70 outline-none"
            />
            <div className="flex items-center gap-2">
               <span className="text-[10px] bg-base-300 text-base-content px-1.5 py-0.5 rounded border border-base-100">ESC</span>
               <button onClick={onClose} className="text-base-content/70 hover:text-white"><X size={20} /></button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex flex-col gap-3 px-4 py-3 bg-base-300/80 border-b border-base-100">
            
            {/* Category Dropdown & Stats */}
            <div className="flex items-center justify-between">
                <div className="relative">
                    <select 
                        value={selectedCatId}
                        onChange={(e) => setSelectedCatId(e.target.value)}
                        className="select select-sm bg-base-300 border border-base-100 rounded-lg text-xs text-white pl-8 pr-8 py-1.5 outline-none focus:border-primary cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <Folder size={12} className="absolute left-2.5 top-2 text-base-content pointer-events-none" />
                    <div className="absolute right-2.5 top-1 pointer-events-none text-base-content">↓</div>
                </div>
                <span className="text-xs text-base-content font-mono">{filteredItems.length} results</span>
            </div>

            {/* Tags Horizontal Scroll */}
            {tags.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                    <span className="text-[10px] font-bold text-base-content/80 uppercase shrink-0">Tags:</span>
                    {tags.map(tag => {
                        const isActive = selectedTagIds.has(tag.id);
                        return (
                            <button
                                key={tag.id}
                                onClick={() => toggleTag(tag.id)}
                                className={`
                                flex items-center gap-1 rounded-md text-xs border transition-all shrink-0 ${COLOR_MAP[tag.color]} 
                                text-base-content/80 border-base-100}
                                ${isActive
                                    ? `badge badge-sm`
                                    : `badge badge-sm opacity-50`
                                }
                                `}
                            >
                                <Hash size={10} />
                                {tag.name}
                            </button>
                        );
                    })}
                </div>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
             {filteredItems.length === 0 ? (
                 <div className="py-12 text-center text-base-content">
                     <FileText size={48} className="mx-auto mb-3 opacity-20" />
                     <p className="text-sm">No items found matching your criteria.</p>
                 </div>
             ) : (
                 filteredItems.map(item => {
                     const cat = categories.find(c => c.id === item.categoryId);
                     const Icon = getIcon(item.type);
                     const snippet = stripHtml(item.content || '').substring(0, 80) + '...';
                     
                     return (
                         <button
                            key={item.id}
                            onClick={() => { onSelect(item); onClose(); }}
                            className="w-full text-left p-2 rounded-lg hover:bg-base-100 border border-transparent hover:border-base-100 transition-all group"
                         >
                             <div className="flex items-start justify-between mb-1">
                                 <h4 className="text-sm font-bold text-base-content/70 group-hover:text-white truncate pr-4 flex items-center gap-2">
                                     <Icon size={14} className="opacity-50" />
                                     {item.title}
                                 </h4>
                                 {cat && (
                                     <span className="text-[10px] px-1.5 py-0.5 rounded-sm border opacity-80 bg-base-300 border-base-100">
                                         {cat.name}
                                     </span>
                                 )}
                             </div>
                             
                             <div className="flex items-center gap-2">
                                <p className="text-xs text-base-content/70 font-mono truncate flex-1">
                                    {snippet}
                                </p>
                                <ChevronRight size={14} className="text-base-200 group-hover:text-base-content/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>

                             {/* Active Tags on Item */}
                             {item.tags.length > 0 && (
                                 <div className="flex gap-1 mt-1">
                                     {item.tags.slice(0, 4).map(tId => {
                                         const t = tags.find(tag => tag.id === tId);
                                         if(!t) return null;
                                         return (
                                             <TagBadge key={tId} tag={t} className="scale-75 origin-left" />
                                         )
                                     })}
                                 </div>
                             )}
                         </button>
                     );
                 })
             )}
          </div>
          
          <div className="px-4 py-2 bg-base-300 border-t border-base-100 flex justify-between items-center text-[10px] text-base-content/70">
              <span>Navigate with filters</span>
              <div className="flex gap-2">
                  <span>Search: <strong>Title</strong> & <strong>Content</strong></span>
                  <span>•</span>
                  <span>Tags: <strong>AND</strong> Logic</span>
              </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default SearchPalette;
