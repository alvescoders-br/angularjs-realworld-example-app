// Refs: #5 — S3a domain models for articles, comments, and profiles.

export type Profile = {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: Profile;
};

export type ArticleEnvelope = {
  article: Article;
};

export type ArticlesEnvelope = {
  articles: Article[];
  articlesCount: number;
};

export type ArticleFilters = {
  tag?: string;
  author?: string;
  favorited?: string;
  limit?: number;
  offset?: number;
};

export type ArticleListConfig = {
  type: 'all' | 'feed';
  filters: ArticleFilters;
  currentPage?: number;
  totalPages?: number;
};

export type ArticleSave = {
  title: string;
  description: string;
  body: string;
  tagList: string[];
  slug?: string;
};

export type Comment = {
  id: number;
  createdAt: string;
  updatedAt: string;
  body: string;
  author: Profile;
};

export type CommentEnvelope = {
  comment: Comment;
};

export type CommentsEnvelope = {
  comments: Comment[];
};

export type ProfileEnvelope = {
  profile: Profile;
};

export type TagsEnvelope = {
  tags: string[];
};
