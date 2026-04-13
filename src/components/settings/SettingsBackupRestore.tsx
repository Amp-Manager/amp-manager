import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { backupService } from '@/services/BackupService';
import { DatabaseBackup, Download, Upload, ShieldAlert, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { ampBridge } from '@/services/AMPBridge';

export default function SettingsBackupRestore() {
  const { user, encryptionKey } = useAuth();
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    setStatus(null);
    
    try {
      const data = await backupService.exportData(user, encryptionKey, includeSensitive);
      const json = JSON.stringify(data, null, 2);
      
      if (ampBridge.isAvailable()) {
        const path = await ampBridge.os.showSaveDialog('Export Backup', {
          defaultPath: `amp-backup-${new Date().toISOString().split('T')[0]}.json`,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        
        if (path) {
          await ampBridge.fs.writeTextFile(path, json);
          setStatus({ type: 'success', message: `Backup exported to ${path}` });
        }
      } else {
        // Browser fallback
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `amp-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus({ type: 'success', message: 'Backup downloaded successfully' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to export backup' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!user) return;
    
    let json = '';
    
    try {
      if (ampBridge.isAvailable()) {
        const paths = await ampBridge.os.showOpenDialog('Select Backup File', {
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        
        if (paths && paths.length > 0) {
          setIsImporting(true);
          json = await ampBridge.fs.readTextFile(paths[0]);
        } else {
          return;
        }
      } else {
        // Browser fallback (input type file)
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        const file = await new Promise<File | null>((resolve) => {
          input.onchange = (e: any) => resolve(e.target.files[0]);
          input.click();
        });
        
        if (!file) return;
        setIsImporting(true);
        json = await file.text();
      }

      const data = JSON.parse(json);
      await backupService.importData(user, data, encryptionKey, importMode === 'overwrite');
      setStatus({ type: 'success', message: 'Backup imported successfully. Please refresh the page.' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to import backup. Invalid file format.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-300 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
      <div className="card-body">
        <div className="flex items-center text-green-500 gap-2 mb-2">
          <DatabaseBackup className="w-6 h-6" />
          <h2 className="card-title">Backup & Restore</h2>
        </div>
        <p className="text-sm opacity-70">Portability and disaster recovery for your local database.</p>

        {status && (
          <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'} mt-4 py-2 text-sm`}>
            {status.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{status.message}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mt-6">
          {/* Export Column */}
          <div className="space-y-4 pr-0 md:pr-8 border-r-0 md:border-r border-base-200">
            <h3 className="text-green-500 font-bold flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Data
            </h3>
            <p className="text-xs opacity-60">Save your entire database to a JSON file.</p>
            
            <div className="flex flex-col gap-2">
              <p className="label-text text-xs opacity-70">Export Mode</p>
              <label className="label cursor-pointer justify-start gap-3">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary checkbox-sm" 
                  checked={includeSensitive}
                  onChange={(e) => setIncludeSensitive(e.target.checked)}
                />
                <span className="label-text">Include sensitive data</span>
              </label>
            </div>
            
            <div className="bg-base-200 p-3 rounded-lg">
              <p className="text-xs opacity-70 leading-tight">
              Credentials and Secure Notes will be decrypted for portability.
              </p>
            </div>

            {includeSensitive && (
              <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg flex gap-3">
                <ShieldAlert className="w-5 h-5 text-warning shrink-0" />
                <p className="text-[10px] text-warning leading-tight">
                  <strong>SECURITY WARNING:</strong> Your backup will contain plain-text secrets. Store the exported file in a secure location.
                </p>
              </div>
            )}

            <button 
              className="btn btn-sm btn-neutral w-full" 
              onClick={handleExport}
              disabled={isExporting || isImporting}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export to JSON
            </button>
          </div>

          {/* Import Column */}
          <div className="space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <Upload className="w-4 h-4" /> Import Data
            </h3>
            <p className="text-xs opacity-60">Restore data from a previous backup file.</p>

            <div className="flex flex-col gap-2">
              <label className="label-text text-xs opacity-70">Import Mode</label>
              <div className="flex gap-4">
                <label className="label cursor-pointer gap-2">
                  <input 
                    type="radio" 
                    name="importMode" 
                    className="radio radio-primary radio-sm" 
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                  />
                  <span className="label-text text-xs">Merge</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input 
                    type="radio" 
                    name="importMode" 
                    className="radio radio-error radio-sm" 
                    checked={importMode === 'overwrite'}
                    onChange={() => setImportMode('overwrite')}
                  />
                  <span className="label-text text-xs text-error">Overwrite</span>
                </label>
              </div>
            </div>

            <div className="bg-base-200 p-3 rounded-lg">
              <p className="text-xs opacity-70 leading-tight">
                Imported data is automatically re-encrypted using the current session key.
              </p>
            </div>

            <button 
              className="btn btn-sm btn-soft w-full"
              onClick={handleImport}
              disabled={isExporting || isImporting}
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Select & Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
