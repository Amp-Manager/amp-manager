import React from 'react';
import { Note, Site } from './types';
import { Tag } from '@/types';
import { COLOR_MAP } from '@/components/layout/uiConstants';

interface NoteViewerProps {
  viewModalRef: React.RefObject<HTMLDialogElement>;
  viewingNote: Note | null;
  sites: Site[];
  allTags: Tag[];
  onClose: () => void;
}

export const NoteViewer: React.FC<NoteViewerProps> = ({
  viewModalRef,
  viewingNote,
  sites,
  allTags,
  onClose
}) => {
  return (
    <dialog ref={viewModalRef} className="modal">
      <div className="modal-box border border-base-100 max-w-2xl">
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
        </form>
        {viewingNote && (
          <>
            <h3 className="font-bold text-2xl mb-4">{viewingNote.title}</h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {viewingNote.site_id && (
                <div className="badge badge-outline bg-base-200">
                  {sites.find(s => s.id === viewingNote.site_id)?.domain || 'Unknown Site'}
                </div>
              )}
              {viewingNote.tags.map(tagId => {
                const tagDef = allTags.find(t => t.id === tagId);
                const tagName = tagDef ? tagDef.name : (tagId.startsWith('tag_') ? 'Loading...' : tagId);
                return (
                  <span key={tagId}>
                    <div className={`badge badge-outline text-xs ${tagDef ? COLOR_MAP[tagDef.color] : 'badge-secondary'}`}>
                      {tagName}
                    </div>
                  </span>
                );
              })}
              <div className="badge badge-ghost text-xs ml-auto">
                {new Date(viewingNote.updated_at).toLocaleString()}
              </div>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm">{viewingNote.content}</pre>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
};
