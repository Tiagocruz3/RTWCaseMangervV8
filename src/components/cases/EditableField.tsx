import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

interface EditableFieldProps {
  value: string;
  onSave: (value: string) => void;
  label?: string;
  type?: 'text' | 'email' | 'tel' | 'date';
  className?: string;
  disabled?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  label,
  type = 'text',
  className = '',
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
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
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing && !disabled) {
    return (
      <div className="relative group">
        {label && (
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {label}
          </label>
        )}
        <div className="flex items-center">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
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
        onClick={() => !disabled && setIsEditing(true)}
        className={`cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {value}
      </div>
    </div>
  );
};

export default EditableField;