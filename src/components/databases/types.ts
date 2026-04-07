import { DatabaseInfo } from "@/services/DatabaseService";

export interface DatabaseMetadata {
  name: string;
  tags: string[];
  updated_at: number;
}

export interface DatabaseWithTags extends DatabaseInfo {
  tags: string[];
}

export interface DatabaseFormData {
  name: string;
  user: string;
  pass: string;
  tags: string[];
}
