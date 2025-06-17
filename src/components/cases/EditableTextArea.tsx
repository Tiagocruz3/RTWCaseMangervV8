import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

interface EditableTextAreaProps {
  value: string;
  onSave: (value: string) => void;
  label?: string;
  className?: string;
  rows?: number;
}

const EditableTextArea: React.FC<EditableTextAreaProps> = ({
  value,
  onSave,
  label,
  className = '',
  rows = 3
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="relative group">
        {label && (
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {label}
          </label>
        )}
        <div className="flex items-start">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={rows}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
          <div className="absolute right-0 flex space-x-1">
            <button
              onClick={handleSave}
              className="p-1 text-success-600 hover:text-success-700"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Press ⌘+Enter to save, Esc to cancel
        </p>
      </div>
    );
  }

  return (
    <div className="group relative">
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}
        </label>
      )}
      <div
        onClick={() => setIsEditing(true)}
        className={`cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 ${className}`}
      >
        {value}
      </div>
    </div>
  );
};

export default EditableTextArea;