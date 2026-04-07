import { Terminal } from '@xterm/xterm';
import { ampBridge } from './AMPBridge';
import { toast } from '@/utils/toast';

class TerminalService {
  private processId: number | null = null;
  private terminal: Terminal | null = null;
  private onDataListener: any = null;

  async init(terminal: Terminal) {
    this.terminal = terminal;
    
    if (!ampBridge.isAvailable()) {
      this.terminal.writeln('\x1b[33m[Browser Mode] Terminal is simulated. Real shell requires the desktop app.\x1b[0m');
      this.terminal.writeln('$ ');
      return;
    }

    // Spawn cmd.exe with:
    // /d: Ignore registry autorun commands
    // /q: Turn echo off initially
    // /k: Execute command and continue
    // chcp 65001 >nul: Set UTF-8 silently
    // cls: Clear the initial encoding-mangled output
    const proc = await ampBridge.os.spawnProcess('cmd.exe /d /q /k "chcp 65001 >nul && cls"');
    this.processId = proc.id;

    // Listen for process output
    this.onDataListener = (evt: any) => {
      if (evt.detail.id === this.processId && (evt.detail.action === 'stdOut' || evt.detail.action === 'stdErr')) {
        let data = evt.detail.data;
        // Normalize newlines: convert single \n to \r\n to prevent "staircase" effect
        // but avoid doubling up if \r\n is already present.
        data = data.replace(/\r?\n/g, '\r\n');
        
        if (evt.detail.action === 'stdOut') {
          this.terminal?.write(data);
        } else {
          this.terminal?.write(`\x1b[31m${data}\x1b[0m`);
        }
      } else if (evt.detail.id === this.processId && evt.detail.action === 'exit') {
        this.terminal?.writeln('\r\n\x1b[31mProcess exited.\x1b[0m');
        this.processId = null;
      }
    };

    ampBridge.events.on('spawnedProcess', this.onDataListener);

    // Handle terminal input
    this.terminal.onData((data) => {
      if (this.processId !== null) {
        // Send to process
        ampBridge.os.updateSpawnedProcess(this.processId, 'stdIn', data);
        
        // Local Echo: Since cmd.exe over pipes doesn't echo back typed characters,
        // we manually write them to the terminal so the user can see what they type.
        if (data === '\r') {
          // Enter key: move to next line
          this.terminal?.write('\r\n');
        } else if (data === '\x7f') { 
          // Backspace: move back, print space, move back
          this.terminal?.write('\b \b');
        } else {
          // Regular characters and pasted text
          this.terminal?.write(data);
        }
      } else {
        // If process exited, restart shell on Enter
        if (data === '\r') {
          this.terminal?.writeln('\r\nRestarting shell...');
          this.init(this.terminal!);
        }
      }
    });
  }

  async sendCommand(cmd: string) {
    if (this.processId !== null && ampBridge.isAvailable()) {
      // Send a newline first to clear any partial input
      await ampBridge.os.updateSpawnedProcess(this.processId, 'stdIn', '\r\n');
      
      // Echo the command visually
      this.terminal?.write(`\r\n> ${cmd}\r\n`);
      
      // Send the actual command
      await ampBridge.os.updateSpawnedProcess(this.processId, 'stdIn', cmd + '\r\n');
      
      this.terminal?.focus();
    } else if (!ampBridge.isAvailable()) {
      this.terminal?.writeln(`\r\n$ ${cmd}`);
      this.terminal?.writeln('Command executed (browser mode - no real shell).');
      this.terminal?.write('$ ');
    }
  }

  dispose() {
    if (this.onDataListener && ampBridge.isAvailable()) {
      ampBridge.events.off('spawnedProcess', this.onDataListener);
    }
    if (this.processId !== null && ampBridge.isAvailable()) {
      ampBridge.os.updateSpawnedProcess(this.processId, 'stdIn', 'exit\r\n');
    }
    this.processId = null;
    this.terminal = null;
  }
}

export const terminalService = new TerminalService();
