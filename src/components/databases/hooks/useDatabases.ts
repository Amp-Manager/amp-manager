import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { databaseService } from "@/services/DatabaseService";
import { initDB, logActivity } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/utils/toast";
import { Tag } from "@/types";
import { DatabaseWithTags, DatabaseFormData } from "../types";
import { ampBridge } from "@/services/AMPBridge";

export function useDatabases() {
  const { user } = useAuth();
  const [databases, setDatabases] = useState<DatabaseWithTags[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDbRunning, setIsDbRunning] = useState<boolean | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState<DatabaseFormData>({
    name: "",
    user: "",
    pass: "",
    tags: []
  });
  const [isCreating, setIsCreating] = useState(false);

  // Tool State
  const [dbToolPath, setDbToolPath] = useState("");
  const [dbToolType, setDbToolType] = useState<'url' | 'path'>('url');

  // Delete Modal State
  const [dbToDelete, setDbToDelete] = useState<string | null>(null);
  const confirmModalRef = useRef<HTMLDialogElement>(null);

  const loadFromCache = useCallback(async () => {
    if (!user) return;
    try {
      const db = await initDB(user);
      const cache = await db.get('databases_cache', 'list');
      if (cache) {
        setDatabases(cache.data);
        setLastUpdated(cache.timestamp);
      }
    } catch (err) {
      // Silently fail - will fetch fresh data
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchDatabases = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const list = await databaseService.listDatabases();
      const db = await initDB(user);
      const dbMetadata = await db.getAll('databases');

      const mergedList = list.map(item => {
        const meta = dbMetadata.find(m => m.name === item.name);
        return {
          ...item,
          tags: meta?.tags || []
        };
      });

      // Save to cache
      const timestamp = Date.now();
      await db.put('databases_cache', { key: 'list', data: mergedList, timestamp });

      setDatabases(mergedList);
      setLastUpdated(timestamp);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch databases");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  const loadTags = useCallback(async () => {
    if (!user) return;
    const db = await initDB(user);
    const t = await db.getAll('tags');
    setAllTags(t);
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const db = await initDB(user);
      const path = await db.get('settings', 'DBToolPath');
      const type = await db.get('settings', 'DBToolType');
      if (path) setDbToolPath(path.value);
      if (type) setDbToolType(type.value);
    } catch (err) {
      // Silently fail - tool settings will use defaults
    }
  }, [user]);

  const checkStatus = useCallback(async () => {
    if (ampBridge.isAvailable()) {
      try {
        const status = await ampBridge.runtimeStatus();
        setIsDbRunning(status.db === true);
      } catch (err) {
        setIsDbRunning(false);
      }
    }
  }, []);

  useEffect(() => {
    // Load from cache only - no disk read on mount
    loadFromCache();
    loadSettings();
    loadTags();

    // Check DB running status (lightweight operation)
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [loadFromCache, loadSettings, loadTags, checkStatus]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const { name, user: dbUser, pass, tags } = formData;
    
    if (!name || !dbUser || !pass) {
      toast.error("Please fill all fields");
      return;
    }
    
    if (name.includes('|') || dbUser.includes('|') || pass.includes('|')) {
      toast.error("Database name, user, and password cannot contain the '|' character");
      return;
    }

    setIsCreating(true);
    try {
      const payload = `${name}|||${dbUser}|||${pass.replace(/\"/g, '\\\\\"')}`;
      const res = await databaseService.createDatabase(payload);
      
      toast.success(res.message);
      if (user) {
        const db = await initDB(user);
        await logActivity(db, 'create', 'database', name, name);
        
        await db.put('databases', {
          name,
          tags,
          updated_at: Date.now()
        });
      }
      setFormData({ name: "", user: "", pass: "", tags: [] });
      fetchDatabases();
    } catch (err: any) {
      toast.error(err.message || "Failed to create database");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (dbName: string) => {
    setDbToDelete(dbName);
    confirmModalRef.current?.showModal();
  };

  const handleConfirmDelete = async () => {
    if (!dbToDelete) return;
    
    confirmModalRef.current?.close();
    
    try {
      const res = await databaseService.deleteDatabase(dbToDelete);
      toast.success(res.message);
      if (user) {
        const db = await initDB(user);
        await logActivity(db, 'delete', 'database', dbToDelete, dbToDelete);
        await db.delete('databases', dbToDelete);
      }
      fetchDatabases();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete database");
    } finally {
      setDbToDelete(null);
    }
  };

  const handleOpenTool = async () => {
    if (!dbToolPath) {
      toast.error("No database tool configured in Settings");
      return;
    }
    try {
      await databaseService.launchTool(dbToolPath, dbToolType);
      toast.success("Database tool launched");
    } catch (err: any) {
      toast.error(err.message || "Failed to launch database tool");
    }
  };

  const getUsageCount = useCallback((tagId: string) => {
    return databases.filter(db => db.tags?.includes(tagId)).length;
  }, [databases]);

  const filteredDbs = databases.filter(db => 
    db.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    databases,
    allTags,
    loading,
    searchQuery,
    setSearchQuery,
    isRefreshing,
    isDbRunning,
    lastUpdated,
    formData,
    setFormData,
    isCreating,
    dbToDelete,
    confirmModalRef,
    filteredDbs,
    fetchDatabases,
    loadTags,
    handleCreate,
    handleDeleteClick,
    handleConfirmDelete,
    handleOpenTool,
    getUsageCount
  };
}
