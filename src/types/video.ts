export interface Video {
  id: string;

  youtubeId: string;

  title: string;

  description?: string;

  thumbnailUrl: string;

  channelName: string;

  classLevel?: string;

  subject?: string;

  chapter?: string;

  exam?: string;

  language?: string;

  approved: boolean;

  featured?: boolean;

  classified?: boolean;

  views?: number;

  savedCount?: number;

  publishedAt?: string;

  createdAt?: string;
}