import React from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";

interface DeleteConfirmModalProps {
  modalRef: React.RefObject<HTMLDialogElement>;
  dbName: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ modalRef, dbName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box border border-base-100 shadow-2xl">
        <h3 className="font-bold text-lg flex items-center gap-2 text-error">
          <AlertTriangle className="h-5 w-5" />
          Confirm Database Deletion
        </h3>
        <p className="py-4">
          Are you sure you want to delete the database <strong>{dbName}</strong>?
        </p>
        <div className="bg-error/10 border border-error/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-error font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            ⚠️ This drops the MariaDB database.
          </p>
          <p className="text-xs text-error/80 mt-1 ml-6">
            This action cannot be undone. All data will be permanently lost.
          </p>
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-error px-8" onClick={onConfirm}>
            Delete Database
          </button>
        </div>
      </div>
    </dialog>
  );
}
