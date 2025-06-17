import React from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { Case } from '../../types';
import { CheckCircle, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DailyTasksCardProps {
  cases: Case[];
}

const DailyTasksCard: React.FC<DailyTasksCardProps> = ({ cases }) => {
  const getDailyTasks = () => {
    const tasks = [];
    
    cases.forEach(c => {
      // Add RTW plan tasks due today
      c.rtwPlan.tasks.forEach(task => {
        if (!task.completed && isToday(parseISO(task.dueDate))) {
          tasks.push({
            type: 'task',
            title: task.title,
            caseInfo: `${c.worker.firstName} ${c.worker.lastName}`,
            caseId: c.id,
            priority: task.completed ? 'completed' : 'pending'
          });
        }
      });
      
      // Add reviews scheduled for today
      c.reviewDates.forEach(reviewDate => {
        if (isToday(parseISO(reviewDate))) {
          tasks.push({
            type: 'review',
            title: 'RTW Review Meeting',
            caseInfo: `${c.worker.firstName} ${c.worker.lastName}`,
            caseId: c.id,
            priority: 'high'
          });
        }
      });
      
      // Add RTW plan start/end dates if today
      if (isToday(parseISO(c.rtwPlan.startDate))) {
        tasks.push({
          type: 'rtw-start',
          title: 'RTW Plan Starting',
          caseInfo: `${c.worker.firstName} ${c.worker.lastName}`,
          caseId: c.id,
          priority: 'high'
        });
      }
      
      if (isToday(parseISO(c.rtwPlan.endDate))) {
        tasks.push({
          type: 'rtw-end',
          title: 'RTW Plan Ending',
          caseInfo: `${c.worker.firstName} ${c.worker.lastName}`,
          caseId: c.id,
          priority: 'high'
        });
      }
    });
    
    // Sort tasks by priority
    return tasks.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return 0;
    });
  };

  const tasks = getDailyTasks();
  
  const getTaskIcon = (type: string, priority: string) => {
    if (priority === 'completed') return <CheckCircle className="h-5 w-5 text-success-500" />;
    
    switch (type) {
      case 'review':
        return <Calendar className="h-5 w-5 text-primary-500" />;
      case 'rtw-start':
        return <Clock className="h-5 w-5 text-success-500" />;
      case 'rtw-end':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Today's Tasks</h2>
        <span className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d')}</span>
      </div>
      
      {tasks.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No tasks scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <Link
              key={`${task.caseId}-${index}`}
              to={`/cases/${task.caseId}`}
              className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getTaskIcon(task.type, task.priority)}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{task.caseInfo}</p>
                </div>
                {task.priority === 'high' && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-error-100 text-error-700">
                    Priority
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DailyTasksCard;