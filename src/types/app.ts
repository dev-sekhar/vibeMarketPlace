export interface CommunityLink {
  platform: 'slack' | 'whatsapp' | 'telegram';
  url: string;
  label?: string;
}

export interface VibeApp {
  id: string;
  author_id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  thumbnail: string;
  category: AppCategory;
  tags: string[];
  techStack: string[];
  communityLinks?: CommunityLink[];
  author: {
    name: string;
    avatarInitials: string;
    avatarColor: string;
  };
  upvotes: number;
  demoUrl: string;
  repoUrl: string;
  featured: boolean;
  createdAt: string;
}

export type AppCategory =
  | 'Web App'
  | 'CLI Tool'
  | 'Productivity'
  | 'Game'
  | 'Developer Tool'
  | 'Finance'
  | 'AI Assistant';
