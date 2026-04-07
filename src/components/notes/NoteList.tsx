import React from 'react';
import { FileText, Edit, Trash2, Lock, Unlock } from 'lucide-react';
import { Note, Site } from './types';
import { Tag } from '@/types';
import { COLOR_MAP } from '@/components/layout/uiConstants';

interface NoteListProps {
  notes: Note[];
  sites: Site[];
  allTags: Tag[];
  isSecure?: boolean;
  onView: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  sites,
  allTags,
  isSecure = false,
  onView,
  onEdit,
  onDelete
}) => {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg shadow overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>
                <div className="flex items-center gap-2">
                  {isSecure ? <Lock className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                  <span className="text-center">{isSecure ? 'Secure Vault' : 'Open Notes'}</span>
                </div>
              </th>
              {isSecure && <th>Status</th>}
              <th>Context</th>
              <th>Updated</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan={isSecure ? 5 : 4} className="text-center py-8 opacity-50">
                  {isSecure ? 'No secure notes found.' : 'No open notes found.'}
                </td>
              </tr>
            ) : notes.map((note) => (
              <tr key={note.id} className="hover">
                <td className="font-medium">{note.title}</td>
                {isSecure && (
                  <td>
                    <div className="badge badge-outline badge-success gap-1">
                      <Unlock className="h-3 w-3" /> Unlocked
                    </div>
                  </td>
                )}
                <td>
                  <div className="flex flex-wrap gap-1">
                    {note.site_id && (
                      <div className="badge badge-outline bg-base-200">
                        {sites.find(s => s.id === note.site_id)?.domain || 'Unknown Site'}
                      </div>
                    )}
                    {note.tags?.map(tagId => {
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
                  </div>
                </td>
                <td className="text-sm opacity-70">
                  {new Date(note.updated_at).toLocaleDateString()}
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button className="btn btn-ghost btn-xs" onClick={() => onView(note)}>
                      <FileText className="h-4 w-4" />
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={() => onEdit(note)}>
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => onDelete(note.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
};
