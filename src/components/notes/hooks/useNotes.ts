import { useState, useEffect, useCallback } from "react";
import { toast } from "@/utils/toast";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { 
  loadNotesJSON, saveNotesJSON, 
  loadSitesJSON, 
  loadTagsJSON, 
  logActivityJSON 
} from "@/lib/db";
import { encryptWithKey, decryptWithKey } from "@/lib/crypto";
import { useBatchError } from "@/context/BatchErrorContext";
import { useAuth } from "@/context/AuthContext";
import { Tag } from "@/types";
import { Note, Site, NoteFormData } from "../types";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("open"); // 'open', 'secure', 'grid'
  const { encryptionKey, user } = useAuth();
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { handleError } = useBatchError();
  const location = useLocation();
  const { id: urlNoteId } = useParams();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState<NoteFormData>({
    title: "",
    content: "",
    site_id: "none",
    tags: [] as string[],
    is_encrypted: false
  });

  const loadTags = useCallback(async () => {
    const t = await loadTagsJSON();
    setAllTags(t);
  }, []);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const allNotes = await loadNotesJSON(user, encryptionKey || undefined);
      const normalizedNotes = allNotes.map(n => ({
        ...n,
        tags: Array.isArray(n.tags) ? n.tags : (typeof (n.tags as any) === 'string' ? (n.tags as any).split(',').map((t: string) => t.trim()).filter(Boolean) : [])
      }));
      setNotes(normalizedNotes.sort((a, b) => b.updated_at - a.updated_at));
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, encryptionKey, handleError]);

  const loadSites = useCallback(async () => {
    try {
      const allSites = await loadSitesJSON();
      setSites(allSites);
    } catch (err) {
      // Silently fail - sites dropdown will be empty
    }
  }, []);

  useEffect(() => {
    loadNotes();
    loadSites();
    loadTags();
  }, [user, loadNotes, loadSites, loadTags]);

  useEffect(() => {
    if (location.state?.domain && sites.length > 0) {
      const site = sites.find(s => s.domain === location.state.domain);
      setFormData(prev => ({ ...prev, site_id: site?.id || "none" }));
    }
  }, [location.state, sites]);

  useEffect(() => {
    if (urlNoteId && notes.length > 0) {
      const note = notes.find(n => n.id === urlNoteId);
      if (note) {
        openView(note);
      }
    }
  }, [urlNoteId, notes]);

  const handleSaveNote = async () => {
    if (!user) return;
    try {
      const timestamp = Date.now();
      
      let noteData: any = {
        id: editingNote ? editingNote.id : crypto.randomUUID(),
        title: formData.title,
        site_id: formData.site_id === "none" ? undefined : formData.site_id,
        tags: formData.tags,
        is_encrypted: formData.is_encrypted,
        created_at: editingNote ? editingNote.created_at : timestamp,
        updated_at: timestamp
      };

      if (formData.is_encrypted) {
        if (!encryptionKey) {
          toast.error("Encryption key not available. Please re-login.");
          return;
        }
        
        const { iv, ciphertext } = await encryptWithKey(formData.content, encryptionKey);
        noteData.content = ""; 
        noteData.content_iv = iv;
        noteData.content_ciphertext = ciphertext;
        noteData.content_salt = "session"; 
      } else {
        noteData.content = formData.content;
      }

      const allNotes = await loadNotesJSON(user, encryptionKey || undefined);
      const existingIndex = allNotes.findIndex(n => n.id === noteData.id);
      if (existingIndex >= 0) {
        allNotes[existingIndex] = noteData;
      } else {
        allNotes.push(noteData);
      }
      await saveNotesJSON(user, allNotes, formData.is_encrypted ? encryptionKey : undefined);
      
      await logActivityJSON(user, editingNote ? 'update' : 'create', 'note', noteData.id, noteData.title);
      await loadNotes();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const noteToDelete = notes.find(n => n.id === id);
      
      const allNotes = await loadNotesJSON(user, encryptionKey || undefined);
      const filtered = allNotes.filter(n => n.id !== id);
      await saveNotesJSON(user, filtered, encryptionKey || undefined);
      
      if (noteToDelete) {
        await logActivityJSON(user, 'delete', 'note', id, noteToDelete.title);
      }
      
      setNotes(notes.filter(n => n.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      handleError(err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      site_id: "none",
      tags: [],
      is_encrypted: false
    });
    setEditingNote(null);
  };

  const openEdit = async (note: Note) => {
    let content = note.content;
    
    if (note.is_encrypted) {
      if (!encryptionKey) {
        toast.error("Encryption key not available. Please re-login.");
        return null;
      }
      try {
        content = await decryptWithKey(note.content_iv!, note.content_ciphertext!, encryptionKey);
      } catch (e) {
        toast.error("Decryption failed. Session key might be invalid.");
        return null;
      }
    }

    setEditingNote(note);
    setFormData({
      title: note.title,
      content: content,
      site_id: note.site_id || "none",
      tags: Array.isArray(note.tags) ? note.tags : (typeof (note.tags as any) === 'string' ? (note.tags as any).split(',').map((t: string) => t.trim()).filter(Boolean) : []),
      is_encrypted: note.is_encrypted
    });
    return true;
  };

  const openView = async (note: Note) => {
    let content = note.content;
    
    if (note.is_encrypted) {
      if (!encryptionKey) {
        toast.error("Encryption key not available. Please re-login.");
        return null;
      }
      try {
        content = await decryptWithKey(note.content_iv!, note.content_ciphertext!, encryptionKey);
      } catch (e) {
        toast.error("Decryption failed. Session key might be invalid.");
        return null;
      }
    }

    setViewingNote({ ...note, content });
    return true;
  };

  const filteredNotes = notes.filter(n => 
    (n.title || "").toLowerCase().includes((search || "").toLowerCase()) || 
    (n.tags || []).some(t => (t || "").toLowerCase().includes((search || "").toLowerCase()))
  );

  const openNotes = filteredNotes.filter(n => !n.is_encrypted);
  const secureNotes = filteredNotes.filter(n => n.is_encrypted);

  return {
    notes,
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
  };
}
