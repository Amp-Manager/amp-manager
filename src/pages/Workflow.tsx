import React, { useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAuth } from '@/context/AuthContext';
import { useWorkflow } from '@/components/workflow/hooks/useWorkflow';
import { SourceNode } from '@/components/workflow/nodes/SourceNode';
import { ActionNode } from '@/components/workflow/nodes/ActionNode';
import { BridgeNode } from '@/components/workflow/nodes/BridgeNode';
import { WorkflowInspector } from '@/components/workflow/Inspector/WorkflowInspector';
import { WorkflowToolbar } from '@/components/workflow/Toolbar/WorkflowToolbar';
import { SaveWorkflowModal } from '@/components/workflow/Modals/SaveWorkflowModal';
import { DeleteWorkflowModal } from '@/components/workflow/Modals/DeleteWorkflowModal';

export default function WorkflowEditor() {
  const { user, encryptionKey } = useAuth();
  const {
    nodes,
    edges,
    sites,
    credentials,
    savedWorkflows,
    currentWorkflowId,
    selectedNode,
    setSelectedNode,
    isInspectorOpen,
    setIsInspectorOpen,
    allTags,
    setAllTags,
    workflowTitle,
    setWorkflowTitle,
    workflowDesc,
    setWorkflowDesc,
    workflowTags,
    setWorkflowTags,
    updateNodeData,
    handleNewWorkflow,
    handleSelectWorkflow,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    handleRun,
    confirmSave,
    confirmDelete,
  } = useWorkflow(user, encryptionKey);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const nodeTypes = useMemo(() => ({ 
    source: SourceNode,
    action: ActionNode,
    bridge: BridgeNode
  }), []);

  const onNodeClick = (_: React.MouseEvent, node: any) => {
    setSelectedNode(node);
    setIsInspectorOpen(true);
  };

  const onPaneClick = () => {
    setIsInspectorOpen(false);
    setSelectedNode(null);
  };

  // Sync selected Node with nodes array to prevent stale data in inspector
  useEffect(() => {
    if (selectedNode) {
      const updated = nodes.find(n => n.id === selectedNode.id);
      if (updated) setSelectedNode(updated);
    }
  }, [nodes]);

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] gap-4">

      {/* Toolbar */}
      <WorkflowToolbar 
        handleNewWorkflow={handleNewWorkflow}
        currentWorkflowId={currentWorkflowId}
        handleSelectWorkflow={handleSelectWorkflow}
        savedWorkflows={savedWorkflows}
        workflowTags={workflowTags}
        allTags={allTags}
        addNode={addNode}
        handleDeleteWorkflow={() => setIsDeleteModalOpen(true)}
        handleRun={handleRun}
        handleSave={() => setIsSaveModalOpen(true)}
      />

      <div className="flex-1 flex gap-4 min-h-0">
        {/* React Flow Canvas */}
        <div className="flex-1 bg-base-200 rounded-xl border border-base-300 overflow-hidden relative shadow-inner">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            colorMode="dark"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {/* Inspector Panel */}
        {isInspectorOpen && (
          <div className="w-80 bg-base-100 border border-base-300 rounded-xl p-4 shadow overflow-hidden">
            <WorkflowInspector 
              selectedNode={selectedNode}
              setIsInspectorOpen={setIsInspectorOpen}
              updateNodeData={updateNodeData}
              sites={sites}
              credentials={credentials}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <SaveWorkflowModal 
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        workflowTitle={workflowTitle}
        setWorkflowTitle={setWorkflowTitle}
        workflowDesc={workflowDesc}
        setWorkflowDesc={setWorkflowDesc}
        workflowTags={workflowTags}
        setWorkflowTags={setWorkflowTags}
        savedWorkflows={savedWorkflows}
        onSave={async () => {
          await confirmSave();
          setIsSaveModalOpen(false);
        }}
        user={user}
        setAllTags={setAllTags}
      />

      <DeleteWorkflowModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          await confirmDelete();
          setIsDeleteModalOpen(false);
        }}
      />
    </div>
  );
}
