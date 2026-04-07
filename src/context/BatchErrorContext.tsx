import React, { createContext, useContext, useState, ReactNode } from "react";
import { BatchError } from "@/types/batchError";
import { BatchErrorDialog } from "@/components/BatchErrorDialog";
import { parseBatchError } from "@/lib/utils";

interface BatchErrorContextType {
  handleError: (error: unknown) => void;
}

const BatchErrorContext = createContext<BatchErrorContextType | undefined>(undefined);

export function BatchErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<BatchError | null>(null);

  const handleError = (err: unknown) => {
    const parsed = parseBatchError(err);
    if (parsed) {
      setError(parsed);
    }
    // Unhandled errors not parsed are silently ignored
  };

  return (
    <BatchErrorContext.Provider value={{ handleError }}>
      {children}
      <BatchErrorDialog 
        isOpen={!!error} 
        onOpenChange={(open) => !open && setError(null)} 
        error={error} 
      />
    </BatchErrorContext.Provider>
  );
}

export function useBatchError() {
  const context = useContext(BatchErrorContext);
  if (context === undefined) {
    throw new Error("useBatchError must be used within a BatchErrorProvider");
  }
  return context;
}
