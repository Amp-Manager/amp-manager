import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';
import { CustomNodeData } from '../types';
import { getStatusClasses } from './NodeUtils';

export const SourceNode = ({ data }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  const isRemote = nodeData.sourceType === 'remote';
  
  return (
    <div className={`bg-base-100 border-2 border-indigo-500 rounded-lg p-3 shadow-md min-w-[220px] transition-all ${getStatusClasses(nodeData.status)}`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3" />
      <div className="font-bold text-primary mb-2 flex items-center gap-2 border-b border-base-200 pb-2">
        <Database className="w-4 h-4" /> Source
      </div>
      <div className="text-xs space-y-1">
        <div className="flex justify-between items-center mb-1">
          <span className="opacity-70 uppercase text-[10px] font-bold">{nodeData.sourceType || 'local'}</span>
        </div>
        {isRemote ? (
          <div className="font-mono bg-base-200 p-1 rounded truncate">
            {nodeData.remoteUrl || "Enter URL..."}
          </div>
        ) : (
          <div className="font-mono bg-base-200 p-1 rounded truncate">
            {nodeData.domain || "Select domain..."}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3" />
    </div>
  );
};
