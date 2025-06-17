import React from 'react';
import CaseList from '../components/cases/CaseList';

const Cases = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Case Management</h1>
        <p className="text-gray-600">View and manage all WorkCover cases</p>
      </div>
      
      <CaseList />
    </div>
  );
};

export default Cases;