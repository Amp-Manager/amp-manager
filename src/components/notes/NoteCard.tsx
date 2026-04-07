import React from 'react';
import { FileText, Edit, Trash2 } from 'lucide-react';
import { Note, Site } from './types';
import { Tag } from '@/types';
import { COLOR_MAP } from '@/components/layout/uiConstants';

interface NoteCardProps {
  note: Note;
  sites: Site[];
  allTags: Tag[];
  onView: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  sites,
  allTags,
  onView,
  onEdit,
  onDelete
}) => {
  return (
    <div className="card bg-base-100 border border-base-200 shadow">
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <h2 className="card-title text-lg">{note.title}</h2>
          {note.site_id && (
            <div className="badge badge-outline text-xs">
              {sites.find(s => s.id === note.site_id)?.domain}
            </div>
          )}
        </div>
        <div className="flex flex-row items-center justify-between">
          <div className="text-xs opacity-70">
            {new Date(note.updated_at).toLocaleDateString()}
          </div>
          <div className="flex justify-end gap-0">
            <button className="btn btn-ghost btn-xs" onClick={() => onView(note)}><FileText className="h-4 w-4" /></button>
            <button className="btn btn-ghost btn-xs" onClick={() => onEdit(note)}><Edit className="h-4 w-4" /></button>
            <button className="btn btn-ghost btn-xs text-error" onClick={() => onDelete(note.id)}><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {note.tags?.map(tagId => {
            const tagDef = allTags.find(t => t.id === tagId);
            const tagName = tagDef ? tagDef.name : (tagId.startsWith('tag_') ? 'Loading...' : tagId);
            return (
              <span key={tagId}>
                <div className={`badge badge-outline text-[10px] h-5 px-1 ${tagDef ? COLOR_MAP[tagDef.color] : 'badge-secondary'}`}>
                  {tagName}
                </div>
              </span>
            );
          })}
        </div>
        <p className="text-sm opacity-70 line-clamp-4 whitespace-pre-wrap">
          {note.content}
        </p>
      </div>
    </div>
  );
};
