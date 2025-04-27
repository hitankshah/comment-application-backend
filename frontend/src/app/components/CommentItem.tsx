'use client';
import { useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import CommentForm from './CommentForm';

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: {
    id: string;
    email: string;
  };
  replies?: {
    items: Comment[];
    total: number;
    hasMore: boolean;
  };
};

type Props = {
  comment: Comment;
  onLoadMoreReplies?: (commentId: string, skip: number) => void;
  onUpdate: (updatedComment: Comment) => void;
  onDelete: (commentId: string) => void;
  onRestore: (restoredComment: Comment) => void;
  isAuthenticated: boolean;
  depth?: number;
};

export function CommentItem({ comment, onLoadMoreReplies, onUpdate, onDelete, onRestore, isAuthenticated, depth = 0 }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const { user } = useAuth();
  const maxDepth = 3;

  const handleRestore = () => {
    onRestore(comment);
  };

  const handleDelete = () => {
    onDelete(comment.id);
  };

  if (comment.deletedAt) {
    const deletedDate = new Date(comment.deletedAt);
    const restorationDeadline = new Date(deletedDate.getTime() + 15 * 60 * 1000);
    const canRestore = new Date() < restorationDeadline;

    return (
      <div className="opacity-50">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <p className="text-gray-500 italic">This comment has been deleted.</p>
          {canRestore && comment.user.id === user?.id && (
            <button
              onClick={handleRestore}
              className="text-blue-500 hover:text-blue-600 text-sm mt-2"
            >
              Restore Comment
            </button>
          )}
        </div>
        {comment.replies && comment.replies.items.length > 0 && (
          <div className="ml-6 mt-4">
            {comment.replies.items.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onLoadMoreReplies={onLoadMoreReplies}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onRestore={onRestore}
                isAuthenticated={isAuthenticated}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className={`p-4 bg-white dark:bg-gray-800 rounded shadow ${comment.updatedAt !== comment.createdAt ? 'border-l-4 border-yellow-400' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="font-semibold">{comment.user.email}</span>
            <span className="text-xs text-gray-500 ml-2">
              {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
            </span>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-xs text-gray-400 ml-2">(edited)</span>
            )}
          </div>
          {isAuthenticated && user?.id === comment.user.id && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <CommentForm
            initialValue={comment.content}
            onSubmit={async (content) => {
              onUpdate({ ...comment, content });
              setIsEditing(false);
              return Promise.resolve();
            }}
            onCancel={() => setIsEditing(false)}
            submitLabel="Update"
          />
        ) : (
          <div>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
            {isAuthenticated && depth < maxDepth && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="text-blue-500 hover:text-blue-600 text-sm mt-2"
              >
                Reply
              </button>
            )}
          </div>
        )}

        {isReplying && (
          <div className="mt-4">
            <CommentForm
              onSubmit={async (content) => {
                // The parent component will handle creating the reply
                // We're just passing up the content and parent ID
                onUpdate({ 
                  ...comment, 
                  replies: { 
                    ...comment.replies,
                    items: [
                      ...(comment.replies?.items || []),
                      {
                        id: 'temp-' + Date.now(),
                        content,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        deletedAt: null,
                        user: user!
                      } as Comment
                    ],
                    total: (comment.replies?.total ?? 0) + 1,
                    hasMore: comment.replies?.hasMore ?? false
                  }
                });
                setIsReplying(false);
                return Promise.resolve();
              }}
              onCancel={() => setIsReplying(false)}
              submitLabel="Reply"
            />
          </div>
        )}
      </div>

      {comment.replies && comment.replies.items.length > 0 && (
        <div className={`ml-${Math.min(depth + 1, maxDepth) * 4} mt-2`}>
          {comment.replies.items.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onLoadMoreReplies={onLoadMoreReplies}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onRestore={onRestore}
              isAuthenticated={isAuthenticated}
              depth={depth + 1}
            />
          ))}
          {comment.replies.hasMore && (
            <button
              onClick={() => onLoadMoreReplies && onLoadMoreReplies(comment.id, comment.replies!.items.length)}
              className="text-blue-500 hover:text-blue-600 text-sm mt-2"
            >
              Load More Replies ({comment.replies.total - comment.replies.items.length} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
