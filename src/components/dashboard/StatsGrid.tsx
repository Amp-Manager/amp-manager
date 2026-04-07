import React from 'react';
import { Globe, Workflow, ShieldCheck, Database, FileText, Key } from 'lucide-react';
import { DashboardCounts } from './types';

interface StatsGridProps {
  counts: DashboardCounts;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ counts }) => {
  const stats = [
    { 
      label: "Domains", 
      value: counts.domains, 
      icon: Globe, 
      subtext: counts.domainsWarning > 0 
        ? `${counts.domainsValid} valid, ${counts.domainsWarning} warning` 
        : `${counts.domainsValid} valid` 
    },
    { label: "Workflows", value: counts.workflows, icon: Workflow, subtext: `${counts.activeWorkflows} active` },
    { 
      label: "Certificates", 
      value: counts.certificates, 
      icon: ShieldCheck, 
      subtext: counts.certificatesWarning > 0 
        ? `${counts.certificatesValid} valid, ${counts.certificatesWarning} warning` 
        : `${counts.certificatesValid} valid` 
    },
    { label: "Databases", value: counts.databases, icon: Database, subtext: `${counts.databases} active` },
    { label: "Notes", value: counts.notes, icon: FileText, subtext: `${counts.encryptedNotes} Encrypted Notes` },
    { label: "Credentials", value: counts.credentials, icon: Key, subtext: "Encrypted" },
  ];

  return (
    <div className="grid gap-4 grid-cols-2">
      {stats.map((stat, idx) => (
        <div key={idx} className="card bg-base-100 shadow border border-base-200">
          <div className="card-body p-6">
            <h3 className="card-title text-sm font-medium">{stat.label}</h3>
            <div className="flex flex-row items-center justify-between space-y-0">
              <div className="text-2xl font-bold capitalize">{stat.value}</div>
              <stat.icon />
            </div>
            <p className="text-xs opacity-70">{stat.subtext}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
