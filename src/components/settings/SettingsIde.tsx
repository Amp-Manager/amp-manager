import React, { useState, useEffect } from 'react';
import { Code, Save, Loader2 } from 'lucide-react';
import { loadSettingsJSON, saveSettingsJSON } from '@/lib/db';
import { toast } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';

export default function SettingsIde() {
  const { user } = useAuth();
  const [idePath, setIdePath] = useState<string>('');
  const [isSavingIde, setIsSavingIde] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIdePath = async () => {
      if (!user) return;
      try {
        const settings = await loadSettingsJSON(user);
        if (settings.IDEpath) setIdePath(settings.IDEpath);
      } catch (err) {
        // Silently fail - IDE path will be empty
      } finally {
        setIsLoading(false);
      }
    };
    fetchIdePath();
  }, [user]);

  const handleSaveIde = async () => {
    if (!user) return;
    setIsSavingIde(true);
    try {
      const settings = await loadSettingsJSON(user);
      settings.IDEpath = idePath;
      await saveSettingsJSON(user, settings);
      toast.success("IDE path saved successfully");
    } catch (err) {
      toast.error("Failed to save IDE path");
    } finally {
      setIsSavingIde(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl border border-base-200 animate-pulse">
        <div className="card-body h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin opacity-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">

        <p className="text-sm opacity-70 mb-4">Add the path to your IDE to edit your local domains.</p>
        
        <div className="form-control w-full bg-base-200/50 rounded-lg space-y-4 p-4">
          <label className="label" htmlFor="ide-path">
            <span className="label-text font-medium">IDE Executable Path</span>
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              id="ide-path" 
              placeholder="C:\Users\Name\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd" 
              className="input input-sm input-bordered flex-1" 
              value={idePath}
              onChange={(e) => setIdePath(e.target.value)}
            />
            <button 
              className="btn btn-sm btn-neutral" 
              onClick={handleSaveIde}
              disabled={isSavingIde}
            >
              {isSavingIde ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
          <div className="alert alert-sm alert-info alert-soft">
            <span className="text-sm">
              Tip: For VS Code, use the path to <code>code.cmd</code> or <code>code.exe</code>
            </span>
          </div>
        </div>
    </div>
  );
}
