import { useState, useEffect, useCallback } from 'react';
import { useDashboardSettings } from '@/stores/dashboardSettings';
import { useBatchError } from '@/context/BatchErrorContext';
import { useSync } from '@/context/SyncContext';
import { configGuardService } from '@/services/ConfigGuardService';
import { databaseService } from '@/services/DatabaseService';
import { EnvStatus, DashboardCounts, WorkflowStatsData } from '../types';
import { TimelineRow, TimelineEvent } from '../Timeline';
import { ampBridge } from '@/services/AMPBridge';
import { toast } from '@/utils/toast';
import type { Workflow } from '@/components/workflow/types';
import { 
  loadNotesJSON, loadSitesJSON, loadActivityLogsJSON, 
  loadWorkflowsJSON, loadCredentialsJSON, loadDomainStatusJSON,
  loadTagsJSON
} from '@/lib/db';

export function useDashboard(user: string | null) {
  const { isSynced } = useSync();
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStatsData>({ saved: 0, success: 0, failure: 0 });
  const [recentWorkflows, setRecentWorkflows] = useState<Workflow[]>([]);
  const [last7Days, setLast7Days] = useState<any[]>([]);
  const [dashboardCounts, setDashboardCounts] = useState<DashboardCounts>({ 
    domains: 0, 
    domainsValid: 0,
    domainsWarning: 0,
    notes: 0, 
    encryptedNotes: 0, 
    credentials: 0, 
    workflows: 0, 
    activeWorkflows: 0,
    databases: 0,
    certificates: 0,
    certificatesValid: 0,
    certificatesWarning: 0
  });
  const [timelineEvents, setTimelineEvents] = useState<TimelineRow[]>([]);
  const [tagStats, setTagStats] = useState<Array<{id: string, name: string, color: string, created_at: number, count: number}>>([]);
  const { handleError } = useBatchError();
  
  const { live, interval, setLive, setInterval: setRefreshInterval } = useDashboardSettings();
  const [nextRefresh, setNextRefresh] = useState<number>(0);
  const [progress, setProgress] = useState(100);

  const fetchEnv = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!ampBridge.isAvailable()) {
        setEnv({
          status: "error",
          docker_compose: "fail",
          angie_conf: "fail",
          db_init: "fail",
          php_ini: "fail",
          data_folder: "fail",
          www_folder: "fail",
          cert_file: "fail",
          mkcert: "fail",
          caroot_ok: false,
          docker_running: false
        });
        setDashboardCounts({ domains: 0, domainsValid: 0, domainsWarning: 0, notes: 0, encryptedNotes: 0, credentials: 0, workflows: 0, activeWorkflows: 0, databases: 0, certificates: 0, certificatesValid: 0, certificatesWarning: 0 });
        setWorkflowStats({ saved: 0, success: 0, failure: 0 });
        return;
      }

      const [data, caRes] = await Promise.all([
        ampBridge.envCheck(),
        ampBridge.listDomains(),
        ampBridge.caStatus()
      ]);
      
      const envData = data as EnvStatus;
      if (caRes.status === 'ok') {
        envData.caroot_ok = caRes.caroot_ok;
      }
      setEnv(envData);

      // Safeguard: Check if running without admin privileges
      const isAdmin = envData.is_admin;
      if (isAdmin === 'false' || isAdmin === false) {
        toast.error(
          "Run as Administrator.",
          {
            duration: 15000,
            description: "AMP Manager requires elevated privileges to create SSL certificates.",
            action: {
              label: 'Learn More',
              onClick: () => window.open('https://github.com/Amp-Manager/amp-manager', '_blank')
            }
          }
        );
      }

      // Save history and fetch stats
      await configGuardService.captureFactorySettings();

      let databases: any[] = [];
      try {
        databases = await databaseService.listDatabases();
      } catch (dbErr: any) {
        const errorMsg = dbErr?.message || 'Unknown error';
        toast.warning(`Could not retrieve databases: ${errorMsg}. Containers may be stopped.`);
      }

      const [notes, sites, activityLogs, workflows, credentials, domainStatuses, tagsFromDb] = await Promise.all([
        loadNotesJSON(user || "default"),
        loadSitesJSON(),
        loadActivityLogsJSON(user || "default"),
        loadWorkflowsJSON(),
        loadCredentialsJSON(user || "default"),
        loadDomainStatusJSON(),
        loadTagsJSON()
      ]);
      
      const notesArr = Array.isArray(notes) ? notes : [];
      const workflowsArr = Array.isArray(workflows) ? workflows : [];
      const credsArr = Array.isArray(credentials) ? credentials : [];
      
      const saved = workflowsArr.length;
      const success = notesArr.filter(n => n.tags?.includes('deploy') && !n.tags?.includes('fail')).length;
      const failure = notesArr.filter(n => n.tags?.includes('deploy') && n.tags?.includes('fail')).length;
      
      setWorkflowStats({ saved, success, failure });
      setRecentWorkflows(workflowsArr.sort((a, b) => b.updated_at - a.updated_at).slice(0, 5));
      
      // Last 7 days stats
      const last7DaysMap = new Map<string, { saved: number, success: number, failure: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        last7DaysMap.set(dateStr, { saved: 0, success: 0, failure: 0 });
      }

      if (Array.isArray(workflows)) {
        workflows.forEach(w => {
          const d = new Date(w.created_at || w.updated_at);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (last7DaysMap.has(dateStr)) {
            last7DaysMap.get(dateStr)!.saved++;
          }
        });
      }

      if (Array.isArray(notes)) {
        notes.forEach(n => {
          if (n.tags?.includes('deploy')) {
            const d = new Date(n.created_at || n.updated_at);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (last7DaysMap.has(dateStr)) {
              if (n.tags.includes('fail')) {
                last7DaysMap.get(dateStr)!.failure++;
              } else {
                last7DaysMap.get(dateStr)!.success++;
              }
            }
          }
        });
      }

      setLast7Days(Array.from(last7DaysMap.entries()).map(([date, stats]) => ({ date, ...stats })));
      
      const domainArr = Array.isArray(domainStatuses) ? domainStatuses : [];
      const wflowsArr = Array.isArray(workflows) ? workflows : [];
      const dbsArr = Array.isArray(databases) ? databases : [];

      const domainsValid = domainArr.filter(d => d.status === 'valid').length;
      const domainsWarning = domainArr.filter(d => d.status !== 'valid').length;
      const certificatesValid = domainArr.filter(d => d.sslValid && d.caMatch).length;
      const certificatesWarning = domainArr.filter(d => !d.sslValid || !d.caMatch).length;

      setDashboardCounts({
        domains: domainArr.length,
        domainsValid,
        domainsWarning,
        notes: notesArr.length,
        encryptedNotes: notesArr.filter(n => n.is_encrypted).length,
        credentials: credsArr.length,
        workflows: wflowsArr.length,
        activeWorkflows: wflowsArr.length,
        databases: dbsArr.length,
        certificates: domainArr.length,
        certificatesValid,
        certificatesWarning
      });

      // Process Timeline
      const timelineMap = new Map<string, TimelineEvent[]>();
      const processedEvents = new Set<string>();

      const addEvent = (entityType: string, action: string, ts: number, name: string) => {
        const key = `${entityType}-${action}-${ts}-${name}`;
        if (processedEvents.has(key)) return;
        processedEvents.add(key);

        const rowNameMap: Record<string, string> = {
          domain: 'Domains',
          credential: 'Credentials',
          note: 'Notes',
          workflow: 'Workflows',
          database: 'Databases',
          tag: 'Tags',
          activity: 'Activities'
        };

        const normalized = entityType.toLowerCase();
        const rowName = rowNameMap[normalized] ?? 
          entityType.charAt(0).toUpperCase() + entityType.slice(1) + 's';
        
        const events = timelineMap.get(rowName) || [];
        let outcome: TimelineEvent['outcome'] = 'info';
        if (action === 'create') outcome = 'success';
        else if (action === 'update') outcome = 'info';
        else if (action === 'delete') outcome = 'warning';
        else if (action === 'error') outcome = 'error';
        else if (action === 'deploy') outcome = 'success';

        events.push({
          start: ts,
          end: ts + (1000 * 60 * 60),
          outcome,
          label: `${action.toUpperCase()}: ${name}`
        });
        timelineMap.set(rowName, events);
      };

      if (Array.isArray(activityLogs)) {
        activityLogs.forEach(log => addEvent(log.entity_type, log.action, log.timestamp, log.entity_name));
      }

      const timelineRows: TimelineRow[] = Array.from(timelineMap.entries()).map(([name, events]) => ({
        name,
        events: events.sort((a, b) => a.start - b.start)
      }));
      setTimelineEvents(timelineRows);

      // Compute tag counts from all entities
      const tagCounts: Record<string, number> = {};
      const processTaggedItems = (items: any[]) => {
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
              item.tags.forEach((tagId: string) => {
                tagCounts[tagId] = (tagCounts[tagId] || 0) + 1;
              });
            }
          });
        }
      };
      processTaggedItems(sites);
      processTaggedItems(workflows);
      processTaggedItems(credentials);
      processTaggedItems(notes);

      const computedTagStats = tagsFromDb.map(t => ({
        ...t,
        count: tagCounts[t.id] || 0
      })).sort((a, b) => b.count - a.count);
      setTagStats(computedTagStats);

    } catch (e: any) {
      setError(e.message || "Failed to connect to backend");
      handleError(e);
    } finally {
      setLoading(false);
      setNextRefresh(Date.now() + interval);
    }
  }, [user, interval, handleError]);

  useEffect(() => {
    if (!user || !isSynced) return;
    fetchEnv();
  }, [user, isSynced, fetchEnv]);

  useEffect(() => {
    if (!user || !live) return;
    const timer = setInterval(fetchEnv, interval);
    return () => clearInterval(timer);
  }, [user, live, interval, fetchEnv]);

  useEffect(() => {
    if (!live || !nextRefresh) {
      setProgress(100);
      return;
    }
    const updateProgress = () => {
      const remaining = nextRefresh - Date.now();
      const percent = Math.max(0, Math.min(100, (remaining / interval) * 100));
      setProgress(percent);
    };
    const id = setInterval(updateProgress, 100);
    return () => clearInterval(id);
  }, [live, nextRefresh, interval]);

  return {
    env,
    dashboardCounts,
    workflowStats,
    recentWorkflows,
    last7Days,
    timelineEvents,
    tagStats,
    loading,
    error,
    progress,
    nextRefresh,
    live,
    interval,
    setLive,
    setRefreshInterval,
    fetchEnv
  };
}
