'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { CommentList } from '../components/CommentList';
import CommentForm from '@/app/components/CommentForm';
import useSocket from '@/app/hooks/useSocket';
import { NotificationBell } from '../components/NotificationBell';
import type { Comment } from '@/app/types/Comment';
import api from '@/app/api/axios';

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketError, setSocketError] = useState('');
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isLoading, isAuthenticated]);

  // Fetch comments on load
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      fetchComments();
    }
  }, [isLoading, isAuthenticated]);

  // WebSocket connection for real-time updates
  const { socket, isConnected, on, off, emit } = useSocket('/comments');

  useEffect(() => {
    if (isConnected) {
      on('commentUpdate', handleCommentUpdate);
      // Add other event listeners as needed
    }

    return () => {
      off('commentUpdate', handleCommentUpdate);
      // Remove other event listeners
    };
  }, [isConnected, on, off]);

  function handleCommentCreate(newComment: Comment) {
    // For top-level comments
    if (!newComment.parentId) {
      setComments(prev => [newComment, ...prev]);
      return;
    }
    // For nested replies
    setComments(prev => 
      prev.map(comment => {
        if (comment.id === newComment.parentId) {
          return {
            ...comment,
            replies: comment.replies
              ? {
                  ...comment.replies,
                  items: [...comment.replies.items, newComment],
                  total: comment.replies.total + 1,
                }
              : { items: [newComment], total: 1, hasMore: false }
          };
        }
        // Recursively check for nested replies
        return updateNestedReplies(comment, newComment);
      })
    );
  }

  function updateNestedReplies(comment: Comment, newReply: Comment): Comment {
    if (!comment.replies) return comment;
    const updatedReplies = comment.replies.items.map(reply => {
      if (reply.id === newReply.parentId) {
        return {
          ...reply,
          replies: reply.replies
            ? {
                ...reply.replies,
                items: [...reply.replies.items, newReply],
                total: reply.replies.total + 1,
              }
            : { items: [newReply], total: 1, hasMore: false }
        };
      }
      return updateNestedReplies(reply, newReply);
    });
    return {
      ...comment,
      replies: {
        ...comment.replies,
        items: updatedReplies,
      },
    };
  }

  function handleCommentUpdate(updatedComment: Comment) {
    setComments(prev => updateCommentInTree(prev, updatedComment));
  }

  function updateCommentInTree(comments: Comment[], updatedComment: Comment): Comment[] {
    return comments.map(comment => {
      if (comment.id === updatedComment.id) {
        return { ...comment, ...updatedComment };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: {
            ...comment.replies,
            items: updateCommentInTree(comment.replies.items, updatedComment),
          },
        };
      }
      return comment;
    });
  }

  function handleCommentDelete(commentId: string) {
    setComments(prev => markCommentAsDeleted(prev, commentId));
  }

  function markCommentAsDeleted(comments: Comment[], commentId: string): Comment[] {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, deletedAt: new Date().toISOString() };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: {
            ...comment.replies,
            items: markCommentAsDeleted(comment.replies.items, commentId),
          },
        };
      }
      return comment;
    });
  }

  function handleCommentRestore(restoredComment: Comment) {
    setComments(prev => updateCommentInTree(prev, {
      ...restoredComment,
      deletedAt: null // set to null instead of undefined
    }));
  }

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/comments');
      // Ensure replies are always objects with items, total, hasMore
      const normalizeReplies = (comment: Comment): Comment => ({
        ...comment,
        replies: comment.replies
          ? {
              items: comment.replies.items.map(normalizeReplies),
              total: comment.replies.total,
              hasMore: comment.replies.hasMore,
            }
          : { items: [], total: 0, hasMore: false },
      });
      setComments(response.data.map(normalizeReplies));
    } catch (err: any) {
      setError(err.message || 'Failed to load comments. Please try again later.');
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await api.post('/comments', { content });
      
      // Optimistically add the comment even if real-time updates fail
      if (!isConnected) {
        handleCommentCreate(response.data);
      }
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError(err.message || 'Failed to post comment. Please try again.');
    }
  };

  // If still loading auth state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">Discussion Thread</h1>
        <div className="flex items-center space-x-4">
          <NotificationBell />
          {user && <div className="text-sm">Welcome, {user.email}</div>}
          {!isConnected && (
            <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
              <span className="inline-block h-2 w-2 bg-yellow-500 rounded-full mr-1"></span>
              Offline Mode
            </div>
          )}
        </div>
      </div>

      {socketError && (
        <div className="mb-4 p-2 bg-yellow-50 text-yellow-700 text-sm rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {socketError}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-2">Add Comment</h2>
        <CommentForm onSubmit={handleAddComment} />
      </div>
      
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin inline-block rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p>Loading comments...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
          <button 
            onClick={fetchComments}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-lg font-medium">{comments.length} Comment{comments.length !== 1 && 's'}</h2>
          <CommentList 
            comments={comments}
            onUpdate={handleCommentUpdate}
            onDelete={handleCommentDelete}
            onRestore={handleCommentRestore}
          />
        </div>
      )}
    </div>
  );
}
