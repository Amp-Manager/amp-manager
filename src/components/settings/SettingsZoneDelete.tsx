import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { deleteUserData } from '@/lib/db';
import { toast } from '@/utils/toast';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

export default function SettingsZoneDelete() {
  const { user, verifyPassword, logout } = useAuth();
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteDatabase = async () => {
    if (!user) return;
    if (!deletePassword) {
      toast.error("Please enter your password to confirm deletion.");
      return;
    }
    
    setIsDeleting(true);
    try {
      const isValid = await verifyPassword(deletePassword);
      if (!isValid) {
        toast.error("Invalid password. Database deletion aborted.");
        return;
      }

      await deleteUserData(user);
      toast.success("All data deleted successfully.");
      logout();
    } catch (err: any) {
      toast.error(`Failed to delete data: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setDeletePassword('');
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-200 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-error"></div>
      <div className="card-body">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-6 h-6 text-error" />
          <h2 className="card-title text-error">Dangerous Zone</h2>
        </div>
        <p className="text-sm opacity-70">
          This will permanently delete all local data, including your user account, all sites, notes, credentials, workflows, and settings. 
          <strong> This action cannot be undone.</strong>
        </p>

        <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <h3 className="font-bold text-error mb-2">Delete All Data</h3>
          <p className="text-xs opacity-80 mb-4">
            Please enter your password to confirm you want to delete all data for user <strong>{user}</strong>.
          </p>
          
          <div className="flex gap-4 items-end">
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input 
                type="password" 
                placeholder="Confirm your password" 
                className="input input-bordered w-full" 
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="off"
              />
            </div>
            <button 
              className="btn btn-error"
              onClick={handleDeleteDatabase}
              disabled={!deletePassword || isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
