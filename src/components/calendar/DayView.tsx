import React from 'react';
import { format, parseISO, isSameHour, addHours, startOfDay } from 'date-fns';
import { Case } from '../../types';
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DayViewProps {
  date: Date;
  cases: Case[];
  onClose: () => void;
}

const DayView: React.FC<DayViewProps> = ({ date, cases, onClose }) => {
  const hours = Array.from({ length: 24 }, (_, i) => addHours(startOfDay(date), i));
  
  const getEventsForHour = (hour: Date) => {
    return cases.flatMap(c => {
      const events = [];
      
      // Check review dates
      c.reviewDates.forEach(reviewDate => {
        const reviewDateObj = parseISO(reviewDate);
        if (isSameHour(reviewDateObj, hour)) {
          events.push({
            type: 'review',
            title: `RTW Review - ${c.worker.firstName} ${c.worker.lastName}`,
            caseId: c.id,
            time: format(reviewDateObj, 'HH:mm')
          });
        }
      });
      
      // Check RTW plan tasks
      c.rtwPlan.tasks.forEach(task => {
        const taskDate = parseISO(task.dueDate);
        if (isSameHour(taskDate, hour) && !task.completed) {
          events.push({
            type: 'task',
            title: task.title,
            description: `Case: ${c.worker.firstName} ${c.worker.lastName}`,
            caseId: c.id,
            time: format(taskDate, 'HH:mm')
          });
        }
      });
      
      return events;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center">
            <Clock className="h-5 w-5 text-primary-500 mr-2" />
            {format(date, 'EEEE, MMMM d, yyyy')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {hours.map(hour => {
              const events = getEventsForHour(hour);
              
              return (
                <div key={hour.toString()} className="flex group">
                  <div className="w-20 py-2 text-right text-sm text-gray-500 group-hover:text-primary-600">
                    {format(hour, 'HH:mm')}
                  </div>
                  <div className="flex-1 ml-4 border-l border-gray-200 pl-4 py-2">
                    {events.length > 0 ? (
                      <div className="space-y-2">
                        {events.map((event, index) => (
                          <Link
                            key={`${event.caseId}-${index}`}
                            to={`/cases/${event.caseId}`}
                            className={`block p-2 rounded ${
                              event.type === 'review'
                                ? 'bg-primary-50 text-primary-700'
                                : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="text-sm font-medium">{event.title}</div>
                            {event.description && (
                              <div className="text-xs mt-1 text-gray-500">
                                {event.description}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="h-6 group-hover:bg-gray-50 rounded"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;