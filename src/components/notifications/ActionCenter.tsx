import React from 'react';
import { Bell, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { Case } from '../../types';
import { Link } from 'react-router-dom';

interface ActionCenterProps {
  cases: Case[];
}

const ActionCenter: React.FC<ActionCenterProps> = ({ cases }) => {
  const getNotifications = () => {
    const notifications = [];
    const today = new Date();
    
    cases.forEach(c => {
      // Check overdue tasks
      c.rtwPlan.tasks.forEach(task => {
        const dueDate = parseISO(task.dueDate);
        if (!task.completed && isPast(dueDate)) {
          notifications.push({
            type: 'overdue',
            title: `Overdue task: ${task.title}`,
            description: `Case: ${c.worker.firstName} ${c.worker.lastName}`,
            date: dueDate,
            caseId: c.id,
            priority: 'high'
          });
        }
      });
      
      // Check upcoming reviews
      c.reviewDates.forEach(reviewDate => {
        const date = parseISO(reviewDate);
        if (isToday(date) || isTomorrow(date)) {
          notifications.push({
            type: 'review',
            title: `Upcoming RTW Review`,
            description: `Case: ${c.worker.firstName} ${c.worker.lastName}`,
            date,
            caseId: c.id,
            priority: 'medium'
          });
        }
      });
      
      // Check RTW plan dates
      const rtwStartDate = parseISO(c.rtwPlan.startDate);
      const rtwEndDate = parseISO(c.rtwPlan.endDate);
      
      if (isToday(rtwStartDate) || isTomorrow(rtwStartDate)) {
        notifications.push({
          type: 'rtw-start',
          title: 'RTW Plan Starting',
          description: `Case: ${c.worker.firstName} ${c.worker.lastName}`,
          date: rtwStartDate,
          caseId: c.id,
          priority: 'medium'
        });
      }
      
      if (isToday(rtwEndDate) || isTomorrow(rtwEndDate)) {
        notifications.push({
          type: 'rtw-end',
          title: 'RTW Plan Ending',
          description: `Case: ${c.worker.firstName} ${c.worker.lastName}`,
          date: rtwEndDate,
          caseId: c.id,
          priority: 'medium'
        });
      }
      
      // Check upcoming tasks
      c.rtwPlan.tasks.forEach(task => {
        const dueDate = parseISO(task.dueDate);
        if (!task.completed && (isToday(dueDate) || isTomorrow(dueDate))) {
          notifications.push({
            type: 'task',
            title: `Task due: ${task.title}`,
            description: `Case: ${c.worker.firstName} ${c.worker.lastName}`,
            date: dueDate,
            caseId: c.id,
            priority: 'normal'
          });
        }
      });
    });
    
    // Sort by priority and date
    return notifications.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return a.date.getTime() - b.date.getTime();
    });
  };
  
  const notifications = getNotifications();
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-error-500" />;
      case 'review':
        return <Calendar className="h-5 w-5 text-primary-500" />;
      case 'rtw-start':
        return <Clock className="h-5 w-5 text-success-500" />;
      case 'rtw-end':
        return <CheckCircle className="h-5 w-5 text-warning-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'bg-error-50 border-error-100';
      case 'review':
        return 'bg-primary-50 border-primary-100';
      case 'rtw-start':
        return 'bg-success-50 border-success-100';
      case 'rtw-end':
        return 'bg-warning-50 border-warning-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <Bell className="h-5 w-5 text-primary-500 mr-2" />
            Action Center
          </h2>
          {notifications.length > 0 && (
            <span className="bg-primary-100 text-primary-700 text-sm px-2.5 py-0.5 rounded-full">
              {notifications.length} items
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No pending actions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <Link
                key={`${notification.caseId}-${index}`}
                to={`/cases/${notification.caseId}`}
                className={`block p-3 rounded-lg border ${getNotificationStyle(notification.type)} hover:bg-opacity-75 transition-colors duration-150`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {notification.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {isToday(notification.date)
                        ? 'Today'
                        : isTomorrow(notification.date)
                        ? 'Tomorrow'
                        : format(notification.date, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionCenter;