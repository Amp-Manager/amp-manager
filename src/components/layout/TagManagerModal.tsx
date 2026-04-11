
import React, { useState, useEffect, Suspense } from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { Tag } from '../../types';
import { loadTagsJSON, saveTagsJSON } from '../../lib/db';
import TagBadge from './TagBadge';

// Lazy load palette
const Palette = React.lazy(() => import('./ColorPalette'));

interface Props {
  onClose: () => void;
  onUpdate?: () => void;
  // Generic usage check: returns count of items using this tag
  getUsageCount: (tagId: string) => number;
}

const TagManagerModal: React.FC<Props> = ({ onClose, onUpdate, getUsageCount }) => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [name, setName] = useState('');
    const [color, setColor] = useState('blue');
    const [error, setError] = useState<string | null>(null);

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const t = await loadTagsJSON();
            setTags(t);
        };
        load();
    }, []);

    const handleCreate = async () => {
        if(!name.trim()) return;
        setError(null);

        if (tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
            setError('Tag name already exists.');
            return;
        }

        const newTag = { id: `tag_${crypto.randomUUID()}`, name, color, created_at: Date.now() };
        const allTags = await loadTagsJSON();
        allTags.push(newTag);
        await saveTagsJSON(allTags);
        setTags([...tags, newTag]);
        setName('');
        if (onUpdate) onUpdate();
    };

    const handleDelete = async (id: string) => {
        const usageCount = getUsageCount(id);
        if (usageCount > 0) {
            setConfirmDeleteId(id);
            return;
        }
        await executeDelete(id);
    };

    const executeDelete = async (id: string) => {
        const allTags = await loadTagsJSON();
        const filtered = allTags.filter(t => t.id !== id);
        await saveTagsJSON(filtered);
        setTags(tags.filter(t => t.id !== id));
        if (onUpdate) onUpdate();
        setConfirmDeleteId(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-base-300/50 border border-base-100 rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between bg-base-300 border-b border-base-100 shrink-0 p-4">
                    <h3 className="text-sm font-bold text-base-content">Manage Tags</h3>
                    <button onClick={onClose} className="text-base-content hover:text-white transition-colors"><X size={16}/></button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {error && (
                        <div className="flex items-center gap-2 text-[10px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                            <AlertTriangle size={12} /> {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-base-content">Name</label>
                            <div className="flex gap-2">
                                <input 
                                    value={name} 
                                    onChange={e=>setName(e.target.value)} 
                                    className="flex-1 bg-black border border-base-100 rounded p-2 text-xs text-base-content focus:border-primary outline-none" 
                                    placeholder="Tag Name" 
                                />
                                <button 
                                    onClick={handleCreate} 
                                    disabled={!name.trim()} 
                                    className="btn btn-primary btn-sm px-3 disabled:opacity-70 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] uppercase font-bold text-base-content">Color Theme</label>
                             <Suspense fallback={<div className="h-20 bg-base-300 animate-pulse rounded"/>}>
                                <Palette selectedColor={color} onSelect={setColor} />
                             </Suspense>
                        </div>
                    </div>

                    <div className="border-t border-base-100 pt-4">
                        <h4 className="text-[10px] uppercase font-bold text-base-content mb-3">Existing Tags</h4>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(t => {
                                const usage = getUsageCount(t.id);
                                return (
                                    <div key={t.id} className="relative group">
                                        <TagBadge tag={t} onRemove={() => handleDelete(t.id)} />
                                        {usage > 0 && (
                                            <span className="absolute -top-1 -right-1 text-[9px] bg-base-300 text-base-content px-1 rounded-full border border-base-100">
                                                {usage}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {confirmDeleteId && (
                    <div className="absolute inset-0 z-[110] bg-black/90 flex items-center justify-center p-6 text-center animate-in fade-in duration-200">
                        <div className="space-y-4">
                            <AlertTriangle className="mx-auto text-red-500 h-10 w-10" />
                            <h4 className="text-white font-bold">Confirm Deletion</h4>
                            <p className="text-xs text-zinc-400">
                                This tag is used in {getUsageCount(confirmDeleteId)} items. <br/>
                                Are you sure you want to delete it?
                            </p>
                            <div className="flex gap-2 justify-center pt-2">
                                <button 
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="btn btn-xs btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => executeDelete(confirmDeleteId)}
                                    className="btn btn-xs btn-error"
                                >
                                    Delete Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TagManagerModal;
