import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { StickyNote, Plus, Send } from 'lucide-react';
import { CaseNote } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface CaseNotesProps {
  notes: CaseNote[];
  onAddNote: (content: string) => void;
}

const CaseNotes: React.FC<CaseNotesProps> = ({ notes, onAddNote }) => {
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission from refreshing the page
    if (!newNote.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddNote(newNote.trim());
      setNewNote('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Note Button */}
      {!isAdding && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </button>
      )}

      {/* Add Note Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your note... (Press Enter to submit, Shift+Enter for new line)"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewNote('');
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newNote.trim() || isSubmitting}
              className="flex items-center px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-6">
            <StickyNote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No notes yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...notes].reverse().map((note) => (
              <div
                key={note.id}
                className="bg-gray-50 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{note.author}</span>
                  <span>{format(parseISO(note.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseNotes;