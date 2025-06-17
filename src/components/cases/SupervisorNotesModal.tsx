import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, User, Shield, Clock, AlertCircle, CheckCircle, Reply } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { useCaseStore } from '../../store/caseStore';
import { SupervisorNote } from '../../types';

interface SupervisorNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  workerName: string;
}

const SupervisorNotesModal: React.FC<SupervisorNotesModalProps> = ({
  isOpen,
  onClose,
  caseId,
  workerName
}) => {
  const { user } = useAuthStore();
  const { updateCase, getCase } = useCaseStore();
  const [notes, setNotes] = useState<SupervisorNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'instruction' | 'question' | 'general'>('general');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [requiresResponse, setRequiresResponse] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'instructions' | 'questions'>('all');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isOpen && caseId) {
      loadNotes();
    }
  }, [isOpen, caseId]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const caseData = await getCase(caseId);
      if (caseData?.supervisorNotes) {
        setNotes(caseData.supervisorNotes);
        // Mark notes as read by current user
        await markNotesAsRead(caseData.supervisorNotes);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Failed to load supervisor notes:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markNotesAsRead = async (notesToUpdate: SupervisorNote[]) => {
    if (!user?.id) return;

    const hasUnreadNotes = notesToUpdate.some(note => !note.readBy.includes(user.id));
    if (!hasUnreadNotes) return;

    const updatedNotes = notesToUpdate.map(note => {
      if (!note.readBy.includes(user.id)) {
        return {
          ...note,
          readBy: [...note.readBy, user.id]
        };
      }
      return note;
    });

    try {
      await updateCase(caseId, { supervisorNotes: updatedNotes });
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Failed to mark notes as read:', error);
    }
  };

  const handleSubmitNote = async () => {
    if (!newNote.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const note: SupervisorNote = {
        id: `note-${Date.now()}`,
        content: newNote.trim(),
        author: user.name,
        authorRole: user.role as 'admin' | 'consultant',
        createdAt: new Date().toISOString(),
        type: noteType,
        priority,
        status: requiresResponse ? 'open' : 'acknowledged',
        requiresResponse,
        readBy: [user.id]
      };

      const updatedNotes = [...notes, note];
      await updateCase(caseId, { supervisorNotes: updatedNotes });
      
      setNotes(updatedNotes);
      setNewNote('');
      setNoteType('general');
      setPriority('medium');
      setRequiresResponse(false);
    } catch (error) {
      console.error('Failed to add supervisor note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const reply: SupervisorNote = {
        id: `reply-${Date.now()}`,
        content: replyContent.trim(),
        author: user.name,
        authorRole: user.role as 'admin' | 'consultant',
        createdAt: new Date().toISOString(),
        type: 'reply',
        priority: 'medium',
        status: 'acknowledged',
        parentId,
        readBy: [user.id]
      };

      // Update parent note status if it was a question
      const updatedNotes = notes.map(note => {
        if (note.id === parentId && note.type === 'question') {
          return { ...note, status: 'resolved' as const };
        }
        return note;
      });

      const finalNotes = [...updatedNotes, reply];
      await updateCase(caseId, { supervisorNotes: finalNotes });
      
      setNotes(finalNotes);
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (noteId: string, newStatus: 'open' | 'acknowledged' | 'resolved') => {
    try {
      const updatedNotes = notes.map(note =>
        note.id === noteId ? { ...note, status: newStatus } : note
      );
      
      await updateCase(caseId, { supervisorNotes: updatedNotes });
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Failed to update note status:', error);
    }
  };

  const getFilteredNotes = () => {
    return notes.filter(note => {
      if (note.parentId) return false; // Don't show replies in main list
      
      switch (filter) {
        case 'open':
          return note.status === 'open';
        case 'instructions':
          return note.type === 'instruction';
        case 'questions':
          return note.type === 'question';
        default:
          return true;
      }
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getReplies = (noteId: string) => {
    return notes
      .filter(note => note.parentId === noteId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'medium':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-primary-600 bg-primary-50';
      case 'acknowledged':
        return 'text-warning-600 bg-warning-50';
      case 'resolved':
        return 'text-success-600 bg-success-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string, authorRole: string) => {
    if (authorRole === 'admin') {
      return <Shield className="h-4 w-4 text-primary-600" />;
    }
    
    switch (type) {
      case 'instruction':
        return <AlertCircle className="h-4 w-4 text-warning-600" />;
      case 'question':
        return <MessageSquare className="h-4 w-4 text-primary-600" />;
      case 'reply':
        return <Reply className="h-4 w-4 text-success-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredNotes = getFilteredNotes();
  const unreadCount = notes.filter(note => !note.readBy.includes(user?.id || '')).length;
  const openCount = notes.filter(note => note.status === 'open').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-primary-500" />
            <div>
              <h2 className="text-lg font-semibold">Supervisor Notes</h2>
              <p className="text-sm text-gray-500">
                Case: {workerName}
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded">
                    {unreadCount} unread
                  </span>
                )}
                {openCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-warning-100 text-warning-700 text-xs rounded">
                    {openCount} open
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Notes List */}
          <div className="flex-1 flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-sm rounded ${
                    filter === 'all' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All ({notes.filter(n => !n.parentId).length})
                </button>
                <button
                  onClick={() => setFilter('open')}
                  className={`px-3 py-1.5 text-sm rounded ${
                    filter === 'open' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Open ({openCount})
                </button>
                <button
                  onClick={() => setFilter('instructions')}
                  className={`px-3 py-1.5 text-sm rounded ${
                    filter === 'instructions' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Instructions ({notes.filter(n => n.type === 'instruction' && !n.parentId).length})
                </button>
                <button
                  onClick={() => setFilter('questions')}
                  className={`px-3 py-1.5 text-sm rounded ${
                    filter === 'questions' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Questions ({notes.filter(n => n.type === 'question' && !n.parentId).length})
                </button>
              </div>
            </div>

            {/* Notes Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No supervisor notes yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {isAdmin ? 'Add instructions or feedback for the case manager' : 'Ask questions or provide updates'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotes.map((note) => {
                    const replies = getReplies(note.id);
                    const isUnread = !note.readBy.includes(user?.id || '');
                    
                    return (
                      <div
                        key={note.id}
                        className={`border rounded-lg p-4 ${isUnread ? 'border-primary-200 bg-primary-50' : 'border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(note.type, note.authorRole)}
                            <span className="font-medium text-gray-900">{note.author}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(note.priority)}`}>
                              {note.priority}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(note.status)}`}>
                              {note.status}
                            </span>
                            {note.requiresResponse && (
                              <span className="px-2 py-0.5 text-xs bg-warning-100 text-warning-700 rounded">
                                Response Required
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {format(parseISO(note.createdAt), 'dd/MM/yyyy HH:mm')}
                            </span>
                            {(isAdmin || note.authorRole === 'consultant') && note.status !== 'resolved' && (
                              <select
                                value={note.status}
                                onChange={(e) => handleStatusChange(note.id, e.target.value as any)}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="open">Open</option>
                                <option value="acknowledged">Acknowledged</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                        </div>

                        {/* Replies */}
                        {replies.length > 0 && (
                          <div className="ml-6 space-y-3 border-l-2 border-gray-200 pl-4">
                            {replies.map((reply) => (
                              <div key={reply.id} className="bg-gray-50 rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    {getTypeIcon(reply.type, reply.authorRole)}
                                    <span className="text-sm font-medium">{reply.author}</span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {format(parseISO(reply.createdAt), 'dd/MM/yyyy HH:mm')}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Form */}
                        {replyingTo === note.id ? (
                          <div className="mt-3 ml-6 border-l-2 border-primary-200 pl-4">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write your reply..."
                              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                              rows={3}
                            />
                            <div className="flex justify-end space-x-2 mt-2">
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent('');
                                }}
                                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSubmitReply(note.id)}
                                disabled={!replyContent.trim() || isSubmitting}
                                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                              >
                                <div className="flex items-center">
                                  <Send className="h-3 w-3 mr-1" />
                                  Reply
                                </div>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => setReplyingTo(note.id)}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              <div className="flex items-center">
                                <Reply className="h-3 w-3 mr-1" />
                                Reply
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Add Note Panel */}
          <div className="w-96 border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">
                {isAdmin ? 'Add Supervisor Note' : 'Add Note or Question'}
              </h3>
            </div>
            
            <div className="flex-1 p-4 space-y-4">
              {/* Note Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="space-y-2">
                  {isAdmin && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="noteType"
                        value="instruction"
                        checked={noteType === 'instruction'}
                        onChange={(e) => setNoteType(e.target.value as any)}
                        className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">Instruction</span>
                    </label>
                  )}
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="noteType"
                      value="question"
                      checked={noteType === 'question'}
                      onChange={(e) => setNoteType(e.target.value as any)}
                      className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm">Question</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="noteType"
                      value="general"
                      checked={noteType === 'general'}
                      onChange={(e) => setNoteType(e.target.value as any)}
                      className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm">General Note</span>
                  </label>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Requires Response */}
              {(isAdmin || noteType === 'question') && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={requiresResponse}
                      onChange={(e) => setRequiresResponse(e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm">Requires response</span>
                  </label>
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={
                    noteType === 'instruction' 
                      ? 'Provide instructions for the case manager...'
                      : noteType === 'question'
                      ? 'Ask a question about this case...'
                      : 'Add a note about this case...'
                  }
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                  rows={6}
                />
              </div>

              <button
                onClick={handleSubmitNote}
                disabled={!newNote.trim() || isSubmitting}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Send className="h-4 w-4 mr-2" />
                    Add Note
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorNotesModal;