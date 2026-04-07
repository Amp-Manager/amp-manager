import { useState, useCallback, useRef } from 'react';
import { ampBridge } from '@/services/AMPBridge';
import { configGuardService } from '@/services/ConfigGuardService';
import { initDB } from '@/lib/db';
import type { SyncStep, DomainStatus } from '@/types/entities';

interface UseProjectSyncReturn {
  steps: SyncStep[];
  currentStepIndex: number;
  isRunning: boolean;
  error: string | null;
  performSync: (user: string) => Promise<boolean>;
}

export function useProjectSync(): UseProjectSyncReturn {
  const [steps, setSteps] = useState<SyncStep[]>([
    { id: 'config', label: 'Verifying configuration integrity', status: 'pending' },
    { id: 'env', label: 'Resolving environment', status: 'pending' },
    { id: 'ca', label: 'Validating CA certificate', status: 'pending' },
    { id: 'scan', label: 'Scanning domains', status: 'pending' },
    { id: 'sync', label: 'Synchronizing database', status: 'pending' },
  ]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentStepIdRef = useRef<string>('config');

  const updateStep = useCallback((stepId: string, updates: Partial<SyncStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  }, []);

  const setStepStatus = useCallback((stepId: string, status: SyncStep['status']) => {
    updateStep(stepId, { status });
  }, [updateStep]);

  const performSync = useCallback(async (user: string): Promise<boolean> => {
    setIsRunning(true);
    setError(null);

    const initialSteps: SyncStep[] = [
      { id: 'config', label: 'Verifying configuration integrity', status: 'pending' },
      { id: 'env', label: 'Resolving environment', status: 'pending' },
      { id: 'ca', label: 'Validating CA certificate', status: 'pending' },
      { id: 'scan', label: 'Scanning domains', status: 'pending' },
      { id: 'sync', label: 'Synchronizing database', status: 'pending' },
    ];
    setSteps(initialSteps);
    setCurrentStepIndex(0);
    currentStepIdRef.current = 'config';

    try {
      const db = await initDB(user);

      // Configuration Integrity Check
      currentStepIdRef.current = 'config';
      setCurrentStepIndex(0);
      setStepStatus('config', 'current');

      // Quick envCheck to get project_root for factory capture
      const quickEnvResult = await ampBridge.envCheck();
      const projectRoot = quickEnvResult?.project_root;

      if (!projectRoot || projectRoot === 'error') {
        setStepStatus('config', 'error');
        setError(quickEnvResult?.message || 'Project root not found');
        setIsRunning(false);
        return false;
      }

      // Capture factory settings (backup essential config files)
      await configGuardService.captureFactorySettings(db);
      setStepStatus('config', 'done');

      // Environment Check validation
      currentStepIdRef.current = 'env';
      setCurrentStepIndex(1);
      setStepStatus('env', 'current');

      const envResult = quickEnvResult; // Reuse

      setStepStatus('env', 'done');

      // CA Status
      currentStepIdRef.current = 'ca';
      setCurrentStepIndex(2);
      setStepStatus('ca', 'current');
      try {
        await ampBridge.caStatus();
      } catch {
        // CA errors are warnings
      }
      setStepStatus('ca', 'done');

      // Scan Domains (using backend tasks)
      currentStepIdRef.current = 'scan';
      setCurrentStepIndex(3);
      setStepStatus('scan', 'current');
      
      // Get domains from AMP Manager (config + SSL)
      const domainsResult = await ampBridge.listDomains();
      const ampDomains = domainsResult?.domains || [];
      
      // Get domains from Windows HOSTS
      const hostsResult = await ampBridge.scanDomains();
      const hostEntries = hostsResult?.domains || [];
      const hostsSet = new Set<string>(
        hostEntries.map((d: any) => typeof d === 'string' ? d : d.name || d.domain)
      );
      
      // Verify www folders for each domain via filesystem
      const wwwPath = `${projectRoot}\\www\\`;
      let wwwFolders: { name: string }[] = [];
      try {
        wwwFolders = await ampBridge.fs.readDirectory(wwwPath);
      } catch {
        // Directory might not exist
      }
      const wwwSet = new Set(
        wwwFolders
          .filter(f => f.name && !f.name.includes('.'))
          .map(f => f.name)
      );
      
      setStepStatus('scan', 'done');

      // Get existing sites for preserving created_at timestamps
      const existingSites = await db.getAll('sites');
      const sitesMap = new Map(existingSites.map(s => [s.id, s]));

      // Build domain statuses from backend response (ssl_valid now comes from backend)
      const domainStatuses: DomainStatus[] = ampDomains.map((d: { domain: string; config: boolean; ssl: boolean; ssl_valid: boolean }) => {
        const hostsValid = hostsSet.has(d.domain);
        const wwwValid = wwwSet.has(d.domain);
        const sslValid = d.ssl === true;
        const caMatch = sslValid && d.ssl_valid === true;
        const isValid = d.config !== false && sslValid && wwwValid && hostsValid && caMatch;
        
        return {
          domain: d.domain,
          configValid: d.config !== false,
          hostsValid,
          sslValid,
          wwwValid,
          caMatch,
          status: isValid ? 'valid' as const : 'warning' as const,
          lastChecked: Date.now(),
        };
      });

      // Sync to IndexedDB
      currentStepIdRef.current = 'sync';
      setCurrentStepIndex(4);
      setStepStatus('sync', 'current');

      const existingStatuses = await db.getAll('domain_status');
      const newDomains = new Set(domainStatuses.map(s => s.domain));

      // Update domain statuses
      for (const status of domainStatuses) {
        await db.put('domain_status', status);
      }

      // Update sites
      for (const status of domainStatuses) {
        const existingSite = sitesMap.get(status.domain);
        await db.put('sites', {
          id: status.domain,
          domain: status.domain,
          path: `${projectRoot}\\www\\${status.domain}`,
          tags: existingSite?.tags || [],
          is_encrypted: false,
          created_at: existingSite?.created_at || Date.now(),
          updated_at: Date.now(),
        });
      }

      // Remove orphaned entries
      for (const existing of existingStatuses) {
        if (!newDomains.has(existing.domain)) {
          await db.delete('domain_status', existing.domain);
        }
      }
      const existingSitesForDelete = await db.getAll('sites');
      for (const existing of existingSitesForDelete) {
        if (!newDomains.has(existing.id)) {
          await db.delete('sites', existing.id);
        }
      }

      // Update last sync timestamp
      await db.put('settings', { key: 'lastSyncTimestamp', value: Date.now() });

      setStepStatus('sync', 'done');
      setIsRunning(false);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStepStatus(currentStepIdRef.current, 'error');
      updateStep(currentStepIdRef.current, { error: errorMessage });
      setIsRunning(false);
      return false;
    }
  }, [updateStep, setStepStatus]);

  return {
    steps,
    currentStepIndex,
    isRunning,
    error,
    performSync,
  };
}
