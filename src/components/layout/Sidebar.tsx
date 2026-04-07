import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Globe, 
  Activity,
  Database,
  HardDrive,
  Container, 
  ShieldCheck, 
  Settings,
  LayoutDashboard,
  LogOut,
  Workflow,
  FileText,
  Key,
  Info,
  Mail,
  Terminal as TerminalIcon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
// import { CreateSiteModal } from "./CreateSiteModal";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },

  { type: "divider", title: "Services" },

  { to: "/domains", icon: Globe, label: "Domains" },
  { to: "/docker", icon: Container, label: "Docker" },
  { to: "/databases", icon: Database, label: "Databases" },
  { to: "/monitor", icon: Activity, label: "Angie Status" },

  { type: "divider", title: "Tools" },

  { to: "/certificates", icon: ShieldCheck, label: "Certificates" },
  { to: "/hosts", icon: HardDrive, label: "Hosts" },  
  { to: "/mail", icon: Mail, label: "Mail" },
  { to: "/notes", icon: FileText, label: "Notes" },
  { to: "/credentials", icon: Key, label: "Credentials" },  
  { to: "/workflow", icon: Workflow, label: "Workflow" },

  { to: "/terminal", icon: TerminalIcon, label: "Terminal" },
  
  { type: "divider", title: "System" },

  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/about", icon: Info, label: "About" },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex h-full w-42 flex-col bg-base-300/50 border-r border-base-100">
      
      <ul className="menu menu-sm flex-1 w-full p-4 pt-8 space-y-2">
        {navItems.map((item, i) => {
          if (item.type === "divider") {
            return (
              <li
                key={`divider-${i}`}
                className="menu-title p-0 pointer-events-none cursor-default hover:bg-transparent"
              >
                <div className="divider my-0 uppercase tracking-widest text-[8px] opacity-70">
                  {item.title}
                </div>
              </li>
            );
          }
          const isActive = location.pathname === item.to || 
          (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <li key={item.to}>
              <div
                role="link"
                tabIndex={0}
                aria-current={isActive ? "page" : undefined}
                className={cn(isActive ? "active" : "", "cursor-pointer")}
                onClick={() => navigate(item.to)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(item.to);
                  }
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="p-4 border-t border-base-300">
        <div className="flex items-center justify-center">
          <div className="tooltip tooltip-neutral" data-tip="App stays active">
            <button
              type="button"
              onClick={logout}
              className="btn btn-xs btn-soft btn-error w-full rounded-md px-4"
            >
              Logout <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
