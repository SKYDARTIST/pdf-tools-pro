
export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

export enum ToolType {
  MERGE = 'merge',
  SPLIT = 'split',
  IMAGE_TO_PDF = 'image-to-pdf',
  PDF_TO_IMAGE = 'pdf-to-image',
  WATERMARK = 'watermark'
}

export interface AppNotification {
  type: 'success' | 'error' | 'info';
  message: string;
}

export enum SubscriptionTier {
  FREE = 'free',
  LIFETIME = 'lifetime'
}

export interface UserSubscription {
  tier: SubscriptionTier;
  purchaseToken?: string;
}
