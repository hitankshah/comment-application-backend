    'use client';
    import { useAuth } from '../contexts/AuthContext';
    import { CommentItem } from './CommentItem';
    import type { Comment } from '@/app/types/Comment';

    interface CommentListProps {
      comments: Comment[];
      onUpdate: (updatedComment: Comment) => void;
      onDelete: (commentId: string) => void;
      onRestore: (restoredComment: Comment) => void;
    }

    export function CommentList({ comments, onUpdate, onDelete, onRestore }: CommentListProps) {
      const { isAuthenticated } = useAuth();

      return (
        <div className="space-y-6">
          {comments.map((comment: Comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onRestore={onRestore}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      );
    }