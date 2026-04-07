import { Node, Edge } from '@xyflow/react';
import { Domain } from '@/types';

export interface CustomNodeData extends Record<string, unknown> {
  label?: string;
  domain?: string;
  sites?: Domain[];
  command?: string;
  bridgeType?: string;
  // New fields for pipeline model
  sourceType?: 'local' | 'remote';
  targetType?: 'local' | 'remote';
  actionType?: 'command' | 'git_clone' | 'git_pull' | 'git_push' | 'sftp_sync';
  // Generic fields that map differently based on type
  target?: string;      // Git: Branch, SFTP: Remote Path, Webhook: URL
  host?: string;        // SFTP: Hostname/IP
  method?: string;      // Webhook: GET/POST
  remoteUrl?: string;   // Git: Remote URL
  credentialId?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  onChange?: (data: CustomNodeData) => void;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  nodes: Node[];
  edges: Edge[];
  created_at: number;
  updated_at: number;
}
