import React from 'react';
import TagSelector from '@/components/layout/TagSelector';
import { loadTagsJSON } from '@/lib/db';

interface SaveWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowTitle: string;
  setWorkflowTitle: (title: string) => void;
  workflowDesc: string;
  setWorkflowDesc: (desc: string) => void;
  workflowTags: string[];
  setWorkflowTags: (tags: string[]) => void;
  savedWorkflows: any[];
  onSave: () => void;
  user: any;
  setAllTags: (tags: any[]) => void;
}

export const SaveWorkflowModal: React.FC<SaveWorkflowModalProps> = ({
  isOpen,
  onClose,
  workflowTitle,
  setWorkflowTitle,
  workflowDesc,
  setWorkflowDesc,
  workflowTags,
  setWorkflowTags,
  savedWorkflows,
  onSave,
  user,
  setAllTags,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 rounded-[16px] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-300/50 border border-base-100 p-6 rounded-lg shadow-2xl w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Save Workflow</h3>
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Workflow Title</span>
            </label>
            <input 
              type="text" 
              placeholder="e.g. Deploy to Production" 
              className="input input-bordered w-full"
              value={workflowTitle}
              onChange={(e) => setWorkflowTitle(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea 
              className="textarea textarea-bordered w-full" 
              placeholder="What does this workflow do?"
              value={workflowDesc}
              onChange={(e) => setWorkflowDesc(e.target.value)}
            ></textarea>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Tags</span>
            </label>
            <TagSelector 
              selectedTagIds={workflowTags}
              onTagsChange={setWorkflowTags}
              getUsageCount={(tagId) => {
                return savedWorkflows.filter(w => w.tags?.includes(tagId)).length;
              }}
              onTagsUpdated={async () => {
                const tags = await loadTagsJSON();
                setAllTags(tags);
              }}
            />
          </div>
        </div>
        <div className="modal-action mt-6">
          <button className="btn btn-sm btn-soft" onClick={onClose}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
};
