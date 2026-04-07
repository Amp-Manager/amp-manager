import React from 'react';
import { Globe, Square } from 'lucide-react';
import { DomainMenu } from './DomainMenu';
import { COLOR_MAP } from '@/components/layout/uiConstants';
import type { Domain, Tag, TunnelRecord } from '@/types/entities';

interface DomainTableViewProps {
  domains: Domain[];
  allTags: Tag[];
  activeTunnels: Record<string, TunnelRecord>;
  onOpenLink: (e: React.MouseEvent<HTMLAnchorElement>, url: string) => void;
  onOpenFolder: (path: string) => void;
  onAddNote: (name: string) => void;
  onConfig: (domain: Domain) => void;
  onLogs: (domain: Domain) => void;
  onOpenIDE: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onDelete: (id: string) => void;
  onShare: (domain: Domain) => void;
  onStopTunnel: (domainName: string) => void;
}

export function DomainTableView({
  domains,
  allTags,
  activeTunnels,
  onOpenLink,
  onOpenFolder,
  onAddNote,
  onConfig,
  onLogs,
  onOpenIDE,
  onOpenTerminal,
  onDelete,
  onShare,
  onStopTunnel
}: DomainTableViewProps) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg shadow overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Path</th>
            <th className="text-center">Status</th>
            <th className="text-center">SSL</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((domain) => (
            <tr key={domain.id}>
              <td className="font-medium">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <a 
                      href={`http${domain.ssl ? 's' : ''}://${domain.name}`} 
                      onClick={(e) => onOpenLink(e, `http${domain.ssl ? 's' : ''}://${domain.name}`)}
                      className="link link-primary"
                    >
                      {domain.name}
                    </a>
                    {activeTunnels[domain.name] && (
                      <div className="tooltip tooltip-right" data-tip="Active Tunnel">
                        <Globe className="h-3 w-3 text-primary animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {domain.tags?.map((tagId: string) => {
                      const tagDef = allTags.find(t => t.id === tagId);
                      const tagName = tagDef ? tagDef.name : (tagId.startsWith('tag_') ? 'Loading...' : tagId);
                      return (
                        <span key={tagId} className={`badge badge-soft text-[9px] h-4 px-1 ${tagDef ? COLOR_MAP[tagDef.color] : 'badge-secondary'}`}>
                          {tagName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </td>
              <td className="opacity-70 max-w-[150px] truncate" title={domain.path}>{domain.path}</td>
              <td className="text-center">
                {activeTunnels[domain.name] ? (
                  <button 
                    className="badge badge-sm badge-warning gap-1 cursor-pointer hover:brightness-110"
                    onClick={() => onStopTunnel(domain.name)}
                    title="Click to stop tunnel"
                  >
                    <Square className="h-2 w-2" /> Tunnel
                  </button>
                ) : (
                  <div className="badge badge-sm badge-soft">Local</div>
                )}
              </td>
              <td className="text-center">
                {domain.ssl ? (
                  domain.ssl_valid === false ? (
                    <div className="badge badge-sm badge-soft badge-error">Invalid</div>
                  ) : (
                    <div className="badge badge-sm badge-soft badge-success">Secured</div>
                  )
                ) : (
                  <div className="badge badge-sm badge-soft badge-warning">Unsecured</div>
                )}
              </td>
              <td className="text-right overflow-visible">
                <DomainMenu 
                  domain={domain}
                  hasActiveTunnel={!!activeTunnels[domain.name]}
                  onOpenFolder={onOpenFolder}
                  onAddNote={onAddNote}
                  onConfig={onConfig}
                  onLogs={onLogs}
                  onOpenIDE={onOpenIDE}
                  onOpenTerminal={onOpenTerminal}
                  onDelete={onDelete}
                  onOpenLink={onOpenLink}
                  onShare={onShare}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
