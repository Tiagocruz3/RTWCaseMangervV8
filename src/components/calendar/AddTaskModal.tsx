import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useCaseStore } from '../../store/caseStore';
import { Case } from '../../types';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, selectedDate }) => {
  const { cases, updateCase } = useCaseStore();
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const caseToUpdate = cases.find(c => c.id === selectedCase);
    if (!caseToUpdate) return;
    
    const newTask = {
      id: `t${Date.now()}`,
      title: taskTitle,
      description: taskDescription,
      dueDate: selectedDate.toISOString().split('T')[0],
      completed: false
    };
    
    const updatedRtwPlan = {
      ...caseToUpdate.rtwPlan,
      tasks: [...caseToUpdate.rtwPlan.tasks, newTask]
    };
    
    await updateCase(selectedCase, {
      rtwPlan: updatedRtwPlan
    });
    
    onClose();
    setSelectedCase('');
    setTaskTitle('');
    setTaskDescription('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Add Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Case
            </label>
            <select
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
              required
            >
              <option value="">Select a case...</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.worker.firstName} {c.worker.lastName} - {c.claimNumber}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
              rows={3}
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
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;