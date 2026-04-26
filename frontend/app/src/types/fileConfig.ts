export interface FileStorageConfig {
  maxFileSizeMb: number;
  
  allowedTypes: string[];
  
  allowedExtensions: string[];
  
  isPublicBucket: boolean;
  
  urlExpirySeconds: number | null;
  
  categories: string[];
}

export const DEFAULT_FILE_CONFIG: FileStorageConfig = {
  maxFileSizeMb: 10,
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'],
  isPublicBucket: false,
  urlExpirySeconds: 3600,
  categories: ['banner', 'avatar', 'attachment', 'document']
};