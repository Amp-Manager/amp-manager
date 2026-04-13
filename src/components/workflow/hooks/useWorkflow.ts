import { useState, useCallback, useEffect } from 'react';
import { Node, Edge, applyNodeChanges, applyEdgeChanges, addEdge, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/utils/toast';
import { 
  loadCredentialsJSON,
  loadWorkflowsJSON,
  saveWorkflowsJSON,
  loadTagsJSON,
  loadNotesJSON,
  saveNotesJSON,
  logActivityJSON
} from '@/lib/db';
import { decryptWithKey } from '@/lib/crypto';
import { CustomNodeData, Workflow } from '../types';
import { ampBridge } from '@/services/AMPBridge';
import type { Domain, Credential, Tag } from '@/types';

export function useWorkflow(user: string | null, encryptionKey?: CryptoKey | null) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [sites, setSites] = useState<Domain[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<Workflow[]>([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  
  const [workflowTitle, setWorkflowTitle] = useState("");
  const [workflowDesc, setWorkflowDesc] = useState("");
  const [workflowTags, setWorkflowTags] = useState<string[]>([]);

  const updateNodeData = useCallback((nodeId: string, newData: CustomNodeData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  }, []);

  const handleNewWorkflow = useCallback((initialSites = sites) => {
    const id = '1';
    const newNodes = [
      {
        id,
        type: 'source',
        position: { x: 250, y: 50 },
        data: { 
          label: 'Source', 
          sourceType: 'local',
          sites: initialSites,
        },
      },
    ];
    setNodes(newNodes);
    setEdges([]);
    setWorkflowTitle("");
    setWorkflowDesc("");
    setWorkflowTags([]);
    setCurrentWorkflowId(null);
    setSelectedNode(null);
    setIsInspectorOpen(false);
  }, [sites]);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    let loadedSites: any[] = [];
    try {
      if (ampBridge.isAvailable()) {
        const res = await ampBridge.listDomains();
        if (res && res.status === 'ok' && Array.isArray(res.domains)) {
          loadedSites = res.domains.map((d: any) => ({
            id: d.domain || d.name,
            name: d.domain || d.name,
            path: d.path
          }));
        }
      }
    } catch (err) {
      // Silently fail - workflow will have empty sites list
    }
    setSites(loadedSites);

    const loadedCreds = await loadCredentialsJSON(user, encryptionKey || undefined);
    setCredentials(loadedCreds);

    const workflows = await loadWorkflowsJSON();
    setSavedWorkflows(workflows);

    const tags = await loadTagsJSON();
    setAllTags(tags);

    if (workflows.length > 0) {
      const lastWorkflow = workflows[workflows.length - 1];
      setWorkflowTitle(lastWorkflow.title);
      setWorkflowDesc(lastWorkflow.description);
      setWorkflowTags(lastWorkflow.tags || []);
      setCurrentWorkflowId(lastWorkflow.id);
      
      const restoredNodes = lastWorkflow.nodes.map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          sites: loadedSites,
        }
      }));
      setNodes(restoredNodes);
      setEdges(lastWorkflow.edges);
    } else {
      const newNodes = [{
        id: '1',
        type: 'source' as const,
        position: { x: 250, y: 50 },
        data: { label: 'Source', sourceType: 'local', sites: loadedSites },
      }];
      setNodes(newNodes);
      setEdges([]);
      setWorkflowTitle("");
      setWorkflowDesc("");
      setWorkflowTags([]);
      setCurrentWorkflowId(null);
      setSelectedNode(null);
      setIsInspectorOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleSelectWorkflow = useCallback((workflowId: string) => {
    const workflow = savedWorkflows.find(w => w.id === workflowId);
    if (!workflow) return;

    setWorkflowTitle(workflow.title);
    setWorkflowDesc(workflow.description);
    setWorkflowTags(workflow.tags || []);
    setCurrentWorkflowId(workflow.id);
    
    const restoredNodes = workflow.nodes.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        sites: sites,
      }
    }));
    setNodes(restoredNodes);
    setEdges(workflow.edges);
    setSelectedNode(null);
    setIsInspectorOpen(false);
  }, [savedWorkflows, sites]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  const addNode = useCallback((type: string) => {
    const id = (nodes.length + 1).toString();
    const newNode: Node = {
      id,
      type,
      position: { x: 250, y: nodes.length * 100 + 50 },
      data: { 
        label: `New ${type}`,
        sites: sites,
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNode(newNode);
    setIsInspectorOpen(true);
  }, [nodes.length, sites]);

  const handleRun = async () => {
    if (!ampBridge.isAvailable()) {
      toast.error("Workflow refused Ã¢ÂÂ AMP Bridge not available.");
      return;
    }
    
    const startNode = nodes.find(n => n.type === 'source');
    if (!startNode) {
      toast.error("Workflow refused Ã¢ÂÂ No Source Node found.");
      return;
    }

    const sourceData = startNode.data as CustomNodeData;
    const isSourceRemote = sourceData.sourceType === 'remote';
    const isSourceLocal = !isSourceRemote;
    const sourceDomain = sourceData.domain;
    const sourceRemoteUrl = sourceData.remoteUrl;

    if (isSourceLocal && !sourceDomain) {
      toast.error("Workflow refused Ã¢ÂÂ Local Source missing domain.");
      return;
    }
    if (isSourceRemote && !sourceRemoteUrl) {
      toast.error("Workflow refused Ã¢ÂÂ Remote Source missing URL.");
      return;
    }
    
    let workingDomain = sourceDomain || "";
    
    const targetNode = nodes.find(n => n.type === 'bridge');
    if (targetNode) {
      const targetData = targetNode.data as CustomNodeData;
      if (targetData.domain) {
        workingDomain = targetData.domain;
      }
    }

    if (!workingDomain && isSourceLocal) workingDomain = sourceDomain!;
    
    if (!workingDomain) {
      const actionNodes = nodes.filter(n => n.type === 'action');
      const firstActionWithDomain = actionNodes.find(n => (n.data as CustomNodeData).domain);
      if (!firstActionWithDomain) {
        toast.error("Workflow refused Ã¢ÂÂ No local domain context found in Source, Target, or Actions.");
        return;
      }
      workingDomain = (firstActionWithDomain.data as CustomNodeData).domain as string;
    }

    toast.info(`Starting pipeline${workingDomain ? ` for ${workingDomain}` : ''}...`);

    setNodes((nds) => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));

    let executionLog: string[] = [];
    let isSuccess = true;
    let failedStep = "";
    
    executionLog.push(`1. **Source:** ${isSourceLocal ? `Local domain \`${sourceDomain}\`` : `Remote URL \`${sourceRemoteUrl}\``}`);

    let currentNode = startNode;
    let stepCount = 2;

    try {
      while (currentNode) {
        const edge = edges.find(e => e.source === currentNode.id);
        if (!edge) break;

        const nextNode = nodes.find(n => n.id === edge.target);
        if (!nextNode) break;

        setNodes((nds) => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, status: 'running' } } : n));

        if (nextNode.type === 'action') {
          const actionType = (nextNode.data.actionType as string) || 'command';
          const cmd = nextNode.data.command as string;
          const target = nextNode.data.target as string; 
          const actionDomain = (nextNode.data.domain as string) || workingDomain;

          if (!actionDomain) {
            throw new Error("No local domain context found for this action.");
          }
          
          try {
            let response;
            
            if (actionType === 'command') {
              if (!cmd) throw new Error("Missing command");
              if (cmd.startsWith("npm ")) {
                response = await ampBridge.workflow.npm(actionDomain, cmd.replace("npm ", ""));
              } else if (cmd.startsWith("node ")) {
                response = await ampBridge.workflow.node(actionDomain, cmd.replace("node ", ""));
              } else {
                response = await ampBridge.workflow.shell(actionDomain, cmd);
              }
            } else if (actionType === 'git_clone') {
              const url = sourceRemoteUrl || (nodes.find(n => n.type === 'source')?.data as CustomNodeData).remoteUrl;
              const branch = nextNode.data.target as string;
              const branchArg = branch ? `-b ${branch} ` : '';
              response = await ampBridge.workflow.git(actionDomain, `clone ${branchArg}${url} .`);
            } else if (actionType === 'git_pull') {
              response = await ampBridge.workflow.git(actionDomain, `pull origin ${target || 'main'}`);
            } else if (actionType === 'git_push') {
              response = await ampBridge.workflow.git(actionDomain, `push origin ${target || 'main'}`);
            } else if (actionType === 'sftp_sync') {
              // Get SFTP credentials from node
              const sftpCredentialId = nextNode.data.credentialId as string;
              const sftpHost = nextNode.data.host as string || actionDomain;
              const sftpUsername = nextNode.data.username as string;
              
              if (!sftpCredentialId) {
                throw new Error("SFTP requires a credential. Please select an SSH credential in the node settings.");
              }
              if (!sftpHost) {
                throw new Error("SFTP requires a host. Please set the host in the node settings.");
              }
              
              const sftpCred = credentials.find(c => c.id === sftpCredentialId);
              if (!sftpCred) {
                throw new Error("Selected credential not found.");
              }
              
              const username = sftpCred.username || sftpUsername || 'root';
              toast.info(`Connecting to ${sftpHost}...`);
              
              // Route by credential type: AMP key (default) vs custom key (advanced)
              if (sftpCred.id === 'ssh_amp_manager') {
                // DEFAULT: Use AMP Manager's SSH key directly - no temp file, no decryption
                response = await ampBridge.workflow.sftpWithAmpKey(sftpHost, username, actionDomain, target || "/");
              } else {
                // ADVANCED: Custom SSH key - decrypt and use temp file with icacls
                if (!encryptionKey) {
                  throw new Error("Encryption key not available. Please login again.");
                }
                const keyContent = await decryptWithKey(sftpCred.iv, sftpCred.secret, encryptionKey);
                response = await ampBridge.workflow.sftpWithCustomKey(sftpHost, username, actionDomain, target || "/", keyContent);
              }
            }
            
            if (response && response.status === "ok") {
              executionLog.push(`${stepCount}. **Action:** ${actionType.toUpperCase()} (Success)`);
              toast.success(`Step ${stepCount}: ${response.message || 'Action completed'}`);
              setNodes((nds) => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, status: 'success' } } : n));
            } else {
              const errorMsg = response?.details ? `${response.message}: ${response.details}` : (response?.message || "Action failed");
              throw new Error(errorMsg);
            }
          } catch (err: any) {
            isSuccess = false;
            failedStep = `Step ${stepCount}`;
            executionLog.push(`${stepCount}. **Action:** ${actionType.toUpperCase()} (Failed: ${err.message || String(err)})`);
            toast.error(`Workflow error Ã¢ÂÂ ${err.message || String(err)}`);
            setNodes((nds) => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, status: 'error' } } : n));
            break;
          }
        } else if (nextNode.type === 'bridge') {
          const targetData = nextNode.data as CustomNodeData;
          const isTargetLocal = targetData.targetType === 'local';
          const bridgeType = targetData.bridgeType || 'git';
          const target = targetData.target as string;
          
          try {
            let response;
            
            if (isTargetLocal) {
              executionLog.push(`${stepCount}. **Target:** Local Sync to \`${targetData.domain}\` (Success)`);
              setNodes((nds) => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, status: 'success' } } : n));
            } else {
              if (bridgeType === 'git') {
                response = await ampBridge.workflow.git(workingDomain, target || "push");
              } else if (bridgeType === 'sftp') {
                // Get SFTP credentials from bridge node
                const sftpCredId = targetData.credentialId as string;
                const sftpHost = targetData.host as string;
                
                if (!sftpCredId) {
                  throw new Error("SFTP bridge requires a credential. Please select an SSH credential.");
                }
                if (!sftpHost) {
                  throw new Error("SFTP bridge requires a host. Please set the host in node settings.");
                }
                
                const sftpCred = credentials.find(c => c.id === sftpCredId);
                if (!sftpCred) {
                  throw new Error("Selected credential not found.");
                }
                
                const username = sftpCred.username || 'root';
                toast.info(`Connecting to ${sftpHost}...`);
                
                // Route by credential type: AMP key (default) vs custom key (advanced)
                if (sftpCred.id === 'ssh_amp_manager') {
                  // DEFAULT: Use AMP Manager's SSH key directly
                  response = await ampBridge.workflow.sftpWithAmpKey(sftpHost, username, workingDomain, target || "/");
                } else {
                  // ADVANCED: Custom SSH key - decrypt and use temp file
                  if (!encryptionKey) {
                    throw new Error("Encryption key not available.");
                  }
                  const keyContent = await decryptWithKey(sftpCred.iv, sftpCred.secret, encryptionKey);
                  response = await ampBridge.workflow.sftpWithCustomKey(sftpHost, username, workingDomain, target || "/", keyContent);
                }
              } else if (bridgeType === 'webhook') {
                response = await ampBridge.workflow.webhook(target || "", JSON.stringify({ domain: workingDomain }));
              }
              
            if (response && response.status === "ok") {
                executionLog.push(`${stepCount}. **Target:** ${bridgeType.toUpperCase()} to \`${target || 'default'}\` (Success)`);
                toast.success(`Step ${stepCount}: ${response.message || 'Target completed'}`);
                setNodes((nds) => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, status: 'success' } } : n));
              } else if (response) {
                const errorMsg = response.details ? `${response.message}: ${response.details}` : response.message;
                throw new Error(errorMsg);
              }
            }
          } catch (err: any) {
            isSuccess = false;
            failedStep = `Step ${stepCount}`;
            executionLog.push(`${stepCount}. **Target:** ${isTargetLocal ? 'LOCAL' : bridgeType.toUpperCase()} (Error: ${err.message || String(err)})`);
            toast.error(`Workflow error Ã¢ÂÂ ${err.message || String(err)}`);
            setNodes((nds) => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, status: 'error' } } : n));
            break;
          }
        }

        currentNode = nextNode;
        stepCount++;
      }
    } finally {
      if (user) {
        const dateStr = new Date().toLocaleString();
        const statusStr = isSuccess ? "Ã¢ÂÂ Success" : `Ã¢ÂÂ Failed at ${failedStep}`;
        
        const markdownContent = `**Workflow:** ${workflowTitle || "Untitled Workflow"}\n**Date:** ${dateStr}\n**Status:** ${statusStr}\n\n### Execution Log:\n${executionLog.join('\n')}\n`;

        const newNote = {
          id: uuidv4(),
          title: isSuccess ? `Ã°ÂÂÂ Pipeline Success: ${workingDomain}` : `Ã¢ÂÂ Pipeline Failed: ${workingDomain}`,
          content: markdownContent,
          tags: isSuccess ? ['deploy'] : ['fail', 'deploy'],
          site_id: workingDomain,
          is_encrypted: false,
          created_at: Date.now(),
          updated_at: Date.now()
        };

        const allNotes = await loadNotesJSON(user, encryptionKey || undefined);
        allNotes.push(newNote);
        await saveNotesJSON(user, allNotes, encryptionKey || undefined);
        toast.success("Pipeline log saved to Notes");
      }

      if (isSuccess) {
        toast.success("Ã°ÂÂÂ Pipeline Execution Finished.");
      }
    }
  };

  const confirmSave = useCallback(async () => {
    if (!user) return;
    
    const cleanNodes = nodes.map(node => {
      const { sites, onChange, ...cleanData } = node.data as CustomNodeData;
      return {
        ...node,
        data: cleanData
      };
    });

    const workflow = {
      id: currentWorkflowId || uuidv4(),
      title: workflowTitle || "Untitled Workflow",
      description: workflowDesc || "",
      tags: workflowTags,
      nodes: cleanNodes,
      edges,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    const allWorkflows = await loadWorkflowsJSON();
    const existingIndex = allWorkflows.findIndex(w => w.id === workflow.id);
    if (existingIndex >= 0) {
      allWorkflows[existingIndex] = workflow;
    } else {
      allWorkflows.push(workflow);
    }
    await saveWorkflowsJSON(allWorkflows);
    
    await logActivityJSON(user, currentWorkflowId ? 'update' : 'create', 'workflow', workflow.id, workflow.title);
    toast.success("Workflow saved successfully");
    
    const updatedWorkflows = await loadWorkflowsJSON();
    setSavedWorkflows(updatedWorkflows);
    setCurrentWorkflowId(workflow.id);
  }, [user, nodes, currentWorkflowId, workflowTitle, workflowDesc, workflowTags, edges]);

  const confirmDelete = useCallback(async () => {
    if (!user || !currentWorkflowId) return;
    
    const workflowToDelete = savedWorkflows.find(w => w.id === currentWorkflowId);

    const allWorkflows = await loadWorkflowsJSON();
    const filtered = allWorkflows.filter(w => w.id !== currentWorkflowId);
    await saveWorkflowsJSON(filtered);
    
    if (workflowToDelete) {
      await logActivityJSON(user, 'delete', 'workflow', currentWorkflowId, workflowToDelete.title);
    }
    
    toast.success("Workflow deleted successfully");
    
    const updatedWorkflows = await loadWorkflowsJSON();
    setSavedWorkflows(updatedWorkflows);
    
    handleNewWorkflow(sites);
  }, [user, currentWorkflowId, savedWorkflows, handleNewWorkflow, sites]);

  return {
    nodes, setNodes,
    edges, setEdges,
    sites,
    credentials,
    savedWorkflows,
    currentWorkflowId,
    selectedNode, setSelectedNode,
    isInspectorOpen, setIsInspectorOpen,
    allTags, setAllTags,
    workflowTitle, setWorkflowTitle,
    workflowDesc, setWorkflowDesc,
    workflowTags, setWorkflowTags,
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
    loadData
  };
}
