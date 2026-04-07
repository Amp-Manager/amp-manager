import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { CustomNodeData } from '../types';
import { getStatusClasses } from './NodeUtils';

export const ActionNode = ({ data }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  return (
    <div className={`bg-base-100 border-2 border-warning rounded-lg p-3 shadow-md min-w-[220px] transition-all ${getStatusClasses(nodeData.status)}`}>
      <Handle type="target" position={Position.Top} className="!bg-warning !w-3 !h-3" />
      <div className="font-bold text-warning mb-2 flex items-center gap-2 border-b border-base-200 pb-2">
        <Zap className="w-4 h-4" /> Action Task
      </div>
      <div className="text-xs space-y-1">
        <div className="font-bold uppercase text-[10px] opacity-70 mb-1">
          {nodeData.actionType?.replace('_', ' ') || 'COMMAND'}
        </div>
        <div className="font-mono bg-base-200 p-1 rounded truncate">
          {nodeData.actionType === 'command' ? (nodeData.command || "No command set") : (nodeData.target || "Default")}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-warning !w-3 !h-3" />
    </div>
  );
};
