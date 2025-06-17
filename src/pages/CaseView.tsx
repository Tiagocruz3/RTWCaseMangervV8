import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CaseDetail from '../components/cases/CaseDetail';
import { ChevronLeft } from 'lucide-react';

const CaseView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <button
          className="flex items-center text-gray-600 hover:text-gray-900"
          onClick={() => navigate('/cases')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to cases
        </button>
        
        <h1 className="text-2xl font-bold mt-2">Case Details</h1>
        <p className="text-gray-600">View complete case information and manage RTW plan</p>
      </div>
      
      <CaseDetail />
    </div>
  );
};

export default CaseView;