import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Check, X, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { initDB, logActivity } from '@/lib/db';
import { toast } from '@/utils/toast';
import { ampBridge } from '@/services/AMPBridge';

interface DomainDeleteModalProps {
  domain: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DomainDeleteModal({ domain, isOpen, onClose, onSuccess }: DomainDeleteModalProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [steps, setSteps] = useState<any[]>([
    { name: 'config', label: 'Remove configuration', status: 'pending' },
    { name: 'ssl', label: 'Remove SSL certificates', status: 'pending' },
    { name: 'hosts', label: 'Remove hosts entry', status: 'pending' },
    { name: 'reload', label: 'Reload Angie server', status: 'pending' }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.showModal();
      setSteps(s => s.map(step => ({ ...step, status: 'pending' })));
      setError(null);
      setWarning(null);
    } else if (!isOpen && modalRef.current) {
      modalRef.current.close();
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!domain) return;
    setIsDeleting(true);
    setError(null);
    setWarning(null);

    try {
      if (ampBridge.isAvailable()) {
        const result = await ampBridge.removeDomain(domain.name);
        if (result.status === 'ok') {
          if (result.warning) {
            setWarning(result.warning);
          }
          if (result.steps) {
            setSteps(s => s.map(step => {
              const resultStep = result.steps.find((rs: any) => rs.name === step.name);
              return {
                ...step,
                status: resultStep?.success ? 'success' : 'error'
              };
            }));
          }
        } else if (result.status === 'error') {
          throw new Error(result.message || 'Failed to remove domain from backend');
        }
      }

      const db = await initDB(user || "default");
      const configKeys = await db.getAllKeysFromIndex('site_configs', 'by-site', domain.id);
      const tx = db.transaction(['site_configs', 'sites'], 'readwrite');
      
      const deletePromises = configKeys.map(key => tx.objectStore('site_configs').delete(key));
      deletePromises.push(tx.objectStore('sites').delete(domain.id));
      
      await Promise.all([
        ...deletePromises,
        tx.done
      ]);

      await logActivity(db, 'delete', 'domain', domain.id, domain.name);

      toast.success(`Domain ${domain.name} deleted successfully`);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      toast.error(`Failed to delete domain: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <dialog ref={modalRef} className="modal">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg text-error flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Delete Domain
        </h3>
        <p className="py-4">
          Are you sure you want to delete <span className="font-bold">{domain?.name}</span>?
          <br />
          This will remove the configuration, SSL certificates, and hosts entry.
        </p>

        <div className="space-y-3 my-4">
          {steps.map((step) => (
            <div key={step.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-base-300" />}
                {step.status === 'success' && <Check className="w-4 h-4 text-success" />}
                {step.status === 'error' && <X className="w-4 h-4 text-error" />}
                <span className={step.status === 'pending' ? 'opacity-50' : ''}>{step.label}</span>
              </div>
              {step.status === 'error' && (
                <span className="text-xs text-error">Failed</span>
              )}
            </div>
          ))}
        </div>

        {warning && (
          <div className="alert alert-warning text-xs py-2 mt-4">
            <AlertTriangle className="h-4 w-4" />
            <span>{warning}</span>
          </div>
        )}

        {error && (
          <div className="alert alert-error text-xs py-2 mt-4">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="modal-action">
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            className={`btn btn-error ${isDeleting ? 'btn-disabled' : ''}`}
            onClick={handleDelete}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Delete'}
          </button>
        </div>
      </div>
      {!isDeleting && (
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      )}
    </dialog>
  );
}
