import React, { useState } from 'react';
import { Calendar, Plus, X, Bell, AlertTriangle, Clock, CheckCircle, Edit3 } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, addDays, addWeeks, addMonths } from 'date-fns';
import { useCaseStore } from '../../store/caseStore';

interface ReviewDatesManagerProps {
  caseId: string;
  reviewDates: string[];
  onUpdate?: () => void;
}

interface ReviewDateEntry {
  id: string;
  date: string;
  type: 'initial' | 'follow-up' | 'final' | 'medical' | 'rtw' | 'custom';
  description: string;
  completed: boolean;
  reminderSent: boolean;
  createdAt: string;
}

const ReviewDatesManager: React.FC<ReviewDatesManagerProps> = ({ caseId, reviewDates, onUpdate }) => {
  const { updateCase } = useCaseStore();
  const [isAddingDate, setIsAddingDate] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [newDate, setNewDate] = useState({
    date: format(addWeeks(new Date(), 2), 'yyyy-MM-dd'),
    type: 'follow-up' as ReviewDateEntry['type'],
    description: ''
  });

  // Convert simple date strings to full review date entries
  const reviewEntries: ReviewDateEntry[] = reviewDates.map((date, index) => ({
    id: `review-${index}`,
    date,
    type: index === 0 ? 'initial' : 'follow-up',
    description: index === 0 ? 'Initial RTW review' : `Follow-up review ${index}`,
    completed: isPast(parseISO(date)),
    reminderSent: false,
    createdAt: new Date().toISOString()
  }));

  const handleAddDate = async () => {
    if (!newDate.date) return;

    const updatedDates = [...reviewDates, newDate.date].sort();
    
    try {
      await updateCase(caseId, { reviewDates: updatedDates });
      setIsAddingDate(false);
      setNewDate({
        date: format(addWeeks(new Date(), 2), 'yyyy-MM-dd'),
        type: 'follow-up',
        description: ''
      });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to add review date:', error);
    }
  };

  const handleRemoveDate = async (dateToRemove: string) => {
    const updatedDates = reviewDates.filter(date => date !== dateToRemove);
    
    try {
      await updateCase(caseId, { reviewDates: updatedDates });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to remove review date:', error);
    }
  };

  const handleUpdateDate = async (oldDate: string, newDateValue: string) => {
    const updatedDates = reviewDates.map(date => 
      date === oldDate ? newDateValue : date
    ).sort();
    
    try {
      await updateCase(caseId, { reviewDates: updatedDates });
      setEditingDate(null);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update review date:', error);
    }
  };

  const getDateStatus = (date: string) => {
    const dateObj = parseISO(date);
    if (isPast(dateObj)) return 'overdue';
    if (isToday(dateObj)) return 'today';
    if (isTomorrow(dateObj)) return 'tomorrow';
    return 'upcoming';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'today':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'tomorrow':
        return 'text-primary-600 bg-primary-50 border-primary-200';
      case 'upcoming':
        return 'text-success-600 bg-success-50 border-success-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'today':
        return <Bell className="h-4 w-4" />;
      case 'tomorrow':
        return <Clock className="h-4 w-4" />;
      case 'upcoming':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const generateQuickDates = () => [
    { label: '1 Week', date: format(addWeeks(new Date(), 1), 'yyyy-MM-dd') },
    { label: '2 Weeks', date: format(addWeeks(new Date(), 2), 'yyyy-MM-dd') },
    { label: '1 Month', date: format(addMonths(new Date(), 1), 'yyyy-MM-dd') },
    { label: '3 Months', date: format(addMonths(new Date(), 3), 'yyyy-MM-dd') }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <Calendar className="h-4 w-4 text-primary-500 mr-2" />
          Review Dates ({reviewEntries.length})
        </h3>
        <button
          onClick={() => setIsAddingDate(true)}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Date
        </button>
      </div>

      {/* Review Dates List */}
      <div className="space-y-2">
        {reviewEntries.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No review dates scheduled
          </div>
        ) : (
          reviewEntries.map((entry) => {
            const status = getDateStatus(entry.date);
            const isEditing = editingDate === entry.date;
            
            return (
              <div
                key={entry.id}
                className={`p-3 rounded-lg border ${getStatusColor(status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status)}
                    <div>
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="date"
                            defaultValue={entry.date}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                            onBlur={(e) => {
                              if (e.target.value !== entry.date) {
                                handleUpdateDate(entry.date, e.target.value);
                              } else {
                                setEditingDate(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateDate(entry.date, e.currentTarget.value);
                              } else if (e.key === 'Escape') {
                                setEditingDate(null);
                              }
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium">
                            {format(parseISO(entry.date), 'EEEE, dd MMMM yyyy')}
                          </p>
                          <p className="text-xs opacity-75">
                            {entry.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {status === 'overdue' && (
                      <span className="text-xs font-medium text-error-600">
                        Overdue
                      </span>
                    )}
                    {status === 'today' && (
                      <span className="text-xs font-medium text-warning-600">
                        Today
                      </span>
                    )}
                    {status === 'tomorrow' && (
                      <span className="text-xs font-medium text-primary-600">
                        Tomorrow
                      </span>
                    )}
                    
                    <button
                      onClick={() => setEditingDate(isEditing ? null : entry.date)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleRemoveDate(entry.date)}
                      className="p-1 text-gray-400 hover:text-error-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Date Form */}
      {isAddingDate && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Add Review Date</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={newDate.date}
                onChange={(e) => setNewDate(prev => ({ ...prev, date: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Quick Date Options */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Quick Options
              </label>
              <div className="flex flex-wrap gap-2">
                {generateQuickDates().map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setNewDate(prev => ({ ...prev, date: option.date }))}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={newDate.type}
                onChange={(e) => setNewDate(prev => ({ ...prev, type: e.target.value as ReviewDateEntry['type'] }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              >
                <option value="initial">Initial Review</option>
                <option value="follow-up">Follow-up Review</option>
                <option value="medical">Medical Review</option>
                <option value="rtw">RTW Assessment</option>
                <option value="final">Final Review</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newDate.description}
                onChange={(e) => setNewDate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Review purpose or notes..."
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setIsAddingDate(false)}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDate}
              disabled={!newDate.date}
              className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              Add Date
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {reviewEntries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-200">
          <div className="text-center">
            <div className="text-lg font-bold text-error-600">
              {reviewEntries.filter(e => getDateStatus(e.date) === 'overdue').length}
            </div>
            <div className="text-xs text-gray-500">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-warning-600">
              {reviewEntries.filter(e => ['today', 'tomorrow'].includes(getDateStatus(e.date))).length}
            </div>
            <div className="text-xs text-gray-500">Due Soon</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-success-600">
              {reviewEntries.filter(e => getDateStatus(e.date) === 'upcoming').length}
            </div>
            <div className="text-xs text-gray-500">Upcoming</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-600">
              {reviewEntries.filter(e => e.completed).length}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDatesManager;