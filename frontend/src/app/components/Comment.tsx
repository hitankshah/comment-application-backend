'use client';
import { useState } from 'react';
import api from '../api/axios';
import useSocket from '../hooks/useSocket';

interface CommentProps {
  comment: any;
  onUpdate: (comment: any) => void;
  onDelete: (id: string) => void;
}

export function Comment({ comment, onUpdate, onDelete }: CommentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleEdit = async () => {
    try {
      await api.patch(`/comments/${comment.id}`, { content });
      onUpdate({ ...comment, content });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleReply = async () => {
    try {
      const response = await api.post('/comments', {
        content: replyContent,
        parentId: comment.id,
      });
      onUpdate(response.data);
      setIsReplying(false);
      setReplyContent('');
    } catch (error) {
      console.error('Failed to reply:', error);
    }
  };

  return (
    <div className="border-l-2 border-gray-200 pl-4 my-2">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <div className="space-x-2">
            <button onClick={handleEdit} className="bg-blue-500 text-white px-3 py-1 rounded">
              Save
            </button>
            <button onClick={() => setIsEditing(false)} className="bg-gray-500 text-white px-3 py-1 rounded">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p>{comment.content}</p>
          <div className="space-x-2">
            <button onClick={() => setIsEditing(true)} className="text-blue-500">
              Edit
            </button>
            <button onClick={() => setIsReplying(!isReplying)} className="text-green-500">
              Reply
            </button>
            <button onClick={() => onDelete(comment.id)} className="text-red-500">
              Delete
            </button>
          </div>
        </div>
      )}
      
      {isReplying && (
        <div className="mt-2 space-y-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Write a reply..."
          />
          <div className="space-x-2">
            <button onClick={handleReply} className="bg-green-500 text-white px-3 py-1 rounded">
              Submit
            </button>
            <button onClick={() => setIsReplying(false)} className="bg-gray-500 text-white px-3 py-1 rounded">
              Cancel
            </button>
          </div>
        </div>
      )}

      {comment.replies?.map((reply: any) => (
        <Comment
          key={reply.id}
          comment={reply}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
