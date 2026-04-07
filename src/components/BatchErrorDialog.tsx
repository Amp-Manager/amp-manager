import { useEffect, useRef } from "react"
import { AlertTriangle, Terminal } from "lucide-react"
import { BatchError } from "@/types/batchError"

interface BatchErrorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  error: BatchError | null;
}

export function BatchErrorDialog({ isOpen, onOpenChange, error }: BatchErrorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  if (!error) return null;

  return (
    <dialog ref={dialogRef} className="modal" onClose={() => onOpenChange(false)}>
      <div className="modal-box sm:max-w-[600px]">
        <h3 className="font-bold text-lg flex items-center gap-2 text-error">
          <AlertTriangle className="h-5 w-5" />
          Batch Operation Failed
        </h3>
        <p className="py-4 opacity-70">
          An error occurred while executing the command.
        </p>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Error Message</h4>
            <div className="text-sm opacity-70 bg-base-200 p-3 rounded-md">
              {error.message}
            </div>
          </div>
          
          {error.commands && (
            <div className="space-y-2">
              <h4 className="font-medium leading-none flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Command Output
              </h4>
              <div className="h-[200px] w-full rounded-md border border-base-300 bg-base-300 p-4 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {error.commands}
                </pre>
              </div>
            </div>
          )}
        </div>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn" onClick={() => onOpenChange(false)}>Close</button>
          </form>
        </div>
      </div>
    </dialog>
  )
}
