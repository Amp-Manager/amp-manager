import React from "react";
import { Database, Copy, Trash } from "lucide-react";
import { toast } from "@/utils/toast";
import { DatabaseWithTags } from "./types";
import { Tag } from "@/types";
import { COLOR_MAP } from "@/components/layout/uiConstants";

interface DatabaseCardProps {
  key?: string;  // React handles key separately
  db: DatabaseWithTags;
  allTags: Tag[];
  onDelete: (dbName: string) => void;
}

export function DatabaseCard({ db, allTags, onDelete }: DatabaseCardProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(db.name);
    toast.success("Database name copied");
  };

  return (
    <div className="card bg-base-100 border border-base-200 hover:border-primary/50 transition-colors group">
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-sm">{db.name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                <div className="flex items-center gap-1 mr-2">
                  <div className={`h-2 w-2 rounded-full ${db.status === 'active' ? 'bg-success' : 'bg-error animate-pulse'}`}></div>
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-wider">
                    {db.status}
                  </span>
                </div>
                {db.tags?.map(tagId => {
                  const tagDef = allTags.find(t => t.id === tagId);
                  const tagName = tagDef ? tagDef.name : (tagId.startsWith('tag_') ? 'Loading...' : tagId);
                  return (
                    <span key={tagId} className={`badge badge-outline text-[9px] h-4 px-1.5 ${tagDef ? COLOR_MAP[tagDef.color] : 'badge-secondary'}`}>
                      {tagName}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button 
              className="btn btn-ghost btn-xs"
              onClick={handleCopy}
              title="Copy Name"
            >
              <Copy className="h-3 w-3" />
            </button>
            
            <button 
              className="btn btn-ghost btn-xs text-error hover:bg-error/10"
              onClick={() => onDelete(db.name)}
              title="Delete Database"
            >
              <Trash className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
