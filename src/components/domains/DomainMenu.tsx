import * as React from "react";
import { createPortal } from "react-dom";
import { 
  MoreHorizontal, 
  Folder, 
  FileText, 
  Settings, 
  Trash2, 
  ExternalLink, 
  Terminal, 
  Activity, 
  Code,
  Globe,
  Square
} from "lucide-react";
import type { Domain } from "@/types/entities";

interface DomainMenuProps {
  domain: Domain;
  hasActiveTunnel?: boolean;
  onOpenFolder: (path: string) => void;
  onAddNote: (domainName: string) => void;
  onConfig: (domain: Domain) => void;
  onLogs: (domain: Domain) => void;
  onOpenIDE: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onDelete: (id: string) => void;
  onOpenLink: (e: React.MouseEvent, url: string) => void;
  onShare: (domain: Domain) => void;
}

export function DomainMenu({ 
  domain,
  hasActiveTunnel = false,
  onOpenFolder, 
  onAddNote, 
  onConfig, 
  onLogs,
  onOpenIDE,
  onOpenTerminal,
  onDelete, 
  onOpenLink,
  onShare
}: DomainMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{
    top: number | string;
    bottom: number | string;
    left: number;
  }>({ top: 0, bottom: 'auto', left: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);
  const url = `http${domain.ssl ? 's' : ''}://${domain.name}`;

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = 304; // Predicted height with text-xs
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldFlip = spaceBelow < menuHeight;

      // Using viewport-relative coordinates for fixed positioning
      setCoords({
        top: shouldFlip ? 'auto' : rect.bottom + 4,
        bottom: shouldFlip ? (window.innerHeight - rect.top) + 4 : 'auto',
        left: rect.right - 208 // 208px is w-52
      });
    }
    setIsOpen(!isOpen);
  };

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const handleScroll = () => setIsOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="flex items-center justify-center relative">
      <button 
        ref={triggerRef}
        onClick={toggleMenu}
        className={`btn btn-ghost btn-xs ${isOpen ? 'bg-base-300' : ''}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && createPortal(
        <ul 
          ref={menuRef}
          className="fixed menu text-xs p-2 shadow-2xl bg-base-200 rounded-box w-52 border border-base-300 z-[9999]"
          style={{ 
            top: coords.top === 'auto' ? 'auto' : `${coords.top}px`,
            bottom: coords.bottom === 'auto' ? 'auto' : `${coords.bottom}px`,
            left: `${coords.left}px` 
          }}
        >
          <li className="menu-title flex flex-row items-center gap-2 px-4 py-2 opacity-50">
            <Globe className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-widest font-bold">{domain.name}</span>
          </li>
          
          <li>
            <a onClick={(e) => handleAction(() => onOpenLink(e as any, url))}>
              <ExternalLink className="h-4 w-4 text-primary" />
              Open in Browser
            </a>
          </li>

          <li>
            <a onClick={() => handleAction(() => onOpenFolder(domain.path))}>
              <Folder className="h-4 w-4 text-primary" />
              Open Folder
            </a>
          </li>
          
          <li>
            <a onClick={() => handleAction(() => onOpenIDE(domain.path))}>
              <Code className="h-4 w-4 text-primary" />
              Open in IDE
            </a>
          </li>

          <li>
            <a onClick={() => handleAction(() => onOpenTerminal(domain.path))}>
              <Terminal className="h-4 w-4 text-primary" />
              Open Terminal
            </a>
          </li>

          <li>
            <a 
              onClick={() => handleAction(() => onShare(domain))}
              className={hasActiveTunnel ? "text-warning" : ""}
            >
              {hasActiveTunnel ? (
                <Square className="h-4 w-4 text-warning" />
              ) : (
                <Globe className="h-4 w-4 text-primary" />
              )}
              {hasActiveTunnel ? "Stop Sharing" : "Share (Tunnel)"}
            </a>
          </li>

          <div className="divider my-0 opacity-20"></div>

          <li>
            <a onClick={() => handleAction(() => onAddNote(domain.name))}>
              <FileText className="h-4 w-4 text-primary" />
              Add Note
            </a>
          </li>

          <li>
            <a onClick={() => handleAction(() => onLogs(domain))}>
              <Activity className="h-4 w-4 text-primary" />
              Domain Logs
            </a>
          </li>

          <li>
            <a onClick={() => handleAction(() => onConfig(domain))}>
              <Settings className="h-4 w-4 text-primary" />
              Configuration
            </a>
          </li>

          <div className="divider my-0 opacity-20"></div>

          <li>
            <a className="text-error" onClick={() => handleAction(() => onDelete(domain.id))}>
              <Trash2 className="h-4 w-4" />
              Delete Domain
            </a>
          </li>
        </ul>,
        document.body
      )}
    </div>
  );
}
