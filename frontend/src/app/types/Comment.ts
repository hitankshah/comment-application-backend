export interface Comment {
  id: string;
  content: string;
  user: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  parentId?: string;
  replies?: {
    items: Comment[];
    total: number;
    hasMore: boolean;
  };
}
