import React, { useState } from 'react';
import { FileText, Download, Calendar, User, BarChart3, Filter, Search } from 'lucide-react';
import { useCaseStore } from '../store/caseStore';
import { useFormattedDate } from '../hooks/useFormattedDate';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface ReportFilters {
  caseId: string;
  dateRange: 'week' | 'month' | 'quarter' | 'custom';
  startDate: string;
  endDate: string;
  status: 'all' | 'open' | 'closed' | 'pending';
  consultant: string;
}

const Reports = () => {
  const { cases } = useCaseStore();
  const { formatDate } = useFormattedDate();
  const [filters, setFilters] = useState<ReportFilters>({
    caseId: '',
    dateRange: 'month',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    status: 'all',
    consultant: 'all'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      const selectedCase = cases.find(c => c.id === filters.caseId);
      if (!selectedCase) return;

      const reportData = {
        case: selectedCase,
        generatedAt: new Date().toISOString(),
        filters,
        summary: {
          totalCommunications: selectedCase.communications.length,
          totalDocuments: selectedCase.documents.length,
          totalTasks: selectedCase.rtwPlan.tasks.length,
          completedTasks: selectedCase.rtwPlan.tasks.filter(t => t.completed).length,
          reviewDates: selectedCase.reviewDates.length
        }
      };

      // Generate comprehensive report content
      const reportContent = `
CASE MANAGEMENT REPORT
Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}

CASE INFORMATION
================
Worker: ${selectedCase.worker.firstName} ${selectedCase.worker.lastName}
Position: ${selectedCase.worker.position}
Employer: ${selectedCase.employer.name}
Claim Number: ${selectedCase.claimNumber}
Injury Date: ${formatDate(selectedCase.injuryDate)}
Status: ${selectedCase.status.toUpperCase()}

INJURY DETAILS
==============
Description: ${selectedCase.injuryDescription}
First Certificate Date: ${formatDate(selectedCase.firstCertificateDate)}
Planned RTW Date: ${formatDate(selectedCase.plannedRtwDate)}

RETURN TO WORK PLAN
==================
Title: ${selectedCase.rtwPlan.title}
Start Date: ${formatDate(selectedCase.rtwPlan.startDate)}
End Date: ${formatDate(selectedCase.rtwPlan.endDate)}
Status: ${selectedCase.rtwPlan.status.toUpperCase()}

Goals:
${selectedCase.rtwPlan.goals.map(goal => `• ${goal}`).join('\n')}

Tasks (${reportData.summary.completedTasks}/${reportData.summary.totalTasks} completed):
${selectedCase.rtwPlan.tasks.map(task => 
  `• ${task.title} - Due: ${formatDate(task.dueDate)} - ${task.completed ? 'COMPLETED' : 'PENDING'}`
).join('\n')}

COMMUNICATIONS LOG
==================
Total Communications: ${reportData.summary.totalCommunications}

${selectedCase.communications.map(comm => 
  `${formatDate(comm.date)} - ${comm.type.toUpperCase()}
  Author: ${comm.author}
  Content: ${comm.content}
  `
).join('\n')}

REVIEW DATES
============
${selectedCase.reviewDates.map(date => `• ${formatDate(date)}`).join('\n')}

DOCUMENTS
=========
Total Documents: ${reportData.summary.totalDocuments}
${selectedCase.documents.map(doc => 
  `• ${doc.name} (${Math.round(doc.size / 1024)}KB) - Uploaded: ${formatDate(doc.uploadDate)}`
).join('\n')}

STAKEHOLDERS
============
${selectedCase.stakeholders?.map(stakeholder => 
  `• ${stakeholder.name} (${stakeholder.type})
    Organization: ${stakeholder.organization || 'N/A'}
    Phone: ${stakeholder.phone}
    Email: ${stakeholder.email || 'N/A'}
    ${stakeholder.isPrimary ? '[PRIMARY CONTACT]' : ''}
  `
).join('\n') || 'No stakeholders recorded'}

CASE NOTES
==========
${selectedCase.notes?.map(note => 
  `${formatDate(note.createdAt)} - ${note.author}
  ${note.content}
  `
).join('\n') || 'No case notes recorded'}

PIAWE CALCULATION
================
${selectedCase.piaweCalculation ? `
Final PIAWE: $${selectedCase.piaweCalculation.finalPIAWE.toFixed(2)}
Method: ${selectedCase.piaweCalculation.methodUsed}
Jurisdiction: ${selectedCase.piaweCalculation.jurisdiction}
Calculation Date: ${formatDate(selectedCase.piaweCalculation.calculationDate)}

52-Week Period:
- Total Earnings: $${selectedCase.piaweCalculation.calculations.period52Week.totalEarnings.toFixed(2)}
- Included Weeks: ${selectedCase.piaweCalculation.calculations.period52Week.includedWeeks}
- Average Weekly: $${selectedCase.piaweCalculation.calculations.period52Week.averageWeekly.toFixed(2)}

13-Week Period:
- Total Earnings: $${selectedCase.piaweCalculation.calculations.period13Week.totalEarnings.toFixed(2)}
- Included Weeks: ${selectedCase.piaweCalculation.calculations.period13Week.includedWeeks}
- Average Weekly: $${selectedCase.piaweCalculation.calculations.period13Week.averageWeekly.toFixed(2)}
` : 'PIAWE calculation not completed'}

CASE OUTCOME
============
${(selectedCase as any).outcome ? `
Outcome: ${(selectedCase as any).outcome.outcome}
Effective Date: ${formatDate((selectedCase as any).outcome.effectiveDate)}
Completed By: ${(selectedCase as any).outcome.completedBy}
${(selectedCase as any).outcome.rtwDate ? `RTW Date: ${formatDate((selectedCase as any).outcome.rtwDate)}` : ''}
${(selectedCase as any).outcome.durationWeeks ? `Duration: ${(selectedCase as any).outcome.durationWeeks} weeks` : ''}
Details: ${(selectedCase as any).outcome.details || 'No additional details'}
` : 'Case ongoing - no outcome recorded'}

REPORT SUMMARY
==============
This comprehensive case report was generated on ${format(new Date(), 'dd/MM/yyyy')} at ${format(new Date(), 'HH:mm')}.
The case is currently ${selectedCase.status.toUpperCase()} with ${reportData.summary.completedTasks} of ${reportData.summary.totalTasks} RTW plan tasks completed.
${reportData.summary.totalCommunications} communications have been logged and ${reportData.summary.totalDocuments} documents are on file.

Generated by RTW Case Management System
      `;

      // Create and download the report
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Case-Report-${selectedCase.claimNumber}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const uniqueConsultants = Array.from(new Set(cases.map(c => ({ id: c.consultant, name: c.caseManager.name }))));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center">
          <FileText className="h-6 w-6 text-primary-500 mr-2" />
          Reports
        </h1>
        <p className="text-gray-600">Generate comprehensive case reports and analytics</p>
      </div>

      {/* Report Generation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Generate Case Report</h2>
          <p className="text-gray-600 text-sm mt-1">Create detailed reports for individual cases</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Case Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Case *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filters.caseId}
                onChange={(e) => setFilters(prev => ({ ...prev, caseId: e.target.value }))}
                className="w-full pl-10 rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              >
                <option value="">Select a case to generate report...</option>
                {cases.map((caseItem) => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.worker.firstName} {caseItem.worker.lastName} - {caseItem.claimNumber} ({caseItem.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Case Preview */}
          {filters.caseId && (
            <div className="bg-gray-50 rounded-lg p-4">
              {(() => {
                const selectedCase = cases.find(c => c.id === filters.caseId);
                if (!selectedCase) return null;
                
                return (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Selected Case Preview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Worker:</span>
                        <p className="font-medium">{selectedCase.worker.firstName} {selectedCase.worker.lastName}</p>
                        <p className="text-gray-600">{selectedCase.worker.position}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Employer:</span>
                        <p className="font-medium">{selectedCase.employer.name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <div className="mt-1">
                          <StatusBadge status={selectedCase.status} type="case" />
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Claim Number:</span>
                        <p className="font-medium">{selectedCase.claimNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Injury Date:</span>
                        <p className="font-medium">{formatDate(selectedCase.injuryDate)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">RTW Plan:</span>
                        <p className="font-medium">{selectedCase.rtwPlan.status}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary-600">{selectedCase.communications.length}</div>
                        <div className="text-gray-500">Communications</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-success-600">{selectedCase.documents.length}</div>
                        <div className="text-gray-500">Documents</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-warning-600">{selectedCase.rtwPlan.tasks.length}</div>
                        <div className="text-gray-500">Total Tasks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-600">{selectedCase.reviewDates.length}</div>
                        <div className="text-gray-500">Review Dates</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Report Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filter
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open Only</option>
                <option value="pending">Pending Only</option>
                <option value="closed">Closed Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consultant
              </label>
              <select
                value={filters.consultant}
                onChange={(e) => setFilters(prev => ({ ...prev, consultant: e.target.value }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
              >
                <option value="all">All Consultants</option>
                {uniqueConsultants.map(consultant => (
                  <option key={consultant.id} value={consultant.id}>{consultant.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={generateReport}
              disabled={!filters.caseId || isGenerating}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report Templates */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Available Report Types</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <FileText className="h-5 w-5 text-primary-600 mr-2" />
                <h3 className="font-medium">Comprehensive Case Report</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Complete case overview including worker details, RTW plan, communications, and outcomes.
              </p>
              <div className="text-xs text-gray-500">
                Includes: Case details, RTW plan, communications log, documents, PIAWE calculation
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <BarChart3 className="h-5 w-5 text-success-600 mr-2" />
                <h3 className="font-medium">Performance Analytics</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Statistical analysis of case outcomes, task completion rates, and consultant performance.
              </p>
              <div className="text-xs text-gray-500">
                Includes: Success rates, average durations, cost analysis, trend data
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Calendar className="h-5 w-5 text-warning-600 mr-2" />
                <h3 className="font-medium">Timeline Report</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Chronological view of case activities, milestones, and key events.
              </p>
              <div className="text-xs text-gray-500">
                Includes: Activity timeline, milestone tracking, deadline analysis
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;