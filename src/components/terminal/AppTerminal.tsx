import * as React from "react";
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { terminalService } from "@/services/TerminalService";
import { Trash2, Play } from "lucide-react";

export default function AppTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: '#18181b', // zinc-900
        foreground: '#e4e4e7', // zinc-200
        cursor: '#6366f1',     // indigo-500
        selectionBackground: '#4f46e5',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
      },
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();
    term.focus();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initialize the service
    terminalService.init(term);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      terminalService.dispose();
      term.dispose();
    };
  }, []);

  const handleClear = () => {
    xtermRef.current?.clear();
    xtermRef.current?.focus();
  };

  const runQuickCommand = (cmd: string) => {
    xtermRef.current?.focus();
    terminalService.sendCommand(cmd);
  };

  return (
    <div className="flex flex-col h-full bg-base-100 rounded-lg overflow-hidden border border-base-300">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-base-100 border-b border-base-300">
        {/* <div className="flex items-center gap-2"> */}
          <span className="text-xs font-bold uppercase tracking-widest opacity-70">Interactive Terminal</span>
        {/* </div> */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 mr-4">
            <button 
              onClick={() => runQuickCommand('amp-tasks.bat status')}
              className="btn btn-xs btn-ghost gap-1 text-[10px]"
            >
              <Play className="h-3 w-3" /> Status
            </button>
          </div>
          <button 
            onClick={handleClear}
            className="btn btn-xs btn-ghost text-error"
            title="Clear Terminal"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 min-h-0 bg-[#18181b]">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
      
      {/* Terminal Footer */}
      <div className="px-4 py-1 bg-base-100 text-[10px] opacity-50 flex justify-between">
        <span>Connected to cmd.exe</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
