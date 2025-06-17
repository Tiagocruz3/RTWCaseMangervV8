import React from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Case } from '../../types';
import { Clock, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecentCasesCardProps {
  cases: Case[];
}

const RecentCasesCard: React.FC<RecentCasesCardProps> = ({ cases }) => {
  // Sort cases by updated date (most recent first) and take the first 5
  const recentCases = [...cases]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-success-100 text-success-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <Clock className="h-5 w-5 text-primary-500" />
      </div>

      {recentCases.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">No recent cases</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {recentCases.map(c => (
            <li key={c.id} className="py-3">
              <Link to={`/cases/${c.id}`} className="block hover:bg-gray-50 -mx-5 px-5 py-2 rounded-md transition-colors duration-150">
                <div className="flex justify-between">
                  <p className="font-medium text-gray-900">
                    {c.worker.firstName} {c.worker.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDistanceToNow(parseISO(c.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-sm text-gray-500">{c.employer.name}</p>
                  <p className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(c.status)}`}>
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {recentCases.length > 0 && (
        <div className="mt-4 text-center">
          <Link
            to="/cases"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            View all cases
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default RecentCasesCard;