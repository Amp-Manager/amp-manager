import { TimelineRow } from './Timeline';

export interface EnvStatus {
  status: string;
  project_root?: string;
  docker_compose: string;
  angie_conf: string;
  db_init: string;
  php_ini: string;
  data_folder: string;
  www_folder: string;
  cert_file: string;
  mkcert: string;
  caroot_ok: boolean;
  docker_running: boolean;
  // Timestamps
  angie_conf_date?: string;
  cert_file_date?: string;
  www_folder_date?: string;
  [key: string]: string | boolean | undefined;
}

export interface DashboardCounts {
  domains: number;
  domainsValid: number;
  domainsWarning: number;
  certificates: number;
  certificatesValid: number;
  certificatesWarning: number;
  notes: number;
  encryptedNotes: number;
  credentials: number;
  workflows: number;
  activeWorkflows: number;
  databases: number;
}

export interface WorkflowStatsData {
  saved: number;
  success: number;
  failure: number;
}

export interface DashboardData {
  env: EnvStatus | null;
  dashboardCounts: DashboardCounts;
  workflowStats: WorkflowStatsData;
  recentWorkflows: any[];
  last7Days: any[];
  timelineEvents: TimelineRow[];
  loading: boolean;
  error: string | null;
  progress: number;
  nextRefresh: number;
}
