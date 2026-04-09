import { useRef } from "react";
import { File, FileText, FileLock, Plus, Search, Loader2 } from "lucide-react";
import { useNotes } from "@/components/notes/hooks/useNotes";
import { NoteList } from "@/components/notes/NoteList";

import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { Note } from "@/components/notes/types";

export default function Notes() {
  const {
    sites,
    allTags,
    isLoading,
    search,
    setSearch,
    view,
    setView,
    editingNote,
    viewingNote,
    setViewingNote,
    formData,
    setFormData,
    loadTags,
    handleSaveNote,
    handleDelete,
    confirmDeleteId,
    setConfirmDeleteId,
    resetForm,
    openEdit,
    openView,
    openNotes,
    secureNotes,
    urlNoteId,
    navigate
  } = useNotes();

  const modalRef = useRef<HTMLDialogElement>(null);
  const viewModalRef = useRef<HTMLDialogElement>(null);

  const openModal = () => {
    if (modalRef.current) {
      modalRef.current.showModal();
    }
  };

  const closeModal = () => {
    if (modalRef.current) {
      modalRef.current.close();
    }
    resetForm();
    if (urlNoteId) navigate('/notes');
  };

  const closeViewModal = () => {
    if (viewModalRef.current) {
      viewModalRef.current.close();
    }
    setViewingNote(null);
    if (urlNoteId) navigate('/notes');
  };

  const handleOpenEdit = async (note: Note) => {
    const success = await openEdit(note);
    if (success) openModal();
  };

  const handleOpenView = async (note: Note) => {
    const success = await openView(note);
    if (success && viewModalRef.current) {
      viewModalRef.current.showModal();
    }
  };

  const getUsageCount = (tagId: string) => {
    return openNotes.concat(secureNotes).filter(n => n.tags?.includes(tagId)).length;
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}

      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl tracking-tight">Notes</h1>
          <p className="text-xs opacity-50">Manage your project notes and secure information.</p>
        </div>
        <div className="justify-end">
          <button className="btn btn-sm btn-primary" onClick={() => { resetForm(); openModal(); }}>
            <Plus className="h-4 w-4" />
            Add Note
          </button>

          <NoteEditor 
            modalRef={modalRef}
            editingNote={editingNote}
            formData={formData}
            setFormData={setFormData}
            sites={sites}
            onSave={async () => {
              const success = await handleSaveNote();
              if (success) closeModal();
            }}
            onClose={closeModal}
            onTagsUpdated={loadTags}
            getUsageCount={getUsageCount}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* search */}
        <label className="input bg-base-300/70 outline-none input-sm flex items-center gap-2 w-full max-w-sm">
          <Search className="h-4 w-4 opacity-70" />
          <input
            type="text"
            className="grow" 
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            
          />
        </label>
        {/* search */}
        <div role="tablist" className="tabs tabs-sm tabs-box text-xs bg-base-300 rounded-md gap-1">
          <button role="tab" className={`tab gap-2 ${view === 'open' ? 'tab-active' : ''}`} onClick={() => setView('open')}>
            <File className="h-4 w-4" /> Open Notes
          </button>
          <button role="tab" className={`tab gap-2 ${view === 'secure' ? 'tab-active' : ''}`} onClick={() => setView('secure')}>
            <FileLock className="h-4 w-4" /> Secure Vault
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin opacity-50" />
        </div>
      ) : (
        <div className="space-y-4">
          {view === 'open' && (
            <NoteList 
              notes={openNotes}
              sites={sites}
              allTags={allTags}
              onView={handleOpenView}
              onEdit={handleOpenEdit}
              onDelete={(id) => setConfirmDeleteId(id)}
            />
          )}

          {view === 'secure' && (
            <NoteList 
              notes={secureNotes}
              sites={sites}
              allTags={allTags}
              isSecure={true}
              onView={handleOpenView}
              onEdit={handleOpenEdit}
              onDelete={(id) => setConfirmDeleteId(id)}
            />
          )}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="modal modal-open">
          <div className="modal-box border border-red-500">
            <h3 className="font-bold text-lg text-red-400 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Confirm Deletion
            </h3>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete the note?
              </p>
              <div className="alert alert-sm alert-error alert-soft">
                <strong>{openNotes.concat(secureNotes).find(n => n.id === confirmDeleteId)?.title}</strong>
              </div>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-action">
              <button className="btn btn-sm btn-soft" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button 
                className="btn btn-sm btn-soft btn-error" 
                onClick={() => handleDelete(confirmDeleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <NoteViewer 
        viewModalRef={viewModalRef}
        viewingNote={viewingNote}
        sites={sites}
        allTags={allTags}
        onClose={closeViewModal}
      />
    </div>
  );
}
