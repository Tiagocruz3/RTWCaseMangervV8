import React from 'react';
import { Activity, Clock, AlertTriangle, Calendar } from 'lucide-react';
import MetricCard from './MetricCard';
import { Case } from '../../types';
import { parseISO, isPast, isToday, isTomorrow } from 'date-fns';

interface DashboardMetricsProps {
  cases: Case[];
  onMetricClick?: (metric: string) => void;
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ cases, onMetricClick }) => {
  const metrics = React.useMemo(() => {
    const openCases = cases.filter(c => c.status === 'open').length;
    const pendingCases = cases.filter(c => c.status === 'pending').length;
    
    let overdueTasks = 0;
    let upcomingReviews = 0;
    let criticalActions = 0;

    cases.forEach(c => {
      // Count overdue tasks
      c.rtwPlan.tasks.forEach(task => {
        if (!task.completed && isPast(parseISO(task.dueDate))) {
          overdueTasks++;
        }
      });

      // Count upcoming reviews
      c.reviewDates.forEach(reviewDate => {
        const date = parseISO(reviewDate);
        if (isToday(date) || isTomorrow(date)) {
          upcomingReviews++;
        }
        if (isPast(date)) {
          criticalActions++;
        }
      });
    });

    return {
      activeCases: openCases + pendingCases,
      overdueTasks,
      upcomingReviews,
      criticalActions
    };
  }, [cases]);

  const metricCards = [
    {
      title: 'Active Cases',
      value: metrics.activeCases,
      icon: <Activity className="h-6 w-6 text-white" />,
      color: 'bg-primary-600',
      onClick: () => onMetricClick?.('active-cases')
    },
    {
      title: 'Overdue Tasks',
      value: metrics.overdueTasks,
      icon: <Clock className="h-6 w-6 text-white" />,
      color: 'bg-warning-500',
      onClick: () => onMetricClick?.('overdue-tasks')
    },
    {
      title: 'Upcoming Reviews',
      value: metrics.upcomingReviews,
      icon: <Calendar className="h-6 w-6 text-white" />,
      color: 'bg-success-500',
      onClick: () => onMetricClick?.('upcoming-reviews')
    },
    {
      title: 'Critical Actions',
      value: metrics.criticalActions,
      icon: <AlertTriangle className="h-6 w-6 text-white" />,
      color: 'bg-error-500',
      onClick: () => onMetricClick?.('critical-actions')
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </div>
  );
};

export default DashboardMetrics;