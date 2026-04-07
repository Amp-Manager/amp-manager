import { ampBridge } from "./AMPBridge";
import { toast } from "@/utils/toast";

export interface AngieStats {
  angie: {
    version: string;
    address: string;
    generation: number;
    load_time: string;
  };
  connections: {
    accepted: number;
    dropped: number;
    active: number;
    idle: number;
  };
  http: {
    server_zones: {
      [key: string]: {
        processing: number;
        requests: {
          total: number;
        };
        responses: {
          [key: string]: number;
        };
        data: {
          received: number;
          sent: number;
        };
      };
    };
  };
}

class AngieStatusService {
  private apiUrl = "http://localhost/status/api/";

  async getStats(): Promise<AngieStats> {
    // Try Neutralino bridge first (preferred method)
    if (ampBridge.isAvailable()) {
      try {
        const result = await ampBridge.angie.liveStatus();
        if (result.status === "error") {
          throw new Error(result.message);
        }
        return result as unknown as AngieStats;
      } catch {
        // Silently fall through to direct fetch
      }
    }

    // Fallback to direct fetch (may fail due to CORS/network)
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      return await response.json();
    } catch {
      toast.error('Cannot connect to Angie web server. Ensure containers are running.');
      throw new Error('Angie is not responding. Start containers from the Docker page.');
    }
  }
}

export const angieStatusService = new AngieStatusService();
