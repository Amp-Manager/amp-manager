import React, { Suspense, lazy } from 'react';
import { Note, Site, NoteFormData } from './types';

const TagSelector = lazy(() => import("@/components/layout/TagSelector"));

interface NoteEditorProps {
  modalRef: React.RefObject<HTMLDialogElement>;
  editingNote: Note | null;
  formData: NoteFormData;
  setFormData: (data: NoteFormData) => void;
  sites: Site[];
  onSave: () => void;
  onClose: () => void;
  onTagsUpdated: () => void;
  getUsageCount: (tagId: string) => number;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  modalRef,
  editingNote,
  formData,
  setFormData,
  sites,
  onSave,
  onClose,
  onTagsUpdated,
  getUsageCount
}) => {
  return (
    <dialog ref={modalRef} className="modal">
      <div className="modal-box border border-base-100 max-w-2xl">
        <h3 className="font-bold text-lg">{editingNote ? 'Edit Note' : 'Add New Note'}</h3>              
        <div className="form-control text-right">
          <label className="label cursor-pointer justify-start gap-4">
            <span className="label-text label-text-sm">Encrypt this note</span>
            <input 
              type="checkbox" 
              className="toggle toggle-sm toggle-primary" 
              checked={formData.is_encrypted} 
              onChange={e => setFormData({...formData, is_encrypted: e.target.checked})} 
            />
          </label>
        </div>
        
        <div className="grid gap-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Title</span>
            </label>
            <input 
              type="text" 
              placeholder="Note title" 
              className="input input-bordered w-full" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Link Domain</span>
            </label>
            <select 
              className="select select-bordered w-full"
              value={formData.site_id} 
              onChange={e => setFormData({...formData, site_id: e.target.value})}
            >
              <option value="none">None</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.domain}</option>
              ))}
            </select>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Tags</span>
            </label>
            <Suspense fallback={<div className="h-8 bg-base-300 animate-pulse rounded" />}>
              <TagSelector 
                selectedTagIds={formData.tags}
                onTagsChange={(tags) => setFormData({ ...formData, tags })}
                getUsageCount={getUsageCount}
                onTagsUpdated={onTagsUpdated}
              />
            </Suspense>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Content</span>
            </label>
            <textarea 
              className="textarea textarea-bordered font-mono h-48 w-full" 
              placeholder="Note content..."
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
            ></textarea>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-sm btn-neutral" onClick={onClose}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={onSave}>Save Note</button>
        </div>
      </div>
    </dialog>
  );
};
