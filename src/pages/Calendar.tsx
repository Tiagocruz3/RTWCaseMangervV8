import React from 'react';
import CalendarView from '../components/calendar/CalendarView';
import ActionCenter from '../components/notifications/ActionCenter';
import { useCaseStore } from '../store/caseStore';

const Calendar = () => {
  const { cases } = useCaseStore();
  
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-gray-600">View and manage all case-related events and deadlines</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CalendarView />
        </div>
        <div>
          <ActionCenter cases={cases} />
        </div>
      </div>
    </div>
  );
};

export default Calendar;