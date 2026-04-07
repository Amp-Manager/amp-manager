import { useState, useEffect, lazy, Suspense } from 'react';
import { Loader2, RefreshCw, FolderTree, Database, Code, Settings as SettingsIcon, Bell } from 'lucide-react';
import { ampBridge } from '@/services/AMPBridge';

const SettingsIde = lazy(() => import('@/components/settings/SettingsIde'));
const SettingsDatabaseTool = lazy(() => import('@/components/settings/SettingsDatabaseTool'));
const SettingsPath = lazy(() => import('@/components/settings/SettingsPath'));
const SettingsBackupRestore = lazy(() => import('@/components/settings/SettingsBackupRestore'));
const SettingsZoneDelete = lazy(() => import('@/components/settings/SettingsZoneDelete'));
const SettingsVersionUpdate = lazy(() => import('@/components/settings/SettingsVersionUpdate'));
const SettingsSyncInterval = lazy(() => import('@/components/settings/SettingsSyncInterval').then(m => ({ default: m.SettingsSyncInterval })));
const SettingsTunnelServices = lazy(() => import('@/components/settings/SettingsTunnelServices').then(m => ({ default: m.SettingsTunnelServices })));
const SettingsNotifications = lazy(() => import('@/components/settings/SettingsNotifications'));

export default function Settings() {
  const [projectRoot, setProjectRoot] = useState<string>('error');
  const [activeTab, setActiveTab] = useState<'notifications' | 'sync' | 'ide' | 'database' | 'paths'>('notifications');

  useEffect(() => {
    const fetchProjectRoot = async () => {
      if (ampBridge.isAvailable()) {
        const eRes = await ampBridge.envCheck();
        if (eRes && eRes.project_root) {
          const root = eRes.project_root.endsWith('\\') ? eRes.project_root : eRes.project_root + '\\';
          setProjectRoot(root);
        }
      }
    };
    fetchProjectRoot();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl flex items-center gap-4">
          <div className="bg-indigo-500/10 rounded-lg border border-base-200 shrink-0 p-2">
          <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          Settings
        </h1>
        <p className="text-sm opacity-70">Manage application preferences and paths.</p>
      </div>

      <div className="space-y-8">

        {/* Update version */}
        <Suspense fallback={
          <div className="card bg-base-100 shadow-xl border border-base-200 animate-pulse">
            <div className="card-body h-48 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin opacity-20" />
            </div>
          </div>
        }>
          <SettingsVersionUpdate />
        </Suspense>

        {/* Code Editor / Database / Paths Tabs */}
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body gap-0">
            <div role="tablist" className="tabs tabs-box rounded-t-md rounded-b-none pt-2 pb-0">
              <a 
                role="tab" 
                className={`tab font-bold rounded-b-none gap-2 ${activeTab === 'notifications' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="w-5 h-5" /> <span>Notifications</span>
              </a>
              <a 
                role="tab" 
                className={`tab font-bold rounded-b-none gap-2 ${activeTab === 'sync' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('sync')}
              >
                <RefreshCw className="w-5 h-5" /> <span>Synchronization</span>
              </a>
              <a 
                role="tab" 
                className={`tab font-bold rounded-b-none gap-2 ${activeTab === 'ide' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('ide')}
              >
                <Code className="w-5 h-5" /> <span>Code Editor</span>
              </a>
              <a 
                role="tab" 
                className={`tab font-bold rounded-b-none gap-2 ${activeTab === 'database' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('database')}
              >
                <Database className="w-5 h-5" /> <span>Database Client</span>
              </a>
              <a 
                role="tab" 
                className={`tab font-bold rounded-b-none gap-2 ${activeTab === 'paths' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('paths')}
              >
                <FolderTree className="w-5 h-5" /> <span>Required Paths</span>
              </a>
            </div>

            <Suspense fallback={
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin opacity-20" />
              </div>
            }>
              {activeTab === 'sync' && <SettingsSyncInterval />}
              {activeTab === 'ide' && <SettingsIde />}
              {activeTab === 'database' && <SettingsDatabaseTool />}
              {activeTab === 'paths' && <SettingsPath projectRoot={projectRoot} />}
              {activeTab === 'notifications' && <SettingsNotifications />}
            </Suspense>
          </div>
        </div>

        {/* Tunnel */}
        <Suspense fallback={
          <div className="card bg-base-100 shadow-xl border border-base-200 animate-pulse">
            <div className="card-body h-96 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin opacity-20" />
            </div>
          </div>
        }>
          <SettingsTunnelServices />
        </Suspense>

        {/* Backup & Restore Card */}
        <Suspense fallback={
          <div className="card bg-base-100 shadow-xl border border-base-200 animate-pulse">
            <div className="card-body h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin opacity-20" />
            </div>
          </div>
        }>
          <SettingsBackupRestore />
        </Suspense>
        
        {/* Dangerous Zone Card */}
        <Suspense fallback={
          <div className="card bg-base-100 shadow-xl border border-base-200 animate-pulse">
            <div className="card-body h-48 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin opacity-20" />
            </div>
          </div>
        }>
          <SettingsZoneDelete />
        </Suspense>
        
      </div>
    </div>
  );
}
