import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { useCaseStore } from '../../store/caseStore';
import { format, parseISO } from 'date-fns';

interface EditKeyDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
}

const EditKeyDatesModal: React.FC<EditKeyDatesModalProps> = ({
  isOpen,
  onClose,
  caseData
}) => {
  const { updateCase } = useCaseStore();
  const [dates, setDates] = useState({
    injuryDate: format(parseISO(caseData.injuryDate), 'yyyy-MM-dd'),
    firstCertificateDate: format(parseISO(caseData.firstCertificateDate), 'yyyy-MM-dd'),
    plannedRtwDate: format(parseISO(caseData.plannedRtwDate), 'yyyy-MM-dd'),
    reviewDates: caseData.reviewDates.map(date => format(parseISO(date), 'yyyy-MM-dd'))
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateCase(caseData.id, {
        injuryDate: dates.injuryDate,
        firstCertificateDate: dates.firstCertificateDate,
        plannedRtwDate: dates.plannedRtwDate,
        reviewDates: dates.reviewDates
      });
      onClose();
    } catch (error) {
      console.error('Failed to update dates:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewDateChange = (index: number, value: string) => {
    setDates(prev => ({
      ...prev,
      reviewDates: prev.reviewDates.map((date, i) => i === index ? value : date)
    }));
  };

  const addReviewDate = () => {
    setDates(prev => ({
      ...prev,
      reviewDates: [...prev.reviewDates, format(new Date(), 'yyyy-MM-dd')]
    }));
  };

  const removeReviewDate = (index: number) => {
    setDates(prev => ({
      ...prev,
      reviewDates: prev.reviewDates.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center">
            <Calendar className="h-5 w-5 text-primary-500 mr-2" />
            Edit Key Dates
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="injuryDate" className="block text-sm font-medium text-gray-700 mb-1">
              Injury Date
            </label>
            <input
              type="date"
              id="injuryDate"
              value={dates.injuryDate}
              onChange={(e) => setDates(prev => ({ ...prev, injuryDate: e.target.value }))}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="firstCertificateDate" className="block text-sm font-medium text-gray-700 mb-1">
              First Certificate Date
            </label>
            <input
              type="date"
              id="firstCertificateDate"
              value={dates.firstCertificateDate}
              onChange={(e) => setDates(prev => ({ ...prev, firstCertificateDate: e.target.value }))}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="plannedRtwDate" className="block text-sm font-medium text-gray-700 mb-1">
              Planned RTW Date
            </label>
            <input
              type="date"
              id="plannedRtwDate"
              value={dates.plannedRtwDate}
              onChange={(e) => setDates(prev => ({ ...prev, plannedRtwDate: e.target.value }))}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Review Dates
              </label>
              <button
                type="button"
                onClick={addReviewDate}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                + Add Date
              </button>
            </div>
            <div className="space-y-2">
              {dates.reviewDates.map((date, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => handleReviewDateChange(index, e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeReviewDate(index)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
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
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditKeyDatesModal;