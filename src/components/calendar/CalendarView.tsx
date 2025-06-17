import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO, isBefore } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle, Plus } from 'lucide-react';
import { Case } from '../../types';
import { useCaseStore } from '../../store/caseStore';
import { Link } from 'react-router-dom';
import AddTaskModal from './AddTaskModal';
import DayView from './DayView';

const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { cases } = useCaseStore();
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDayViewOpen(true);
  };
  
  const handleAddTask = (date: Date) => {
    setSelectedDate(date);
    setIsAddTaskModalOpen(true);
  };
  
  const getEventsForDay = (date: Date) => {
    return cases.flatMap(c => {
      const events = [];
      
      // Check review dates
      c.reviewDates.forEach(reviewDate => {
        const reviewDateObj = parseISO(reviewDate);
        if (isSameDay(reviewDateObj, date)) {
          events.push({
            type: 'review',
            title: `RTW Review - ${c.worker.firstName} ${c.worker.lastName}`,
            caseId: c.id,
            priority: isBefore(reviewDateObj, new Date()) ? 'high' : 'normal'
          });
        }
      });
      
      // Check RTW plan dates
      const rtwStartDate = parseISO(c.rtwPlan.startDate);
      if (isSameDay(rtwStartDate, date)) {
        events.push({
          type: 'rtw-start',
          title: `RTW Plan Start - ${c.worker.firstName} ${c.worker.lastName}`,
          caseId: c.id,
          priority: isBefore(rtwStartDate, new Date()) ? 'high' : 'normal'
        });
      }
      
      const rtwEndDate = parseISO(c.rtwPlan.endDate);
      if (isSameDay(rtwEndDate, date)) {
        events.push({
          type: 'rtw-end',
          title: `RTW Plan End - ${c.worker.firstName} ${c.worker.lastName}`,
          caseId: c.id,
          priority: isBefore(rtwEndDate, new Date()) ? 'high' : 'normal'
        });
      }
      
      // Check RTW plan tasks
      c.rtwPlan.tasks.forEach(task => {
        const taskDate = parseISO(task.dueDate);
        if (isSameDay(taskDate, date) && !task.completed) {
          events.push({
            type: 'task',
            title: task.title,
            description: `Case: ${c.worker.firstName} ${c.worker.lastName}`,
            caseId: c.id,
            priority: isBefore(taskDate, new Date()) ? 'high' : 'normal'
          });
        }
      });
      
      return events;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarIcon className="h-6 w-6 text-primary-500 mr-3" />
            <h2 className="text-xl font-semibold">Calendar</h2>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-lg font-medium">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {days.map(day => {
            const events = getEventsForDay(day);
            const hasOverdue = events.some(event => event.priority === 'high');
            
            return (
              <div
                key={day.toString()}
                className={`bg-white p-3 min-h-[120px] relative cursor-pointer hover:bg-gray-50 transition-colors ${
                  isToday(day) ? 'ring-2 ring-primary-500' : ''
                }`}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isToday(day) ? 'text-primary-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {hasOverdue && (
                    <AlertTriangle className="h-4 w-4 text-error-500" />
                  )}
                </div>
                
                <div className="mt-2 space-y-1 max-h-[100px] overflow-y-auto">
                  {events.map((event, index) => (
                    <Link
                      key={`${event.caseId}-${index}`}
                      to={`/cases/${event.caseId}`}
                      className={`block text-xs p-2 rounded-lg truncate ${
                        event.priority === 'high' 
                          ? 'bg-error-50 text-error-700 font-medium' 
                          : event.type === 'review'
                            ? 'bg-primary-50 text-primary-700'
                            : event.type === 'rtw-start'
                              ? 'bg-success-50 text-success-700'
                              : event.type === 'rtw-end'
                                ? 'bg-warning-50 text-warning-700'
                                : 'bg-gray-50 text-gray-700'
                      }`}
                      title={`${event.title}${event.description ? `\n${event.description}` : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {event.title}
                    </Link>
                  ))}
                </div>
                
                {events.length === 0 && (
                  <button
                    className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddTask(day);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {selectedDate && (
        <>
          <AddTaskModal
            isOpen={isAddTaskModalOpen}
            onClose={() => {
              setIsAddTaskModalOpen(false);
              setSelectedDate(null);
            }}
            selectedDate={selectedDate}
          />
          
          {isDayViewOpen && (
            <DayView
              date={selectedDate}
              cases={cases}
              onClose={() => {
                setIsDayViewOpen(false);
                setSelectedDate(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CalendarView;