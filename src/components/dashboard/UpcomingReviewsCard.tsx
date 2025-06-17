import React from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Case } from '../../types';
import { CalendarDays, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UpcomingReviewsCardProps {
  cases: Case[];
}

const UpcomingReviewsCard: React.FC<UpcomingReviewsCardProps> = ({ cases }) => {
  const getUpcomingReviews = () => {
    const today = new Date();
    const nextTwoWeeks = new Date();
    nextTwoWeeks.setDate(today.getDate() + 14);
    
    return cases
      .filter(c => {
        // Check if any review dates are in the next two weeks
        return c.reviewDates.some(date => {
          const reviewDate = parseISO(date);
          return reviewDate >= today && reviewDate <= nextTwoWeeks;
        });
      })
      .slice(0, 5); // Limit to 5 cases
  };
  
  const upcomingReviews = getUpcomingReviews();
  
  const getNextReviewDate = (c: Case) => {
    const today = new Date();
    
    // Find the next upcoming review date
    return c.reviewDates
      .filter(date => parseISO(date) >= today)
      .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime())[0];
  };
  
  const formatRelativeDate = (dateString: string) => {
    try {
      return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Upcoming Reviews</h2>
        <CalendarDays className="h-5 w-5 text-primary-500" />
      </div>
      
      {upcomingReviews.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">No upcoming reviews</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {upcomingReviews.map(c => {
            const nextReviewDate = getNextReviewDate(c);
            return (
              <li key={c.id} className="py-3">
                <Link to={`/cases/${c.id}`} className="block hover:bg-gray-50 -mx-5 px-5 py-2 rounded-md transition-colors duration-150">
                  <div className="flex justify-between">
                    <p className="font-medium text-gray-900">
                      {c.worker.firstName} {c.worker.lastName}
                    </p>
                    <p className="text-sm text-primary-600">
                      {formatRelativeDate(nextReviewDate)}
                    </p>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-sm text-gray-500">{c.employer.name}</p>
                    <p className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      
      {upcomingReviews.length > 0 && (
        <div className="mt-4 text-center">
          <Link
            to="/calendar"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            View calendar
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default UpcomingReviewsCard;