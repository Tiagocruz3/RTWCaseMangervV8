import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'case' | 'task' | 'priority' | 'severity';
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'case', className = '' }) => {
  const getStatusStyles = () => {
    const styles = {
      case: {
        open: 'text-success-700 bg-success-50 border-success-200',
        closed: 'text-gray-700 bg-gray-50 border-gray-200',
        pending: 'text-warning-700 bg-warning-50 border-warning-200'
      },
      task: {
        completed: 'text-success-700 bg-success-50 border-success-200',
        overdue: 'text-error-700 bg-error-50 border-error-200',
        'due-today': 'text-warning-700 bg-warning-50 border-warning-200',
        pending: 'text-gray-700 bg-gray-50 border-gray-200'
      },
      priority: {
        critical: 'text-error-700 bg-error-50 border-error-200',
        high: 'text-warning-700 bg-warning-50 border-warning-200',
        medium: 'text-primary-700 bg-primary-50 border-primary-200',
        low: 'text-gray-700 bg-gray-50 border-gray-200'
      },
      severity: {
        critical: 'text-error-700 bg-error-50 border-error-200',
        high: 'text-warning-700 bg-warning-50 border-warning-200',
        medium: 'text-primary-700 bg-primary-50 border-primary-200',
        low: 'text-gray-700 bg-gray-50 border-gray-200'
      }
    };
    return styles[type][status as keyof typeof styles[typeof type]] || 'text-gray-700 bg-gray-50 border-gray-200';
  };

  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusStyles()} ${className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusBadge;