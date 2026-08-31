export interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  channel_url: string;
  thumbnail: string;
  duration: number;
  duration_str: string;
  views: number;
  likes: number;
  description: string;
  resolutions: number[];
  has_audio: boolean;
  webpage_url: string;
  platform?: MediaPlatform;
}

export type MediaPlatform = 'youtube' | 'tiktok';

export type DownloadMode = 'video' | 'audio';

export interface DownloadOptions {
  url: string;
  platform?: MediaPlatform;
  mode: DownloadMode;
  quality: string;
  format: string;
  trimStart?: string;
  trimEnd?: string;
  embedThumbnail?: boolean;
  noWatermark?: boolean;
}

export type JobStatus = 'idle' | 'starting' | 'downloading' | 'converting' | 'ready' | 'error';

export interface DownloadProgress {
  jobId: string;
  status: JobStatus;
  percent: number;
  speed?: string;
  eta?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  message?: string;
  error?: string;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  title?: string;
  duration?: number;
  format?: string;
  mode?: DownloadMode;
  platform?: MediaPlatform;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  jobId: string;
  title: string;
  thumbnail: string;
  channel: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  format: string;
  mode: DownloadMode;
  platform?: MediaPlatform;
  quality: string;
  timestamp: number;
}
