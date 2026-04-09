import React from "react";
import { Database, HardDrive, Search } from "lucide-react";
import PageLoader from "@/components/layout/PageLoader";
import { DatabaseWithTags } from "./types";
import { Tag } from "@/types";
import { DatabaseCard } from "./DatabaseCard";

interface DatabaseListProps {
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredDbs: DatabaseWithTags[];
  allTags: Tag[];
  onDelete: (dbName: string) => void;
}

export function DatabaseList({ 
  loading, 
  searchQuery, 
  setSearchQuery, 
  filteredDbs, 
  allTags, 
  onDelete 
}: DatabaseListProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl flex items-center gap-2">
          <HardDrive className="h-5 w-5 opacity-50" />
          Inventory
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
          <input 
            type="text" 
            placeholder="Filter databases..." 
            className="input bg-base-300/70 input-bordered input-sm w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : filteredDbs.length === 0 ? (
        <div className="bg-base-300 rounded-lg p-12 text-center border border-dashed border-base-100">
          <Database className="h-12 w-12 opacity-10 mx-auto mb-4" />
          <p className="opacity-50">No databases found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDbs.map((db) => (
            <DatabaseCard 
              key={db.name} 
              db={db} 
              allTags={allTags} 
              onDelete={onDelete} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
