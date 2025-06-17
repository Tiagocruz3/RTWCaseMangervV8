import React, { useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, X, Save, Calendar, FileText, User } from 'lucide-react';
import { Case, CaseStatus } from '../../types';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';

interface CaseStatusManagerProps {
  caseData: Case;
  onStatusUpdate: (status: CaseStatus, outcome?: CaseOutcome) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface CaseOutcome {
  id: string;
  status: CaseStatus;
  outcome: string;
  reason: string;
  details: string;
  effectiveDate: string;
  rtwDate?: string;
  finalPIAWE?: number;
  totalCosts?: number;
  durationWeeks?: number;
  successfulRTW: boolean;
  followUpRequired: boolean;
  followUpDate?: string;
  notes: string;
  completedBy: string;
  completedAt: string;
}

const CaseStatusManager: React.FC<CaseStatusManagerProps> = ({
  caseData,
  onStatusUpdate,
  isOpen,
  onClose
}) => {
  const { user } = useAuthStore();
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>(caseData.status);
  const [outcome, setOutcome] = useState({
    outcome: '',
    reason: '',
    details: '',
    effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    rtwDate: '',
    finalPIAWE: caseData.piaweCalculation?.finalPIAWE || 0,
    totalCosts: 0,
    durationWeeks: 0,
    successfulRTW: false,
    followUpRequired: false,
    followUpDate: '',
    notes: ''
  });

  if (!isOpen) return null;

  const statusOptions = [
    {
      value: 'open' as CaseStatus,
      label: 'Open',
      description: 'Case is active and being managed',
      icon: <Clock className="h-5 w-5 text-success-600" />,
      color: 'border-success-200 bg-success-50'
    },
    {
      value: 'pending' as CaseStatus,
      label: 'Pending',
      description: 'Case is on hold awaiting action or information',
      icon: <AlertTriangle className="h-5 w-5 text-warning-600" />,
      color: 'border-warning-200 bg-warning-50'
    },
    {
      value: 'closed' as CaseStatus,
      label: 'Closed',
      description: 'Case has been completed and closed',
      icon: <CheckCircle className="h-5 w-5 text-gray-600" />,
      color: 'border-gray-200 bg-gray-50'
    }
  ];

  const outcomeOptions = {
    closed: [
      'Successful RTW - Full Duties',
      'Successful RTW - Modified Duties',
      'Medical Retirement',
      'Voluntary Resignation',
      'Termination - Other Reasons',
      'Claim Withdrawn',
      'Claim Rejected',
      'Settlement Reached',
      'Legal Resolution',
      'Other'
    ],
    pending: [
      'Awaiting Medical Assessment',
      'Awaiting Employer Response',
      'Awaiting Legal Advice',
      'Awaiting Worker Response',
      'Awaiting Specialist Report',
      'Awaiting FCE Results',
      'Awaiting Workplace Assessment',
      'Administrative Hold',
      'Other'
    ]
  };

  const reasonOptions = {
    closed: [
      'RTW goals achieved',
      'Worker returned to pre-injury capacity',
      'Medical condition stabilized',
      'Alternative employment secured',
      'Worker chose not to return',
      'Employer unable to accommodate',
      'Medical advice against RTW',
      'Legal settlement completed',
      'Claim disputed/rejected',
      'Other circumstances'
    ],
    pending: [
      'Waiting for medical clearance',
      'Employer reviewing accommodation options',
      'Legal proceedings in progress',
      'Worker non-responsive',
      'Additional assessments required',
      'Workplace modifications needed',
      'Insurance review pending',
      'Administrative processing',
      'Other'
    ]
  };

  const handleSubmit = () => {
    const caseOutcome: CaseOutcome = {
      id: `outcome-${Date.now()}`,
      status: selectedStatus,
      outcome: outcome.outcome,
      reason: outcome.reason,
      details: outcome.details,
      effectiveDate: outcome.effectiveDate,
      rtwDate: outcome.rtwDate || undefined,
      finalPIAWE: outcome.finalPIAWE || undefined,
      totalCosts: outcome.totalCosts || undefined,
      durationWeeks: outcome.durationWeeks || undefined,
      successfulRTW: outcome.successfulRTW,
      followUpRequired: outcome.followUpRequired,
      followUpDate: outcome.followUpDate || undefined,
      notes: outcome.notes,
      completedBy: user?.name || 'Unknown User',
      completedAt: new Date().toISOString()
    };

    onStatusUpdate(selectedStatus, caseOutcome);
    onClose();
  };

  const calculateDuration = () => {
    if (outcome.rtwDate && caseData.injuryDate) {
      const injuryDate = new Date(caseData.injuryDate);
      const rtwDate = new Date(outcome.rtwDate);
      const diffTime = Math.abs(rtwDate.getTime() - injuryDate.getTime());
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      setOutcome(prev => ({ ...prev, durationWeeks: diffWeeks }));
    }
  };

  const isClosureStatus = selectedStatus === 'closed';
  const isPendingStatus = selectedStatus === 'pending';
  const requiresOutcome = isClosureStatus || isPendingStatus;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold">Update Case Status</h2>
            <p className="text-sm text-gray-500">
              {caseData.worker.firstName} {caseData.worker.lastName} - {caseData.claimNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Current Status</h3>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                caseData.status === 'open' ? 'bg-success-100 text-success-700' :
                caseData.status === 'pending' ? 'bg-warning-100 text-warning-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                Since: {format(new Date(caseData.updatedAt), 'dd MMM yyyy')}
              </span>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Select New Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedStatus === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : option.color
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {option.icon}
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Outcome Details */}
          {requiresOutcome && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">
                {isClosureStatus ? 'Closure Details' : 'Pending Details'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isClosureStatus ? 'Closure Outcome' : 'Pending Reason'}
                  </label>
                  <select
                    value={outcome.outcome}
                    onChange={(e) => setOutcome(prev => ({ ...prev, outcome: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select outcome...</option>
                    {(isClosureStatus ? outcomeOptions.closed : outcomeOptions.pending).map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Reason
                  </label>
                  <select
                    value={outcome.reason}
                    onChange={(e) => setOutcome(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select reason...</option>
                    {(isClosureStatus ? reasonOptions.closed : reasonOptions.pending).map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={outcome.effectiveDate}
                    onChange={(e) => setOutcome(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                    required
                  />
                </div>

                {isClosureStatus && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RTW Date (if applicable)
                    </label>
                    <input
                      type="date"
                      value={outcome.rtwDate}
                      onChange={(e) => {
                        setOutcome(prev => ({ ...prev, rtwDate: e.target.value }));
                        setTimeout(calculateDuration, 100);
                      }}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {isPendingStatus && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Resolution Date
                    </label>
                    <input
                      type="date"
                      value={outcome.followUpDate}
                      onChange={(e) => setOutcome(prev => ({ ...prev, followUpDate: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              {isClosureStatus && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Final PIAWE
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={outcome.finalPIAWE}
                      onChange={(e) => setOutcome(prev => ({ ...prev, finalPIAWE: parseFloat(e.target.value) || 0 }))}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Costs
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={outcome.totalCosts}
                      onChange={(e) => setOutcome(prev => ({ ...prev, totalCosts: parseFloat(e.target.value) || 0 }))}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (Weeks)
                    </label>
                    <input
                      type="number"
                      value={outcome.durationWeeks}
                      onChange={(e) => setOutcome(prev => ({ ...prev, durationWeeks: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                      placeholder="0"
                      readOnly={!!outcome.rtwDate}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Details
                </label>
                <textarea
                  value={outcome.details}
                  onChange={(e) => setOutcome(prev => ({ ...prev, details: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                  rows={3}
                  placeholder={`Provide additional details about the ${isClosureStatus ? 'closure' : 'pending status'}...`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={outcome.notes}
                  onChange={(e) => setOutcome(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Internal notes for case management..."
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                {isClosureStatus && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={outcome.successfulRTW}
                      onChange={(e) => setOutcome(prev => ({ ...prev, successfulRTW: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Successful Return to Work achieved
                    </span>
                  </label>
                )}

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={outcome.followUpRequired}
                    onChange={(e) => setOutcome(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Follow-up required
                  </span>
                </label>

                {outcome.followUpRequired && !isPendingStatus && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={outcome.followUpDate}
                      onChange={(e) => setOutcome(prev => ({ ...prev, followUpDate: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {requiresOutcome && outcome.outcome && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Status:</strong> {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}</p>
                <p><strong>Outcome:</strong> {outcome.outcome}</p>
                <p><strong>Reason:</strong> {outcome.reason}</p>
                <p><strong>Effective Date:</strong> {format(new Date(outcome.effectiveDate), 'dd MMM yyyy')}</p>
                {outcome.rtwDate && (
                  <p><strong>RTW Date:</strong> {format(new Date(outcome.rtwDate), 'dd MMM yyyy')}</p>
                )}
                {outcome.durationWeeks > 0 && (
                  <p><strong>Duration:</strong> {outcome.durationWeeks} weeks</p>
                )}
                {outcome.followUpRequired && (
                  <p><strong>Follow-up Required:</strong> Yes</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={requiresOutcome && (!outcome.outcome || !outcome.reason)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center">
              <Save className="h-4 w-4 mr-2" />
              Update Status
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseStatusManager;