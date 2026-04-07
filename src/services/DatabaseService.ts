import { AmpResponse } from "@/types";
import { ampBridge } from "./AMPBridge";
import { toast } from "@/utils/toast";

export interface DatabaseInfo {
  name: string;
  owner?: string;
  status: 'active' | 'orphaned';
  folderExists: boolean;
  dbExists: boolean;
  tags?: string[];
}

class DatabaseService {
  /**
   * List databases: cross-reference MariaDB + /data folder
   */
  async listDatabases(): Promise<DatabaseInfo[]> {
    if (!ampBridge.isAvailable()) {
      throw new Error('Backend not connected. Please restart the application.');
    }

    // Get project root to find data folder
    const env = await ampBridge.envCheck();
    if (!env?.project_root) {
      throw new Error('Project root not found. Verify Docker is running and containers are started.');
    }
    const dataPath = `${env.project_root}/data`;

    // Query MariaDB via optimized LIST command
    const dbResult = await ampBridge.dbQuery("LIST");
    if (dbResult.status !== 'ok') {
      throw new Error(dbResult.message || 'Failed to query MariaDB. Ensure containers are running.');
    }

    if (!dbResult.stdOut) {
      return [];
    }

    const dbNames = dbResult.stdOut
      .split('\n')
      .map(d => d.trim())
      .filter(d => d && !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(d));

    // Scan /data folder for directories
    const folderNames = new Set<string>();
    try {
      const entries = await ampBridge.fs.readDirectory(dataPath);
      entries.forEach((entry: any) => {
        if (entry.type === 'DIRECTORY' && entry.entry) {
          folderNames.add(entry.entry);
        }
      });
    } catch {
      // if scan fails, assume no folders exist
      toast.warning('Could not scan data folder. Database folder status may be incomplete.');
    }

    // Build integrity report
    return dbNames.map(name => {
      const folderExists = folderNames.has(name);
      const dbExists = true;

      return {
        name,
        status: (folderExists && dbExists) ? 'active' : 'orphaned',
        folderExists,
        dbExists
      };
    });
  }

  /**
   * Create database via amp-tasks.bat
   * @param payload Format: "dbname|||username|||password"
   */
  async createDatabase(payload: string): Promise<AmpResponse> {
    if (!ampBridge.isAvailable()) {
      throw new Error('Backend not connected. Please restart the application.');
    }

    const result = await ampBridge.dbQuery(payload);
    if (result.status !== 'ok') {
      throw new Error(result.message || 'Database creation failed. Ensure containers are running.');
    }
    return {
      status: 'ok',
      message: result.message || 'Database created'
    };
  }

  /**
   * Delete database via amp-tasks.bat
   */
  async deleteDatabase(dbName: string): Promise<AmpResponse> {
    if (!ampBridge.isAvailable()) {
      throw new Error('Backend not connected. Please restart the application.');
    }

    const protectedDbs = ['information_schema', 'mysql', 'performance_schema', 'sys'];
    if (!dbName || protectedDbs.includes(dbName)) {
      throw new Error(`Cannot delete system database "${dbName}".`);
    }

    const result = await ampBridge.dbQuery(`delete${dbName}`);
    if (result.status !== 'ok') {
      throw new Error(result.message || 'Database deletion failed.');
    }
    return {
      status: 'ok',
      message: result.message || 'Database deleted'
    };
  }

  /**
   * Launch external DB tool
   */
  async launchTool(toolPath: string, type: 'url' | 'path'): Promise<void> {
    if (!ampBridge.isAvailable()) {
      throw new Error('Backend not connected. Please restart the application.');
    }

    if (type === 'url') {
      await ampBridge.os.open(toolPath);
    } else {
      await ampBridge.os.execCommand(`"${toolPath}"`);
    }
  }
}

export const databaseService = new DatabaseService();