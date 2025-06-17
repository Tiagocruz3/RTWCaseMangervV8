import React, { useState } from 'react';
import { X, Mail, Phone, Users, MessageSquare } from 'lucide-react';
import { useCaseStore } from '../../store/caseStore';
import { useAuthStore } from '../../store/authStore';
import { CommunicationType } from '../../types';

interface AddCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

const AddCommunicationModal: React.FC<AddCommunicationModalProps> = ({
  isOpen,
  onClose,
  caseId
}) => {
  const { addCommunication } = useCaseStore();
  const { user } = useAuthStore();
  const [type, setType] = useState<CommunicationType>('phone');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addCommunication(caseId, {
        type,
        content,
        date: new Date().toISOString(),
        author: user?.name || 'Unknown User'
      });

      setContent('');
      setType('phone');
      onClose();
    } catch (error) {
      console.error('Failed to add communication:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const communicationTypes: { type: CommunicationType; icon: React.ReactNode; label: string }[] = [
    { type: 'phone', icon: <Phone className="h-4 w-4" />, label: 'Phone Call' },
    { type: 'email', icon: <Mail className="h-4 w-4" />, label: 'Email' },
    { type: 'meeting', icon: <Users className="h-4 w-4" />, label: 'Meeting' },
    { type: 'other', icon: <MessageSquare className="h-4 w-4" />, label: 'Other' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Add Communication</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Communication Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {communicationTypes.map(({ type: commType, icon, label }) => (
                <button
                  key={commType}
                  type="button"
                  onClick={() => setType(commType)}
                  className={`flex items-center p-3 rounded-md border ${
                    type === commType
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {icon}
                  <span className="ml-2 text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Details
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              rows={4}
              placeholder="Enter communication details..."
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Communication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCommunicationModal;