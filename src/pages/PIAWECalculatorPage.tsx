import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import PIAWECalculator from '../components/compensation/PIAWECalculator';
import { useCaseStore } from '../store/caseStore';
import { PIAWECalculation } from '../types';

const PIAWECalculatorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCase, updateCase } = useCaseStore();
  const [caseData, setCaseData] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchCaseData = async () => {
      if (id) {
        const data = await getCase(id);
        setCaseData(data);
      }
    };
    fetchCaseData();
  }, [id, getCase]);

  const handleCalculationComplete = async (calculation: PIAWECalculation) => {
    if (id) {
      await updateCase(id, { piaweCalculation: calculation });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <button
          className="flex items-center text-gray-600 hover:text-gray-900"
          onClick={() => navigate(id ? `/cases/${id}` : '/cases')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to {id ? 'case' : 'cases'}
        </button>
        
        <h1 className="text-2xl font-bold mt-2">PIAWE Calculator</h1>
        <p className="text-gray-600">Calculate Pre-Injury Average Weekly Earnings</p>
        
        {caseData && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium">Case Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 text-sm">
              <div>
                <span className="text-gray-500">Worker:</span>
                <p className="font-medium">{caseData.worker.firstName} {caseData.worker.lastName}</p>
              </div>
              <div>
                <span className="text-gray-500">Claim Number:</span>
                <p className="font-medium">{caseData.claimNumber}</p>
              </div>
              <div>
                <span className="text-gray-500">Injury Date:</span>
                <p className="font-medium">{new Date(caseData.injuryDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {caseData?.workcoverType !== 'non-workcover' ? (
        <PIAWECalculator
          caseId={id}
          workerId={caseData?.worker.id}
          injuryDate={caseData?.injuryDate}
          jurisdiction={caseData?.jurisdiction || 'NSW'}
          onCalculationComplete={handleCalculationComplete}
        />
      ) : (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          PIAWE calculation is not applicable for Non-WorkCover cases.
        </div>
      )}
    </div>
  );
};

export default PIAWECalculatorPage;