export interface FileInfo {
  file_id: number;
  url: string;
  filename: string;
  size: number;
  content_type: string;
  uploaded_at: string;
  entity_type?: string;
  entity_id?: number;
  category?: string;
}

export interface FileUploadResponse {
  success: boolean;
  file?: FileInfo;
  error?: string;
}