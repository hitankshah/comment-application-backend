import React, { useState } from 'react';

interface CommentFormProps {
  initialValue?: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function CommentForm({ initialValue = '', onSubmit, onCancel, submitLabel = 'Post' }: CommentFormProps) {
  const [content, setContent] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!content.trim()) {
      setError('Comment cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit comment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        className="w-full p-2 border rounded focus:outline-none focus:ring"
        rows={3}
        value={content}
        onChange={e => setContent(e.target.value)}
        disabled={loading}
        placeholder="Write your comment..."
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Posting...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
