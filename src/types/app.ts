export interface VibeApp {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  thumbnail: string;
  category: AppCategory;
  tags: string[];
  techStack: string[];
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
