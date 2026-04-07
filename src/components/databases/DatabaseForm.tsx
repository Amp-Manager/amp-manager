import React, { Suspense, lazy } from "react";
import { Plus, User, Key, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { DatabaseFormData } from "./types";

const TagSelector = lazy(() => import("@/components/layout/TagSelector"));

interface DatabaseFormProps {
  formData: DatabaseFormData;
  setFormData: React.Dispatch<React.SetStateAction<DatabaseFormData>>;
  isCreating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  getUsageCount: (tagId: string) => number;
  onTagsUpdated: () => void;
}

export function DatabaseForm({ 
  formData, 
  setFormData, 
  isCreating, 
  onSubmit, 
  getUsageCount, 
  onTagsUpdated 
}: DatabaseFormProps) {
  return (
    <div className="col-span-1">
      <div className="card bg-base-100 shadow border border-base-300 mb-6">
        <div className="card-body p-4">
          <h2 className="card-title text-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Database
          </h2>
          <p className="text-xs opacity-50 mb-2">Create a new database and a dedicated user with full privileges.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs uppercase opacity-70">Database Name</span>
              </label>
              <input 
                type="text" 
                placeholder="my_project_db" 
                className="input input-bordered input-sm font-mono"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    name,
                    user: prev.user === "" || prev.user === prev.name ? name : prev.user
                  }));
                }}
              />
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs uppercase opacity-70">Username</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-70" />
                <input 
                  type="text" 
                  placeholder="db_user" 
                  className="input input-bordered input-sm w-full pl-9 font-mono"
                  value={formData.user}
                  onChange={(e) => setFormData(prev => ({ ...prev, user: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs uppercase opacity-70">Password</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-70" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="input input-bordered input-sm w-full pl-9 font-mono"
                  value={formData.pass}
                  onChange={(e) => setFormData(prev => ({ ...prev, pass: e.target.value }))}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs uppercase opacity-70">Tags</span>
              </label>
              <Suspense fallback={<div className="h-8 bg-base-300 animate-pulse rounded" />}>
                <TagSelector 
                  selectedTagIds={formData.tags}
                  onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                  getUsageCount={getUsageCount}
                  onTagsUpdated={onTagsUpdated}
                />
              </Suspense>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-sm btn-block"
              disabled={isCreating}
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              New Database
            </button>
          </form>
        </div>
      </div>

      <div className="alert alert-soft alert-info text-xs leading-relaxed">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          AMP Databases are stored in <code>/data</code>. 
          The default password is set to <code>root</code>.
        </span>
      </div>
    </div>
  );
}
