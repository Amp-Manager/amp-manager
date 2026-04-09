import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteWorkflowModal: React.FC<DeleteWorkflowModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 rounded-[16px] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-300/50 p-6 rounded-lg shadow-2xl w-full max-w-sm border border-error">
        <h3 className="text-xl font-bold mb-4 text-error flex items-center gap-2">
          <Trash2 className="w-5 h-5" /> Delete Workflow?
        </h3>
        <p className="text-sm opacity-70 mb-6">
          Are you sure you want to delete this workflow? <br/>
          This action cannot be undone.
        </p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-error" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
};
