import * as React from "react";
import AppTerminal from "@/components/terminal/AppTerminal";
import { Info, Terminal as TerminalIcon, Zap, Activity, Box, Globe, ShieldCheck } from 'lucide-react';
import { terminalService } from "@/services/TerminalService";

const QUICK_COMMANDS = [
  { group: "System", icon: Activity, commands: [
    { label: "Status", cmd: "amp-tasks.bat status", desc: "Full stack health check" },
    { label: "Version", cmd: "amp-tasks.bat version", desc: "Check AMP version" },
  ]},
  { group: "Docker", icon: Box, commands: [
    { label: "Up", cmd: "amp-tasks.bat docker_up", desc: "Start all containers" },
    { label: "Stop", cmd: "amp-tasks.bat docker_stop", desc: "Stop all containers" },
    { label: "Metrics", cmd: "amp-tasks.bat docker_env_metrics", desc: "Resource usage" },
    { label: "PHP Ext", cmd: "amp-tasks.bat php_extensions", desc: "List PHP modules" },
  ]},
  { group: "Domains", icon: Globe, commands: [
    { label: "List", cmd: "amp-tasks.bat list_domains", desc: "Show managed domains" },
    { label: "Scan", cmd: "amp-tasks.bat scan_domains", desc: "List HOSTS domains" },
  ]},
  { group: "SSL/CA", icon: ShieldCheck, commands: [
    { label: "CA Status", cmd: "amp-tasks.bat ca_status", desc: "Check local CA" },
  ]},
];

export default function TerminalPage() {
  const handleCommand = (cmd: string) => {
    terminalService.sendCommand(cmd);
  };

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <TerminalIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl tracking-tight">Interactive Terminal</h1>
          <p className="text-xs opacity-50">Direct access to cmd.exe and AMP tasks</p>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Main Terminal Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-base-200 shadow-md">
            <AppTerminal />
          </div>
          
          <div className="alert alert-info alert-soft p-4 rounded-lg">
            <div className="flex gap-4">
              <div className="bg-primary/10 p-2 rounded-lg h-fit">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Terminal Tip</h3>
                <p className="text-sm leading-relaxed max-w-3xl">
                  This terminal lets you run selected AMP commands from the list.
                      Only predefined actions are permitted for your safety.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Quick Actions Sidebar */}
        <div className="w-64 xl:flex flex-col gap-4 shrink-0">
          <div className="bg-base-100 rounded-lg border border-base-300 flex flex-col min-h-0">
            <div className="bg-base-200/50 border-b border-base-300 flex items-center gap-2 px-4 py-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold">AMP Commands</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {QUICK_COMMANDS.map((group) => (
                <div key={group.group} className="space-y-1">
                  <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wider font-bold opacity-40">
                    <group.icon className="w-3 h-3" />
                    {group.group}
                  </div>
                  {group.commands.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => handleCommand(c.cmd)}
                      className="flex items-center justify-between w-full text-left p-3 rounded-lg hover:bg-primaey/10 hover:text-primary transition-colors group relative"
                    >
                      <div className="text-xs font-medium">{c.label}</div>
                      <div className="text-[10px] opacity-40 truncate">{c.desc}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
