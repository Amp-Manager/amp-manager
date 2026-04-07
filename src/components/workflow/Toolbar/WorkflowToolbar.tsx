import React from 'react';
import { Plus, Database, Zap, Target, Trash2, Play, Save } from 'lucide-react';
import { COLOR_MAP } from '@/components/layout/uiConstants';

interface WorkflowToolbarProps {
  handleNewWorkflow: () => void;
  currentWorkflowId: string | null;
  handleSelectWorkflow: (id: string) => void;
  savedWorkflows: any[];
  workflowTags: string[];
  allTags: any[];
  addNode: (type: string) => void;
  handleDeleteWorkflow: () => void;
  handleRun: () => void;
  handleSave: () => void;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  handleNewWorkflow,
  currentWorkflowId,
  handleSelectWorkflow,
  savedWorkflows,
  workflowTags,
  allTags,
  addNode,
  handleDeleteWorkflow,
  handleRun,
  handleSave,
}) => {
  return (
    <div className="bg-base-100 border-b border-base-300 rounded-lg flex justify-between items-center p-2">
      <div className="flex gap-2 items-center">
        <button className="btn btn-xs btn-primary" onClick={handleNewWorkflow}>
          <Plus className="w-4 h-4" /> New
        </button>
        
        <select 
          className="select select-bordered rounded-md outline-none focus:ring-primary select-sm max-w-xs"
          value={currentWorkflowId || ""}
          onChange={(e) => handleSelectWorkflow(e.target.value)}
        >
          <option value="" disabled>Select Workflow</option>
          {savedWorkflows.map((w: any) => (
            <option key={w.id} value={w.id}>{w.title}</option>
          ))}
        </select>

        {currentWorkflowId && workflowTags.length > 0 && (
          <div className="flex gap-1 ml-2 overflow-x-auto min-w-[90px] max-w-[200px] no-scrollbar cursor-e-resize">
            {workflowTags.map(tagId => {
              const tag = allTags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <span 
                  key={tagId} 
                  className={`text-[10px] px-1.5 py-0.5 rounded-sm whitespace-nowrap ${COLOR_MAP[tag.color] || 'bg-zinc-700 text-zinc-300'}`}
                >
                  {tag.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="join ml-2">
        <button className="btn btn-sm join-item" onClick={() => addNode('source')}>
          <Database className="w-4 h-4 text-primary" /> Source
        </button>
        <button className="btn btn-sm join-item" onClick={() => addNode('action')}>
          <Zap className="w-4 h-4 text-warning" /> Task
        </button>
        <button className="btn btn-sm join-item" onClick={() => addNode('bridge')}>
          <Target className="w-4 h-4 text-success" /> Target
        </button>
      </div>
      
      <div className="flex items-center gap-2">
        {currentWorkflowId && (
          <button className="btn btn-xs btn-soft btn-error" onClick={handleDeleteWorkflow}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button className="btn btn-xs btn-soft btn-success" onClick={handleRun}>
          <Play className="w-4 h-4 text-success" />
        </button>
        <button className="btn btn-xs btn-neutral" onClick={handleSave}>
          <Save className="w-4 h-4" /> Save
        </button>
      </div>
    </div>
  );
};
