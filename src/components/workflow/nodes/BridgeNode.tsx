import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Target } from 'lucide-react';
import { CustomNodeData } from '../types';
import { getStatusClasses } from './NodeUtils';

export const BridgeNode = ({ data }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  const isLocal = nodeData.targetType === 'local';
  
  const renderDetails = () => {
    if (isLocal) {
      return (
        <div><span className="opacity-70">Domain:</span> {nodeData.domain || "Select..."}</div>
      );
    }

    switch (nodeData.bridgeType) {
      case 'sftp':
        return (
          <>
            <div className="truncate"><span className="opacity-70">Host:</span> {nodeData.host || "Pending"}</div>
            <div className="truncate"><span className="opacity-70">Path:</span> {nodeData.target || "/"}</div>
          </>
        );
      case 'webhook':
        return (
          <>
            <div><span className="opacity-70">Method:</span> {nodeData.method || "POST"}</div>
            <div className="truncate"><span className="opacity-70">URL:</span> {nodeData.target || "Pending"}</div>
          </>
        );
      default: // git
        return (
          <>
            <div className="truncate"><span className="opacity-70">Remote:</span> {nodeData.remoteUrl || "origin"}</div>
            <div><span className="opacity-70">Branch:</span> {nodeData.target || "main"}</div>
          </>
        );
    }
  };

  return (
    <div className={`bg-base-100 border-2 border-success rounded-lg p-3 shadow-md min-w-[220px] transition-all ${getStatusClasses(nodeData.status)}`}>
      <Handle type="target" position={Position.Top} className="!bg-success !w-3 !h-3" />
      <div className="font-bold text-success mb-2 flex items-center gap-2 border-b border-base-200 pb-2">
        <Target className="w-4 h-4" /> Target Destination
      </div>
      <div className="space-y-1 text-xs">
        <div className="font-bold uppercase text-[10px] opacity-70 mb-1">
          {isLocal ? 'LOCAL DOMAIN' : (nodeData.bridgeType?.toUpperCase() || "GIT")}
        </div>
        {renderDetails()}
      </div>
    </div>
  );
};
