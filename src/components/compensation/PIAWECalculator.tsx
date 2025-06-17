import React, { useState, useEffect } from 'react';
import { Calculator, Upload, Download, AlertTriangle, CheckCircle, Plus, Trash2, Edit3, Save, X, User, Briefcase } from 'lucide-react';
import { PayslipEntry, PIAWECalculation, JurisdictionType, PIAWEAdjustment, ValidationIssue } from '../../types';
import { piaweService } from '../../services/piaweService';
import { format, parseISO, subWeeks } from 'date-fns';
import { useCaseStore } from '../../store/caseStore';

interface PIAWECalculatorProps {
  caseId?: string;
  workerId?: string;
  injuryDate?: string;
  jurisdiction?: JurisdictionType;
  onCalculationComplete?: (calculation: PIAWECalculation) => void;
}

const PIAWECalculator: React.FC<PIAWECalculatorProps> = ({
  caseId: initialCaseId,
  workerId,
  injuryDate: initialInjuryDate = format(new Date(), 'yyyy-MM-dd'),
  jurisdiction: initialJurisdiction = 'NSW',
  onCalculationComplete
}) => {
  const { cases } = useCaseStore();
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId || '');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [payslips, setPayslips] = useState<PayslipEntry[]>([]);
  const [adjustments, setAdjustments] = useState<PIAWEAdjustment[]>([]);
  const [calculation, setCalculation] = useState<PIAWECalculation | null>(null);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<JurisdictionType>(initialJurisdiction);
  const [injuryDate, setInjuryDate] = useState(initialInjuryDate);
  const [isCalculating, setIsCalculating] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<string | null>(null);
  const [showAddPayslip, setShowAddPayslip] = useState(false);
  const [newPayslip, setNewPayslip] = useState<Partial<PayslipEntry>>({
    weekEnding: format(subWeeks(new Date(), 1), 'yyyy-MM-dd'),
    ordinaryHours: 0,
    ordinaryRate: 0,
    overtimeHours: 0,
    overtimeRate: 0,
    allowances: 0,
    bonuses: 0,
    commissions: 0,
    otherIncome: 0,
    unpaidLeave: false
  });

  const jurisdictionRules = piaweService.getJurisdictionRules(selectedJurisdiction);

  // Available jurisdictions with their full names
  const jurisdictions: { code: JurisdictionType; name: string; description: string }[] = [
    { code: 'NSW', name: 'New South Wales', description: 'icare/SIRA' },
    { code: 'VIC', name: 'Victoria', description: 'WorkSafe Victoria' },
    { code: 'QLD', name: 'Queensland', description: 'WorkCover Queensland' },
    { code: 'WA', name: 'Western Australia', description: 'WorkCover WA' },
    { code: 'SA', name: 'South Australia', description: 'ReturnToWorkSA' },
    { code: 'TAS', name: 'Tasmania', description: 'WorkCover Tasmania' },
    { code: 'NT', name: 'Northern Territory', description: 'NT WorkSafe' },
    { code: 'ACT', name: 'Australian Capital Territory', description: 'WorkSafe ACT' }
  ];

  // Filter open cases for selection
  const openCases = cases.filter(c => c.status === 'open' || c.status === 'pending');

  // Handle case selection
  useEffect(() => {
    if (selectedCaseId) {
      const caseData = cases.find(c => c.id === selectedCaseId);
      if (caseData) {
        setSelectedCase(caseData);
        setInjuryDate(caseData.injuryDate);
        setSelectedJurisdiction(caseData.jurisdiction || 'NSW');
        
        // Pre-populate payslips from wages/salary data if available
        if (caseData.wagesSalary) {
          generatePayslipsFromWageData(caseData.wagesSalary, caseData.injuryDate);
        }
      }
    } else {
      setSelectedCase(null);
    }
  }, [selectedCaseId, cases]);

  const generatePayslipsFromWageData = (wageData: any, injuryDateStr: string) => {
    const injuryDateObj = parseISO(injuryDateStr);
    const generatedPayslips: PayslipEntry[] = [];
    
    // Generate 26 weeks of payslips based on wage information
    for (let i = 1; i <= 26; i++) {
      const weekEnding = format(subWeeks(injuryDateObj, i), 'yyyy-MM-dd');
      
      // Add some realistic variation (±5%)
      const hoursVariation = 1 + (Math.random() - 0.5) * 0.1;
      const ordinaryHours = Math.round(wageData.averageWeeklyHours * hoursVariation);
      const overtimeHours = wageData.averageOvertimeHours + (Math.random() > 0.7 ? Math.random() * 2 : 0);
      
      // Calculate total allowances and bonuses per week
      const totalAllowances = Object.values(wageData.allowances).reduce((sum: number, val: number) => sum + val, 0);
      const totalBonuses = Object.values(wageData.bonuses).reduce((sum: number, val: number) => sum + val, 0);
      
      const totalGross = 
        ordinaryHours * wageData.ordinaryHourlyRate +
        overtimeHours * wageData.overtimeRate +
        totalAllowances +
        totalBonuses +
        wageData.commissions;

      generatedPayslips.push({
        id: `generated-${i}`,
        weekEnding,
        ordinaryHours,
        ordinaryRate: wageData.ordinaryHourlyRate,
        overtimeHours,
        overtimeRate: wageData.overtimeRate,
        allowances: totalAllowances,
        bonuses: totalBonuses,
        commissions: wageData.commissions,
        otherIncome: 0,
        totalGross,
        unpaidLeave: false
      });
    }

    setPayslips(generatedPayslips);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await piaweService.parsePayslipData(file);
      setPayslips(prev => [...prev, ...parsedData]);
    } catch (error) {
      console.error('Error parsing payslip data:', error);
    }
  };

  const addPayslip = () => {
    if (!newPayslip.weekEnding || !newPayslip.ordinaryRate) return;

    const totalGross = 
      (newPayslip.ordinaryHours || 0) * (newPayslip.ordinaryRate || 0) +
      (newPayslip.overtimeHours || 0) * (newPayslip.overtimeRate || 0) +
      (newPayslip.allowances || 0) +
      (newPayslip.bonuses || 0) +
      (newPayslip.commissions || 0) +
      (newPayslip.otherIncome || 0);

    const payslip: PayslipEntry = {
      id: `payslip-${Date.now()}`,
      weekEnding: newPayslip.weekEnding!,
      ordinaryHours: newPayslip.ordinaryHours || 0,
      ordinaryRate: newPayslip.ordinaryRate || 0,
      overtimeHours: newPayslip.overtimeHours || 0,
      overtimeRate: newPayslip.overtimeRate || 0,
      allowances: newPayslip.allowances || 0,
      bonuses: newPayslip.bonuses || 0,
      commissions: newPayslip.commissions || 0,
      otherIncome: newPayslip.otherIncome || 0,
      totalGross,
      unpaidLeave: newPayslip.unpaidLeave || false
    };

    setPayslips(prev => [...prev, payslip]);
    setNewPayslip({
      weekEnding: format(subWeeks(parseISO(newPayslip.weekEnding!), 1), 'yyyy-MM-dd'),
      ordinaryHours: 0,
      ordinaryRate: newPayslip.ordinaryRate,
      overtimeHours: 0,
      overtimeRate: newPayslip.overtimeRate,
      allowances: 0,
      bonuses: 0,
      commissions: 0,
      otherIncome: 0,
      unpaidLeave: false
    });
    setShowAddPayslip(false);
  };

  const updatePayslip = (id: string, updates: Partial<PayslipEntry>) => {
    setPayslips(prev => prev.map(payslip => {
      if (payslip.id === id) {
        const updated = { ...payslip, ...updates };
        updated.totalGross = 
          updated.ordinaryHours * updated.ordinaryRate +
          updated.overtimeHours * updated.overtimeRate +
          updated.allowances +
          updated.bonuses +
          updated.commissions +
          updated.otherIncome;
        return updated;
      }
      return payslip;
    }));
  };

  const removePayslip = (id: string) => {
    setPayslips(prev => prev.filter(p => p.id !== id));
  };

  const calculatePIAWE = () => {
    if (payslips.length === 0) return;

    setIsCalculating(true);
    try {
      const result = piaweService.calculatePIAWE(payslips, injuryDate, selectedJurisdiction, adjustments);
      result.caseId = selectedCaseId || '';
      result.workerId = selectedCase?.worker.id || workerId || '';
      setCalculation(result);
      onCalculationComplete?.(result);
    } catch (error) {
      console.error('Error calculating PIAWE:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // Recalculate when jurisdiction changes
  useEffect(() => {
    if (payslips.length > 0) {
      calculatePIAWE();
    }
  }, [selectedJurisdiction]);

  const downloadStatement = () => {
    if (!calculation) return;
    
    const blob = piaweService.generatePIAWEStatement(calculation);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PIAWE-Statement-${calculation.workerId}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getValidationIcon = (issue: ValidationIssue) => {
    return issue.severity === 'error' ? 
      <AlertTriangle className="h-4 w-4 text-error-500" /> :
      <AlertTriangle className="h-4 w-4 text-warning-500" />;
  };

  const getJurisdictionInfo = (code: JurisdictionType) => {
    return jurisdictions.find(j => j.code === code);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Calculator className="h-6 w-6 text-primary-500 mr-3" />
            <div>
              <h2 className="text-xl font-semibold">PIAWE Calculator</h2>
              <p className="text-gray-600">Pre-Injury Average Weekly Earnings</p>
            </div>
          </div>
        </div>

        {/* Case Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Case (Optional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
              >
                <option value="">Manual Entry (No Case Selected)</option>
                {openCases.map((caseItem) => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.worker.firstName} {caseItem.worker.lastName} - {caseItem.claimNumber}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedCase && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm">{selectedCase.worker.firstName} {selectedCase.worker.lastName}</span>
                </div>
                <div className="flex items-center space-x-2 mb-1">
                  <Briefcase className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-600">{selectedCase.employer.name}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Claim: {selectedCase.claimNumber} • Position: {selectedCase.worker.position}
                </div>
                {selectedCase.wagesSalary && (
                  <div className="mt-2 text-xs text-success-600">
                    ✓ Wage information available - payslips auto-generated
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Injury Date Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Injury Date
          </label>
          <input
            type="date"
            value={injuryDate}
            onChange={(e) => setInjuryDate(e.target.value)}
            className="rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
            disabled={!!selectedCase}
          />
          {selectedCase && (
            <p className="text-xs text-gray-500 mt-1">
              Injury date automatically populated from selected case
            </p>
          )}
        </div>

        {/* Jurisdiction Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Jurisdiction
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {jurisdictions.map((jurisdiction) => (
              <button
                key={jurisdiction.code}
                onClick={() => setSelectedJurisdiction(jurisdiction.code)}
                disabled={!!selectedCase}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedJurisdiction === jurisdiction.code
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${selectedCase ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium text-sm">{jurisdiction.code}</div>
                <div className="text-xs text-gray-600 mt-1">{jurisdiction.name}</div>
                <div className="text-xs text-gray-500 mt-1">{jurisdiction.description}</div>
              </button>
            ))}
          </div>
          {selectedCase && (
            <p className="text-xs text-gray-500 mt-2">
              Jurisdiction automatically set from selected case
            </p>
          )}
        </div>

        {/* Jurisdiction Rules Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {getJurisdictionInfo(selectedJurisdiction)?.name} ({selectedJurisdiction}) Rules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Reference Period:</span>
              <p className="font-medium">{jurisdictionRules.defaultReferencePeriod} weeks</p>
            </div>
            <div>
              <span className="text-gray-500">Minimum Weeks:</span>
              <p className="font-medium">{jurisdictionRules.minimumWeeksRequired} weeks</p>
            </div>
            <div>
              <span className="text-gray-500">Injury Date:</span>
              <p className="font-medium">{format(parseISO(injuryDate), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <span className="text-gray-500">Max Weekly Cap:</span>
              <p className="font-medium">
                {jurisdictionRules.cappingRules?.maxWeeklyAmount 
                  ? `$${jurisdictionRules.cappingRules.maxWeeklyAmount}` 
                  : 'No cap'}
              </p>
            </div>
          </div>
          
          {/* Jurisdiction-specific inclusions */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Includes:</span>
              <ul className="mt-1 space-y-1">
                {jurisdictionRules.allowanceInclusions.map((inclusion, index) => (
                  <li key={index} className="text-gray-700">• {inclusion}</li>
                ))}
                {jurisdictionRules.bonusInclusions.regularBonus && (
                  <li className="text-gray-700">• Regular bonuses</li>
                )}
                {jurisdictionRules.bonusInclusions.performanceBonus && (
                  <li className="text-gray-700">• Performance bonuses</li>
                )}
              </ul>
            </div>
            <div>
              <span className="text-gray-500">Special Rules:</span>
              <ul className="mt-1 space-y-1">
                {selectedJurisdiction === 'NSW' && (
                  <>
                    <li className="text-gray-700">• Excludes one-off bonuses</li>
                    <li className="text-gray-700">• Includes piece rates</li>
                  </>
                )}
                {selectedJurisdiction === 'VIC' && (
                  <>
                    <li className="text-gray-700">• Regular overtime only</li>
                    <li className="text-gray-700">• Includes commissions</li>
                  </>
                )}
                {selectedJurisdiction === 'QLD' && (
                  <>
                    <li className="text-gray-700">• Seasonal worker provisions</li>
                    <li className="text-gray-700">• Consistent overtime</li>
                  </>
                )}
                {selectedJurisdiction === 'WA' && (
                  <>
                    <li className="text-gray-700">• Negotiable for fluctuating earnings</li>
                    <li className="text-gray-700">• Includes incentive payments</li>
                  </>
                )}
                {selectedJurisdiction === 'SA' && (
                  <>
                    <li className="text-gray-700">• Super paid separately after 52 weeks</li>
                    <li className="text-gray-700">• Includes penalties & loadings</li>
                  </>
                )}
                {['TAS', 'NT', 'ACT'].includes(selectedJurisdiction) && (
                  <li className="text-gray-700">• Standard 52-week calculation</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Payslip Data Entry */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Payslip Data</h3>
            <div className="flex space-x-2">
              <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Upload className="h-4 w-4 mr-2" />
                Upload Payslips
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                onClick={() => setShowAddPayslip(true)}
                className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payslip
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {payslips.length === 0 ? (
            <div className="text-center py-8">
              <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No payslip data entered yet</p>
              <p className="text-sm text-gray-400 mt-1">
                {selectedCase 
                  ? 'Select a case with wage information or add payslips manually'
                  : 'Upload payslips or add entries manually'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week Ending</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordinary</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allowances</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonuses</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Gross</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payslips.map((payslip) => (
                    <tr key={payslip.id} className={payslip.unpaidLeave ? 'bg-gray-50' : ''}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        {format(parseISO(payslip.weekEnding), 'dd/MM/yyyy')}
                        {payslip.unpaidLeave && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-warning-100 text-warning-700 rounded">
                            Unpaid Leave
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        ${(payslip.ordinaryHours * payslip.ordinaryRate).toFixed(2)}
                        <div className="text-xs text-gray-500">
                          {payslip.ordinaryHours}h @ ${payslip.ordinaryRate}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        ${(payslip.overtimeHours * payslip.overtimeRate).toFixed(2)}
                        <div className="text-xs text-gray-500">
                          {payslip.overtimeHours}h @ ${payslip.overtimeRate}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        ${payslip.allowances.toFixed(2)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        ${payslip.bonuses.toFixed(2)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        ${payslip.totalGross.toFixed(2)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => setEditingPayslip(payslip.id)}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removePayslip(payslip.id)}
                            className="text-error-600 hover:text-error-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Payslip Modal */}
      {showAddPayslip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Add Payslip Entry</h3>
              <button onClick={() => setShowAddPayslip(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Week Ending</label>
                  <input
                    type="date"
                    value={newPayslip.weekEnding}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, weekEnding: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="unpaidLeave"
                    checked={newPayslip.unpaidLeave}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, unpaidLeave: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                  <label htmlFor="unpaidLeave" className="ml-2 text-sm text-gray-700">
                    Unpaid Leave Period
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordinary Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPayslip.ordinaryHours}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, ordinaryHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordinary Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayslip.ordinaryRate}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, ordinaryRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPayslip.overtimeHours}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayslip.overtimeRate}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, overtimeRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayslip.allowances}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, allowances: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonuses</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayslip.bonuses}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, bonuses: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commissions</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayslip.commissions}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, commissions: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Income</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayslip.otherIncome}
                    onChange={(e) => setNewPayslip(prev => ({ ...prev, otherIncome: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddPayslip(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={addPayslip}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
              >
                Add Payslip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Results */}
      {calculation && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">PIAWE Calculation Results</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Calculated using {selectedJurisdiction} rules</span>
                <button
                  onClick={downloadStatement}
                  className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Statement
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Final Result */}
            <div className="bg-primary-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <h4 className="text-2xl font-bold text-primary-900 mb-2">
                  ${calculation.finalPIAWE.toFixed(2)}
                </h4>
                <p className="text-primary-700">Final PIAWE ({selectedJurisdiction})</p>
                <p className="text-sm text-primary-600 mt-1">{calculation.methodUsed}</p>
                {jurisdictionRules.cappingRules?.maxWeeklyAmount && 
                 calculation.finalPIAWE >= jurisdictionRules.cappingRules.maxWeeklyAmount && (
                  <p className="text-xs text-warning-600 mt-2">
                    ⚠️ Amount capped at {selectedJurisdiction} maximum of ${jurisdictionRules.cappingRules.maxWeeklyAmount}
                  </p>
                )}
              </div>
            </div>

            {/* Case Information */}
            {selectedCase && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h5 className="font-medium mb-2">Case Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Worker:</span>
                    <p className="font-medium">{selectedCase.worker.firstName} {selectedCase.worker.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Employer:</span>
                    <p className="font-medium">{selectedCase.employer.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Claim Number:</span>
                    <p className="font-medium">{selectedCase.claimNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium mb-3">52-Week Period</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Earnings:</span>
                    <span>${calculation.calculations.period52Week.totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Included Weeks:</span>
                    <span>{calculation.calculations.period52Week.includedWeeks}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Average Weekly:</span>
                    <span>${calculation.calculations.period52Week.averageWeekly.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium mb-3">13-Week Period</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Earnings:</span>
                    <span>${calculation.calculations.period13Week.totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Included Weeks:</span>
                    <span>{calculation.calculations.period13Week.includedWeeks}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Average Weekly:</span>
                    <span>${calculation.calculations.period13Week.averageWeekly.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Jurisdiction-specific Information */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h5 className="font-medium mb-2">{selectedJurisdiction} Specific Calculation Notes</h5>
              <div className="text-sm text-gray-700 space-y-1">
                {selectedJurisdiction === 'NSW' && (
                  <>
                    <p>• NSW calculation excludes superannuation and one-off bonuses</p>
                    <p>• Regular overtime and piece rates are included</p>
                    <p>• Uses ordinary earnings divided by weeks worked</p>
                  </>
                )}
                {selectedJurisdiction === 'VIC' && (
                  <>
                    <p>• VIC includes gross earnings excluding superannuation</p>
                    <p>• Regular overtime, commissions and bonuses included</p>
                    <p>• Irregular overtime excluded</p>
                  </>
                )}
                {selectedJurisdiction === 'QLD' && (
                  <>
                    <p>• QLD uses 12-month average for consistent workers</p>
                    <p>• Shorter periods may apply for seasonal/part-time workers</p>
                    <p>• Includes consistent overtime and allowances</p>
                  </>
                )}
                {selectedJurisdiction === 'WA' && (
                  <>
                    <p>• WA calculation can be negotiated for fluctuating earnings</p>
                    <p>• Includes bonuses, allowances and incentive payments</p>
                    <p>• 12-month average is standard</p>
                  </>
                )}
                {selectedJurisdiction === 'SA' && (
                  <>
                    <p>• SA uses 12-month average excluding superannuation</p>
                    <p>• Superannuation paid separately by insurer after 52 weeks</p>
                    <p>• Includes regular overtime, penalties and loadings</p>
                  </>
                )}
                {['TAS', 'NT', 'ACT'].includes(selectedJurisdiction) && (
                  <p>• Standard 52-week calculation with jurisdiction-specific caps and rules</p>
                )}
              </div>
            </div>

            {/* Validation Issues */}
            {calculation.validationIssues.length > 0 && (
              <div className="border border-warning-200 rounded-lg p-4 mb-6">
                <h5 className="font-medium mb-3 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-warning-500 mr-2" />
                  Validation Issues ({calculation.validationIssues.length})
                </h5>
                <div className="space-y-2">
                  {calculation.validationIssues.map((issue) => (
                    <div key={issue.id} className="flex items-start space-x-2">
                      {getValidationIcon(issue)}
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{issue.message}</p>
                        {issue.suggestedAction && (
                          <p className="text-xs text-gray-500 mt-1">{issue.suggestedAction}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculate Button */}
      <div className="flex justify-center">
        <button
          onClick={calculatePIAWE}
          disabled={payslips.length === 0 || isCalculating}
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCalculating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Calculating using {selectedJurisdiction} rules...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate PIAWE ({selectedJurisdiction})
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PIAWECalculator;