import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCaseStore } from '../../store/caseStore';
import { Case, CaseStatus } from '../../types';
import { Briefcase, Clock, CheckCircle, AlertTriangle, Plus, Search } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import { DataTable } from '../common/DataTable';

const CaseList: React.FC = () => {
  const { fetchCases, filteredCases, isLoading, filterStatus, filterCases } = useCaseStore();
  const navigate = useNavigate();
  const [caseTypeFilter, setCaseTypeFilter] = useState<'all' | 'workcover' | 'non-workcover'>('all');
  
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);
  
  const handleStatusFilter = (status: CaseStatus | 'all') => filterCases(status);
  const handleCaseTypeFilter = (type: 'all' | 'workcover' | 'non-workcover') => setCaseTypeFilter(type);
  
  const getStatusIcon = (status: CaseStatus) => {
    const icons = {
      open: <Clock className="h-5 w-5 text-success-500" />,
      closed: <CheckCircle className="h-5 w-5 text-gray-500" />,
      pending: <AlertTriangle className="h-5 w-5 text-warning-500" />
    };
    return icons[status] || <Briefcase className="h-5 w-5 text-primary-500" />;
  };

  const filterButtons = [
    { key: 'all', label: 'All Cases' },
    { key: 'open', label: 'Open' },
    { key: 'pending', label: 'Pending' },
    { key: 'closed', label: 'Closed' }
  ];

  const caseTypeButtons = [
    { key: 'all', label: 'All Types' },
    { key: 'workcover', label: 'WorkCover' },
    { key: 'non-workcover', label: 'Non-WorkCover' }
  ];

  const columns = [
    {
      key: 'worker',
      label: 'Worker',
      render: (c: Case) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {c.worker.firstName} {c.worker.lastName}
          </div>
          <div className="text-sm text-gray-500">{c.worker.position}</div>
        </div>
      )
    },
    {
      key: 'employer',
      label: 'Employer',
      render: (c: Case) => c.employer.name
    },
    {
      key: 'claimNumber',
      label: 'Claim/Case Number',
      render: (c: Case) => c.claimNumber
    },
    {
      key: 'caseType',
      label: 'Case Type',
      render: (c: Case) => c.workcoverType === 'workcover' ? 'WorkCover' : 'Non-WorkCover'
    },
    {
      key: 'injuryDate',
      label: 'Injury Date',
      render: (c: Case) => formatDate(c.injuryDate)
    },
    {
      key: 'plannedRtwDate',
      label: 'RTW Date',
      render: (c: Case) => formatDate(c.plannedRtwDate)
    },
    {
      key: 'status',
      label: 'Status',
      render: (c: Case) => (
        <div className="flex items-center">
          {getStatusIcon(c.status)}
          <StatusBadge status={c.status} type="case" className="ml-2" />
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const displayedCases = caseTypeFilter === 'all'
    ? filteredCases
    : filteredCases.filter(c => (caseTypeFilter === 'workcover' ? c.workcoverType === 'workcover' : c.workcoverType === 'non-workcover'));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(({ key, label }) => (
              <button
                key={key}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === key
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => handleStatusFilter(key as CaseStatus | 'all')}
              >
                {label}
              </button>
            ))}
            <span className="mx-2 text-gray-300">|</span>
            {caseTypeButtons.map(({ key, label }) => (
              <button
                key={key}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  caseTypeFilter === key
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => handleCaseTypeFilter(key as 'all' | 'workcover' | 'non-workcover')}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            onClick={() => navigate('/cases/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </button>
        </div>
        
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="search"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search cases by worker, employer, or claim number..."
            />
          </div>
        </div>
      </div>
      
      {displayedCases.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="No cases found"
          description={filterStatus === 'all' ? 'Get started by creating your first case' : `No ${filterStatus} cases found`}
          action={
            <button
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              onClick={() => navigate('/cases/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Case
            </button>
          }
        />
      ) : (
        <DataTable
          data={displayedCases}
          columns={columns}
          onRowClick={(c) => navigate(`/cases/${c.id}`)}
        />
      )}
    </div>
  );
};

export default CaseList;