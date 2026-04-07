import React from 'react';
import { LayoutGrid } from 'lucide-react';

export function DomainEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-base-300/80 border rounded-lg border-dashed border-base-300">
      <div className="rounded-full bg-base-300 p-4">
        <LayoutGrid className="h-8 w-8 opacity-50" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No domains found</h3>
      <p className="mb-4 text-sm opacity-70">
        You haven't created any domains yet.
      </p>
    </div>
  );
}
