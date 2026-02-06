export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;      // Raw markdown content
  contentHtml: string;  // Compiled HTML from markdown
  excerpt: string;
  createdAt: Date;
  updatedAt: Date;
  reactions: Reactions;
  views: number;
  featured: boolean;
}

export interface ArticleCreate {
  title: string;
  content: string;      // Markdown
  featured?: boolean;
}

export interface ArticleUpdate {
  title?: string;
  content?: string;     // Markdown
  featured?: boolean;
}

export interface Reactions {
  fire: number;
  heart: number;
  thinking: number;
  clap: number;
}

export interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

export interface Profile {
  name: string;
  bio: string;
  avatar?: string;
  socials: SocialLink[];
}
