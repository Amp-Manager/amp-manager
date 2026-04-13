export interface Note {
  id: string;
  title: string;
  content: string;
  site_id?: string;
  tags: string[];
  is_encrypted: boolean;
  content_iv?: string;
  content_ciphertext?: string;
  content_salt?: string;
  created_at: number;
  updated_at: number;
}

export interface Site {
  id: string;
  domain: string;
}

export interface NoteFormData {
  title: string;
  content: string;
  site_id: string;
  tags: string[];
  is_encrypted: boolean;
}
