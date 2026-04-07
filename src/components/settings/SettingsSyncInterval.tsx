import React, { useState, useEffect } from 'react';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { initDB } from '@/lib/db';

export function SettingsSyncInterval() {
  const { user } = useAuth();
  const [syncIntervalHours, setSyncIntervalHours] = useState(6);
  const [forceSyncOnStartup, setForceSyncOnStartup] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      try {
        const db = await initDB(user);
        
        const intervalSetting = await db.get('settings', 'syncIntervalHours');
        if (intervalSetting) {
          setSyncIntervalHours(Number(intervalSetting.value) || 6);
        }

        const forceSetting = await db.get('settings', 'forceSyncOnStartup');
        if (forceSetting !== undefined) {
          setForceSyncOnStartup(forceSetting.value ?? true);
        }
      } catch (err) {
        // Silently fail - settings will use defaults
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const db = await initDB(user);
      
      await db.put('settings', { 
        key: 'syncIntervalHours', 
        value: syncIntervalHours 
      });
      
      await db.put('settings', { 
        key: 'forceSyncOnStartup', 
        value: forceSyncOnStartup 
      });
      
      toast.success('Sync settings saved');
    } catch (err) {
      toast.error('Failed to save sync settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setSyncIntervalHours(6);
    setForceSyncOnStartup(true);
    toast.info('Settings reset to defaults');
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin opacity-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      
        <p className="text-sm opacity-70">
          How often to scan your local domains, validate SSL certificates, and sync the database.
        </p>
        
        <div className="space-y-4 mt-4">

          <div className="form-control grid grid-cols-2 gap-6"> 

            {/* Sync Interval */}
            <div className="flex flex-col gap-4 align-center w-full bg-base-200/50 rounded-lg space-y-2 p-4">
              <span className="label-text">
                Domain sync interval <span className="badge badge-sm badge-info badge-soft"> {syncIntervalHours} hours</span>
              </span>
              <input
                type="range"
                min={1}
                max={24}
                value={syncIntervalHours}
                onChange={(e) => setSyncIntervalHours(Number(e.target.value))}
                className="range range-primary range-xs w-full"
                step={1}
              />
              <div className="flex justify-between text-xs border-t-2 border-dotted border-primary opacity-50 mt-1 px-1 py-2">
                <span>1h</span>
                <span>12h</span>
                <span>24h</span>
              </div>
            </div>

            {/* Force Sync on Startup */} 
            <div className="flex flex-col align-center bg-base-200/50 rounded-lg space-y-4 p-4">
              <p className="text-sm">
                Configure startup behavior
              </p>
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-primary"
                  checked={forceSyncOnStartup}
                  onChange={(e) => setForceSyncOnStartup(e.target.checked)}
                />
                <span className="label-text font-medium">Run domain check on startup</span>
              </label>
              <span className="alert alert-sm alert-info alert-soft">
                Always scan domains and validate SSL when the app launches.
              </span>
            </div>

          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-sm btn-soft"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save
            </button>
          </div>
        </div>
  
    </div>
  );
}
