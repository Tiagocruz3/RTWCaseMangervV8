import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calculator, DollarSign, AlertTriangle, CheckCircle, Plus, Trash2, Users, Stethoscope, Brain, Building, Scale, Shield, Briefcase, User, X, Phone, Mail, Star } from 'lucide-react';
import { useCaseStore } from '../store/caseStore';
import { useAuthStore } from '../store/authStore';
import { JurisdictionType, ClaimType, EmploymentType, PayPeriod, WagesSalaryInfo, StakeholderType, Stakeholder, PIAWECalculation } from '../types';
import { piaweService } from '../services/piaweService';
import { format, subWeeks } from 'date-fns';
import { supabase } from '../lib/supabase';

const CreateCase = () => {
  const navigate = useNavigate();
  const { createCase } = useCaseStore();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedPIAWE, setEstimatedPIAWE] = useState<number | null>(null);
  const [piaweValidation, setPiaweValidation] = useState<string[]>([]);
  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [currentStakeholder, setCurrentStakeholder] = useState<Partial<Stakeholder>>({
    type: 'gp',
    name: '',
    organization: '',
    title: '',
    phone: '',
    email: '',
    address: '',
    fax: '',
    specialization: '',
    notes: '',
    isPrimary: false,
    isActive: true
  });
  const [consultants, setConsultants] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    // Worker Information
    worker: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: ''
    },
    // Employer Information
    employer: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: ''
    },
    // Case Information
    claimNumber: '',
    injuryDate: '',
    injuryDescription: '',
    firstCertificateDate: '',
    plannedRtwDate: '',
    claimType: 'insured' as ClaimType,
    jurisdiction: 'NSW' as JurisdictionType,
    agent: '', // For insured claims
    workcoverType: 'workcover',
    // Wages & Salary Information
    wagesSalary: {
      employmentType: 'full-time' as EmploymentType,
      payPeriod: 'weekly' as PayPeriod,
      currentSalary: 0,
      ordinaryHourlyRate: 0,
      overtimeRate: 0,
      averageWeeklyHours: 38,
      averageOvertimeHours: 0,
      allowances: {
        shift: 0,
        travel: 0,
        meal: 0,
        uniform: 0,
        other: 0
      },
      bonuses: {
        regular: 0,
        performance: 0,
        annual: 0
      },
      commissions: 0,
      superannuation: 0,
      startDate: '',
      lastPayIncrease: {
        date: '',
        amount: 0,
        reason: ''
      },
      notes: ''
    } as WagesSalaryInfo
  });

  // Insurance agents for insured claims
  const insuranceAgents = [
    'Gallagher Bassett',
    'DXC',
    'Allianz',
    'EML',
    'QBE',
    'WorkCover Queensland',
    'Guild Insurance',
    'CGU',
    'Zurich Insurance Australia'
  ];

  // Stakeholder types
  const stakeholderTypes: { type: StakeholderType; label: string; icon: React.ReactNode; description: string }[] = [
    { type: 'gp', label: 'General Practitioner', icon: <Stethoscope className="h-4 w-4" />, description: 'Primary care physician' },
    { type: 'specialist', label: 'Medical Specialist', icon: <User className="h-4 w-4" />, description: 'Specialist doctor (orthopedic, neurologist, etc.)' },
    { type: 'physiotherapist', label: 'Physiotherapist', icon: <User className="h-4 w-4" />, description: 'Physical therapy provider' },
    { type: 'psychologist', label: 'Psychologist', icon: <Brain className="h-4 w-4" />, description: 'Mental health professional' },
    { type: 'occupational_therapist', label: 'Occupational Therapist', icon: <User className="h-4 w-4" />, description: 'Workplace rehabilitation specialist' },
    { type: 'rehabilitation_provider', label: 'Rehabilitation Provider', icon: <Building className="h-4 w-4" />, description: 'Vocational or medical rehabilitation service' },
    { type: 'legal_representative', label: 'Legal Representative', icon: <Scale className="h-4 w-4" />, description: 'Lawyer or legal advisor' },
    { type: 'union_representative', label: 'Union Representative', icon: <Shield className="h-4 w-4" />, description: 'Worker union representative' },
    { type: 'employer_contact', label: 'Employer Contact', icon: <Briefcase className="h-4 w-4" />, description: 'Additional employer contact person' },
    { type: 'insurance_contact', label: 'Insurance Contact', icon: <Shield className="h-4 w-4" />, description: 'Insurance company representative' },
    { type: 'other', label: 'Other', icon: <User className="h-4 w-4" />, description: 'Other relevant contact' }
  ];

  // Calculate estimated PIAWE when wages/salary data or jurisdiction changes
  useEffect(() => {
    if (formData.wagesSalary.ordinaryHourlyRate > 0 && formData.wagesSalary.averageWeeklyHours > 0) {
      calculateEstimatedPIAWE();
    }
  }, [
    formData.jurisdiction,
    formData.wagesSalary.ordinaryHourlyRate,
    formData.wagesSalary.overtimeRate,
    formData.wagesSalary.averageWeeklyHours,
    formData.wagesSalary.averageOvertimeHours,
    formData.wagesSalary.allowances,
    formData.wagesSalary.bonuses,
    formData.wagesSalary.commissions
  ]);

  useEffect(() => {
    // Fetch consultants and admins
    const fetchConsultants = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .in('role', ['consultant', 'admin']);
      if (data) setConsultants(data);
    };
    fetchConsultants();
  }, []);

  const calculateEstimatedPIAWE = () => {
    try {
      // Generate mock payslips based on wage information
      const mockPayslips = generateMockPayslips();
      
      if (mockPayslips.length === 0) {
        setEstimatedPIAWE(null);
        setPiaweValidation([]);
        return;
      }

      // Calculate PIAWE using jurisdiction-specific rules
      const calculation = piaweService.calculatePIAWE(
        mockPayslips,
        formData.injuryDate || format(new Date(), 'yyyy-MM-dd'),
        formData.jurisdiction
      );

      setEstimatedPIAWE(calculation.finalPIAWE);
      
      // Set validation messages
      const validationMessages = [];
      if (calculation.validationIssues.length > 0) {
        validationMessages.push(...calculation.validationIssues.map(issue => issue.message));
      }
      
      // Add jurisdiction-specific notes
      const jurisdictionRules = piaweService.getJurisdictionRules(formData.jurisdiction);
      validationMessages.push(`Using ${formData.jurisdiction} jurisdiction rules`);
      
      if (jurisdictionRules.cappingRules?.maxWeeklyAmount && calculation.finalPIAWE > jurisdictionRules.cappingRules.maxWeeklyAmount) {
        validationMessages.push(`PIAWE may be capped at $${jurisdictionRules.cappingRules.maxWeeklyAmount} per ${formData.jurisdiction} regulations`);
      }

      setPiaweValidation(validationMessages);
    } catch (error) {
      console.error('Error calculating estimated PIAWE:', error);
      setEstimatedPIAWE(null);
      setPiaweValidation(['Error calculating PIAWE estimate']);
    }
  };

  const generateMockPayslips = () => {
    const { wagesSalary } = formData;
    
    if (wagesSalary.ordinaryHourlyRate <= 0 || wagesSalary.averageWeeklyHours <= 0) {
      return [];
    }

    // Generate 26 weeks of mock payslips based on wage information
    const payslips = [];
    for (let i = 1; i <= 26; i++) {
      const weekEnding = format(subWeeks(new Date(), i), 'yyyy-MM-dd');
      
      // Add some realistic variation
      const hoursVariation = 1 + (Math.random() - 0.5) * 0.1; // ±5% variation
      const ordinaryHours = Math.round(wagesSalary.averageWeeklyHours * hoursVariation);
      const overtimeHours = wagesSalary.averageOvertimeHours + (Math.random() > 0.7 ? Math.random() * 2 : 0);
      
      // Calculate total allowances and bonuses per week
      const totalAllowances = Object.values(wagesSalary.allowances).reduce((sum, val) => sum + val, 0);
      const totalBonuses = Object.values(wagesSalary.bonuses).reduce((sum, val) => sum + val, 0);
      
      const totalGross = 
        ordinaryHours * wagesSalary.ordinaryHourlyRate +
        overtimeHours * wagesSalary.overtimeRate +
        totalAllowances +
        totalBonuses +
        wagesSalary.commissions;

      payslips.push({
        id: `mock-${i}`,
        weekEnding,
        ordinaryHours,
        ordinaryRate: wagesSalary.ordinaryHourlyRate,
        overtimeHours,
        overtimeRate: wagesSalary.overtimeRate,
        allowances: totalAllowances,
        bonuses: totalBonuses,
        commissions: wagesSalary.commissions,
        otherIncome: 0,
        totalGross,
        unpaidLeave: false
      });
    }

    return payslips;
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...((prev[section as keyof typeof prev] || {}) as object),
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section: string, subsection: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...((prev[section as keyof typeof prev] || {}) as object),
        [subsection]: {
          ...(((prev[section as keyof typeof prev] || {}) as any)[subsection] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleStakeholderInputChange = (field: string, value: any) => {
    setCurrentStakeholder(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddStakeholder = () => {
    if (!currentStakeholder.name || !currentStakeholder.phone) return;

    const newStakeholder: Stakeholder = {
      id: `stakeholder-${Date.now()}`,
      type: currentStakeholder.type as StakeholderType,
      name: currentStakeholder.name,
      organization: currentStakeholder.organization || '',
      title: currentStakeholder.title || '',
      phone: currentStakeholder.phone,
      email: currentStakeholder.email || '',
      address: currentStakeholder.address || '',
      fax: currentStakeholder.fax || '',
      specialization: currentStakeholder.specialization || '',
      notes: currentStakeholder.notes || '',
      isPrimary: currentStakeholder.isPrimary || false,
      isActive: true,
      addedDate: new Date().toISOString()
    };

    // If this is set as primary, remove primary status from others of the same type
    let updatedStakeholders = [...stakeholders];
    if (newStakeholder.isPrimary) {
      updatedStakeholders = updatedStakeholders.map(s => 
        s.type === newStakeholder.type ? { ...s, isPrimary: false } : s
      );
    }

    setStakeholders([...updatedStakeholders, newStakeholder]);
    
    // Reset form
    setCurrentStakeholder({
      type: 'gp',
      name: '',
      organization: '',
      title: '',
      phone: '',
      email: '',
      address: '',
      fax: '',
      specialization: '',
      notes: '',
      isPrimary: false,
      isActive: true
    });
    setShowStakeholderForm(false);
  };

  const handleRemoveStakeholder = (id: string) => {
    setStakeholders(stakeholders.filter(s => s.id !== id));
  };

  const getTypeColor = (type: StakeholderType) => {
    const colors = {
      gp: 'bg-blue-100 text-blue-700',
      specialist: 'bg-purple-100 text-purple-700',
      physiotherapist: 'bg-green-100 text-green-700',
      psychologist: 'bg-indigo-100 text-indigo-700',
      occupational_therapist: 'bg-teal-100 text-teal-700',
      rehabilitation_provider: 'bg-orange-100 text-orange-700',
      legal_representative: 'bg-red-100 text-red-700',
      union_representative: 'bg-yellow-100 text-yellow-700',
      employer_contact: 'bg-gray-100 text-gray-700',
      insurance_contact: 'bg-pink-100 text-pink-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || colors.other;
  };

  const getStakeholderTypeInfo = (type: StakeholderType) => {
    return stakeholderTypes.find(t => t.type === type) || stakeholderTypes[stakeholderTypes.length - 1];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate full PIAWE calculation for the case
      let piaweCalculation: PIAWECalculation | undefined = undefined;
      if (estimatedPIAWE) {
        const mockPayslips = generateMockPayslips();
        piaweCalculation = piaweService.calculatePIAWE(
          mockPayslips,
          formData.injuryDate,
          formData.jurisdiction
        );
      }

      const newCase = await createCase({
        worker: {
          ...formData.worker,
          id: `w${Date.now()}`
        },
        employer: {
          ...formData.employer,
          id: `e${Date.now()}`
        },
        caseManager: {
          id: user?.id || 'cm1',
          name: user?.name || 'Case Manager',
          email: user?.email || 'manager@example.com',
          phone: '0400 000 000',
          role: user?.role || 'consultant',
          avatar: user?.avatar
        },
        claimNumber: formData.claimNumber,
        injuryDate: formData.injuryDate,
        injuryDescription: formData.injuryDescription,
        firstCertificateDate: formData.firstCertificateDate,
        plannedRtwDate: formData.plannedRtwDate,
        reviewDates: [],
        documents: [],
        communications: [],
        notes: [],
        stakeholders: stakeholders,
        rtwPlan: {
          id: `rp${Date.now()}`,
          title: 'Initial Return to Work Plan',
          startDate: formData.plannedRtwDate,
          endDate: format(new Date(new Date(formData.plannedRtwDate).getTime() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          goals: ['Facilitate safe return to work', 'Monitor recovery progress'],
          tasks: [],
          reviewDate: format(new Date(new Date(formData.plannedRtwDate).getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          status: 'draft'
        },
        consultant: selectedConsultantId || user?.id || '1',
        status: 'pending',
        claimType: formData.claimType,
        jurisdiction: formData.jurisdiction,
        agent: formData.claimType === 'insured' ? formData.agent : undefined,
        wagesSalary: formData.wagesSalary,
        piaweCalculation: formData.workcoverType === 'workcover' ? piaweCalculation : undefined,
        workcoverType: formData.workcoverType as 'workcover' | 'non-workcover',
      });

      navigate(`/cases/${newCase.id}`);
    } catch (error) {
      console.error('Error creating case:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <button
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          onClick={() => navigate('/cases')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to cases
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Create New Case</h1>
            <p className="text-gray-600">Enter case details and worker information</p>
          </div>
          
          {/* Estimated PIAWE Display */}
          {formData.workcoverType === 'workcover' && estimatedPIAWE && (
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <div className="flex items-center">
                <Calculator className="h-5 w-5 text-primary-600 mr-2" />
                <div>
                  <p className="text-sm text-primary-700">Estimated PIAWE ({formData.jurisdiction})</p>
                  <p className="text-xl font-bold text-primary-900">${estimatedPIAWE.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Case Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Case Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.workcoverType === 'workcover' ? 'Claim Number *' : 'Case Number *'}
              </label>
              <input
                type="text"
                value={formData.claimNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, claimNumber: e.target.value }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jurisdiction *
              </label>
              <select
                value={formData.jurisdiction}
                onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value as JurisdictionType }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              >
                <option value="NSW">New South Wales (NSW)</option>
                <option value="VIC">Victoria (VIC)</option>
                <option value="QLD">Queensland (QLD)</option>
                <option value="WA">Western Australia (WA)</option>
                <option value="SA">South Australia (SA)</option>
                <option value="TAS">Tasmania (TAS)</option>
                <option value="NT">Northern Territory (NT)</option>
                <option value="ACT">Australian Capital Territory (ACT)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claim Type *
              </label>
              <select
                value={formData.claimType}
                onChange={(e) => setFormData(prev => ({ ...prev, claimType: e.target.value as ClaimType }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              >
                <option value="insured">Insured</option>
                <option value="self-insured">Self-Insured</option>
              </select>
            </div>

            {formData.claimType === 'insured' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Agent *
                </label>
                <select
                  value={formData.agent}
                  onChange={(e) => setFormData(prev => ({ ...prev, agent: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  required
                >
                  <option value="">Select an agent...</option>
                  {insuranceAgents.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Injury Date *
              </label>
              <input
                type="date"
                value={formData.injuryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, injuryDate: e.target.value }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Certificate Date *
              </label>
              <input
                type="date"
                value={formData.firstCertificateDate}
                onChange={(e) => setFormData(prev => ({ ...prev, firstCertificateDate: e.target.value }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned RTW Date *
              </label>
              <input
                type="date"
                value={formData.plannedRtwDate}
                onChange={(e) => setFormData(prev => ({ ...prev, plannedRtwDate: e.target.value }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consultant *
              </label>
              <select
                value={selectedConsultantId}
                onChange={e => setSelectedConsultantId(e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              >
                <option value="">Select a consultant...</option>
                {consultants.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Type *
              </label>
              <select
                value={formData.workcoverType}
                onChange={e => setFormData(prev => ({ ...prev, workcoverType: e.target.value }))}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              >
                <option value="workcover">WorkCover</option>
                <option value="non-workcover">Non-WorkCover</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Injury Description *
            </label>
            <textarea
              value={formData.injuryDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, injuryDescription: e.target.value }))}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
              rows={3}
              required
            />
          </div>
        </div>

        {/* Worker Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Worker Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={formData.worker.firstName}
                onChange={(e) => handleInputChange('worker', 'firstName', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.worker.lastName}
                onChange={(e) => handleInputChange('worker', 'lastName', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.worker.email}
                onChange={(e) => handleInputChange('worker', 'email', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                value={formData.worker.phone}
                onChange={(e) => handleInputChange('worker', 'phone', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position *
              </label>
              <input
                type="text"
                value={formData.worker.position}
                onChange={(e) => handleInputChange('worker', 'position', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>
          </div>
        </div>

        {/* Employer Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Employer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.employer.name}
                onChange={(e) => handleInputChange('employer', 'name', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                value={formData.employer.contactPerson}
                onChange={(e) => handleInputChange('employer', 'contactPerson', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.employer.email}
                onChange={(e) => handleInputChange('employer', 'email', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                value={formData.employer.phone}
                onChange={(e) => handleInputChange('employer', 'phone', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <textarea
                value={formData.employer.address}
                onChange={(e) => handleInputChange('employer', 'address', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                rows={2}
                required
              />
            </div>
          </div>
        </div>

        {/* Stakeholders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Users className="h-5 w-5 text-primary-500 mr-2" />
              Key Stakeholders
            </h2>
            <button
              type="button"
              onClick={() => setShowStakeholderForm(true)}
              className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stakeholder
            </button>
          </div>

          {stakeholders.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No stakeholders added yet</p>
              <p className="text-sm text-gray-400 mt-1">Add healthcare providers, legal representatives, and other key contacts</p>
              <button
                type="button"
                onClick={() => setShowStakeholderForm(true)}
                className="mt-4 inline-flex items-center px-3 py-2 bg-primary-100 text-primary-700 rounded-md text-sm font-medium hover:bg-primary-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Stakeholder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stakeholders.map((stakeholder) => {
                const typeInfo = getStakeholderTypeInfo(stakeholder.type);
                
                return (
                  <div
                    key={stakeholder.id}
                    className={`border rounded-lg p-4 ${stakeholder.isPrimary ? 'border-primary-200 bg-primary-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1.5 rounded ${getTypeColor(stakeholder.type)}`}>
                          {typeInfo.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 flex items-center">
                            {stakeholder.name}
                            {stakeholder.isPrimary && (
                              <Star className="h-4 w-4 text-yellow-500 ml-1" />
                            )}
                          </h4>
                          <p className="text-sm text-gray-500">{typeInfo.label}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStakeholder(stakeholder.id)}
                        className="p-1 text-gray-400 hover:text-error-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {stakeholder.organization && (
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Organization:</span> {stakeholder.organization}
                        {stakeholder.title && ` - ${stakeholder.title}`}
                      </div>
                    )}

                    <div className="space-y-1 mb-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {stakeholder.phone}
                      </div>
                      
                      {stakeholder.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {stakeholder.email}
                        </div>
                      )}
                    </div>

                    {stakeholder.notes && (
                      <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                        <span className="font-medium">Notes:</span> {stakeholder.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Stakeholder Form */}
          {showStakeholderForm && (
            <div className="mt-6 border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium">Add New Stakeholder</h3>
                <button
                  type="button"
                  onClick={() => setShowStakeholderForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Stakeholder Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stakeholder Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {stakeholderTypes.map((type) => (
                      <button
                        key={type.type}
                        type="button"
                        onClick={() => handleStakeholderInputChange('type', type.type)}
                        className={`p-3 rounded-md border text-left ${
                          currentStakeholder.type === type.type
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {type.icon}
                          <div>
                            <div className="font-medium text-sm">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={currentStakeholder.name}
                      onChange={(e) => handleStakeholderInputChange('name', e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                      placeholder="Full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title/Position
                    </label>
                    <input
                      type="text"
                      value={currentStakeholder.title}
                      onChange={(e) => handleStakeholderInputChange('title', e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                      placeholder="Dr., Manager, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization/Practice
                    </label>
                    <input
                      type="text"
                      value={currentStakeholder.organization}
                      onChange={(e) => handleStakeholderInputChange('organization', e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                      placeholder="Hospital, clinic, law firm, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={currentStakeholder.specialization}
                      onChange={(e) => handleStakeholderInputChange('specialization', e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                      placeholder="Area of expertise"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={currentStakeholder.phone}
                      onChange={(e) => handleStakeholderInputChange('phone', e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                      placeholder="Phone number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={currentStakeholder.email}
                      onChange={(e) => handleStakeholderInputChange('email', e.target.value)}
                      className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                      placeholder="Email address"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={currentStakeholder.address}
                    onChange={(e) => handleStakeholderInputChange('address', e.target.value)}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                    rows={2}
                    placeholder="Full address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={currentStakeholder.notes}
                    onChange={(e) => handleStakeholderInputChange('notes', e.target.value)}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                    rows={2}
                    placeholder="Additional notes or important information"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentStakeholder.isPrimary}
                      onChange={(e) => handleStakeholderInputChange('isPrimary', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Set as primary contact for this type
                    </span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowStakeholderForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddStakeholder}
                    disabled={!currentStakeholder.name || !currentStakeholder.phone}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Stakeholder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wages & Salary Information */}
        {formData.workcoverType === 'workcover' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <DollarSign className="h-5 w-5 text-primary-500 mr-2" />
                Wages & Salary Information
              </h2>
              {estimatedPIAWE && (
                <div className="text-sm text-primary-600">
                  Auto-calculating PIAWE using {formData.jurisdiction} rules
                </div>
              )}
            </div>

            {/* Employment Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Type *
                </label>
                <select
                  value={formData.wagesSalary.employmentType}
                  onChange={(e) => handleInputChange('wagesSalary', 'employmentType', e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  required
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Period *
                </label>
                <select
                  value={formData.wagesSalary.payPeriod}
                  onChange={(e) => handleInputChange('wagesSalary', 'payPeriod', e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  required
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Start Date *
                </label>
                <input
                  type="date"
                  value={formData.wagesSalary.startDate}
                  onChange={(e) => handleInputChange('wagesSalary', 'startDate', e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  required
                />
              </div>
            </div>

            {/* Hourly Rates and Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordinary Hourly Rate *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.wagesSalary.ordinaryHourlyRate}
                    onChange={(e) => handleInputChange('wagesSalary', 'ordinaryHourlyRate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overtime Rate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.wagesSalary.overtimeRate}
                    onChange={(e) => handleInputChange('wagesSalary', 'overtimeRate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Weekly Hours *
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.wagesSalary.averageWeeklyHours}
                  onChange={(e) => handleInputChange('wagesSalary', 'averageWeeklyHours', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Overtime Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.wagesSalary.averageOvertimeHours}
                  onChange={(e) => handleInputChange('wagesSalary', 'averageOvertimeHours', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                />
              </div>
            </div>

            {/* Allowances */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Weekly Allowances</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Shift Allowance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wagesSalary.allowances.shift}
                      onChange={(e) => handleNestedInputChange('wagesSalary', 'allowances', 'shift', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Travel Allowance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wagesSalary.allowances.travel}
                      onChange={(e) => handleNestedInputChange('wagesSalary', 'allowances', 'travel', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Meal Allowance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wagesSalary.allowances.meal}
                      onChange={(e) => handleNestedInputChange('wagesSalary', 'allowances', 'meal', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Uniform Allowance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wagesSalary.allowances.uniform}
                      onChange={(e) => handleNestedInputChange('wagesSalary', 'allowances', 'uniform', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Other Allowances</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wagesSalary.allowances.other}
                      onChange={(e) => handleNestedInputChange('wagesSalary', 'allowances', 'other', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bonuses and Commissions */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Bonuses & Commissions (Weekly Average)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Regular Bonus</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wagesSalary.bonuses.regular}
                      onChange={(e) => handleNestedInputChange('wagesSalary', 'bonuses', 'regular', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Performance Bonus</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wagesSalary.bonuses.performance}
                      onChange={(e) => handleNestedInputChange('wagesSalary', 'bonuses', 'performance', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Annual Bonus (avg/week)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wagesSalary.bonuses.annual}
                      onChange={(e) => handleNestedInputChange('wagesSalary', 'bonuses', 'annual', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Commissions</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wagesSalary.commissions}
                      onChange={(e) => handleInputChange('wagesSalary', 'commissions', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border border-gray-300 shadow-sm pl-8 pr-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PIAWE Validation Messages */}
            {piaweValidation.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  PIAWE Calculation Notes
                </h4>
                <ul className="space-y-1">
                  {piaweValidation.map((message, index) => (
                    <li key={index} className="text-sm text-blue-700 flex items-start">
                      <span className="mr-2">•</span>
                      {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.wagesSalary.notes}
                onChange={(e) => handleInputChange('wagesSalary', 'notes', e.target.value)}
                className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                rows={3}
                placeholder="Any additional wage or salary information..."
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/cases')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Case...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Case
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCase;