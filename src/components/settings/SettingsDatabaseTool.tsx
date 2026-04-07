import React, { useState, useEffect } from 'react';
import { Database, Save, Loader2 } from 'lucide-react';
import { initDB } from '@/lib/db';
import { toast } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';

export default function SettingsDatabaseTool() {
  const { user } = useAuth();
  const [dbToolPath, setDbToolPath] = useState<string>('');
  const [dbToolType, setDbToolType] = useState<'url' | 'path'>('url');
  const [isSavingDbTool, setIsSavingDbTool] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDbToolSettings = async () => {
      if (!user) return;
      try {
        const db = await initDB(user);
        
        const savedDbTool = await db.get('settings', 'DBToolPath');
        if (savedDbTool) setDbToolPath(savedDbTool.value);

        const savedDbToolType = await db.get('settings', 'DBToolType');
        if (savedDbToolType) setDbToolType(savedDbToolType.value);
      } catch (err) {
        // Silently fail - settings will use defaults
      } finally {
        setIsLoading(false);
      }
    };
    fetchDbToolSettings();
  }, [user]);

  const handleSaveDbTool = async () => {
    if (!user) return;
    setIsSavingDbTool(true);
    try {
      const db = await initDB(user);
      await Promise.all([
        db.put('settings', { key: 'DBToolPath', value: dbToolPath }),
        db.put('settings', { key: 'DBToolType', value: dbToolType })
      ]);
      toast.success("Database tool settings saved successfully");
    } catch (err) {
      toast.error("Failed to save DB tool settings");
    } finally {
      setIsSavingDbTool(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl border border-base-200 animate-pulse">
        <div className="card-body h-64 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin opacity-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">

        <p className="text-sm opacity-70 mb-4">Configure your preferred tool for managing databases (e.g., Adminer, DBeaver, phpMyAdmin).</p>
        
        <div className="form-control w-full bg-base-200/50 rounded-lg space-y-4 p-4">
          <div className="flex flex-col gap-2">
            <label className="label-text opacity-70">Tool Type</label>
            <div className="flex gap-4">
              <label className="label cursor-pointer gap-2">
                <input 
                  type="radio" 
                  name="dbToolType" 
                  className="radio radio-primary radio-sm" 
                  checked={dbToolType === 'url'}
                  onChange={() => setDbToolType('url')}
                />
                <span className="label-text text-xs">Web URL (e.g. adminer.local)</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input 
                  type="radio" 
                  name="dbToolType" 
                  className="radio radio-primary radio-sm" 
                  checked={dbToolType === 'path'}
                  onChange={() => setDbToolType('path')}
                />
                <span className="label-text text-xs">Local Software Path</span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <label className="label" htmlFor="db-tool-path">
              <span className="label-text font-medium">
                {dbToolType === 'url' ? 'Tool URL' : 'Software Executable Path'}
              </span>
            </label>
            <div className="flex gap-4">
              <input 
                type="text" 
                id="db-tool-path" 
                placeholder={dbToolType === 'url' ? "http://adminer.local" : "C:\\Program Files\\DBeaver\\dbeaver.exe"} 
                className="input input-sm input-bordered flex-1" 
                value={dbToolPath}
                onChange={(e) => setDbToolPath(e.target.value)}
              />
              <button 
                className="btn btn-sm btn-neutral" 
                onClick={handleSaveDbTool}
                disabled={isSavingDbTool}
              >
                {isSavingDbTool ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>

          <div className="alert alert-sm alert-info alert-soft">
            <span className="text-sm">
              {dbToolType === 'url' 
                ? "This URL will be opened in your default browser." 
                : "This path will be used to launch the desktop application."}
            </span>
          </div>
        </div>
     
    </div>
  );
}
