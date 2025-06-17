import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCaseStore } from '../../store/caseStore';
import { format, parseISO } from 'date-fns';
import { FileText, Edit, Calculator, ChevronLeft, Calendar, MessageSquare, Paperclip, DollarSign, Brain, Bell, StickyNote, Upload, Download, Plus, Stethoscope, ClipboardList, FolderOpen, Users, Target, CheckCircle, Clock, AlertTriangle, User, Briefcase, Settings } from 'lucide-react';
import CommunicationLog from './CommunicationLog';
import AddCommunicationModal from './AddCommunicationModal';
import EditKeyDatesModal from './EditKeyDatesModal';
import AIChatAssistant from '../ai/AIChatAssistant';
import AIInsights from '../ai/AIInsights';
import DocumentAnalyzer from '../ai/DocumentAnalyzer';
import EditableField from './EditableField';
import EditableTextArea from './EditableTextArea';
import CaseNotes from './CaseNotes';
import ReviewDatesManager from './ReviewDatesManager';
import SupervisorNotesModal from './SupervisorNotesModal';
import StakeholderManager from './StakeholderManager';
import RTWPlanManager from './RTWPlanManager';
import CaseStatusManager from './CaseStatusManager';
import { Case, Document, CaseStatus } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { supabaseService } from '../../services/supabaseService';
import { aiService } from '../../services/aiService';
import { supabase } from '../../lib/supabase';
import { useState as useReactState } from 'react';

type TabType = 'overview' | 'reviews' | 'case-notes' | 'documents' | 'compensation' | 'ai-insights' | 'stakeholders' | 'rtwc' | 'wages';

const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getCase, updateCase, isLoading, uploadDocument } = useCaseStore();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isAddCommunicationOpen, setIsAddCommunicationOpen] = useState(false);
  const [isEditDatesOpen, setIsEditDatesOpen] = useState(false);
  const [isSupervisorNotesOpen, setIsSupervisorNotesOpen] = useState(false);
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState<'all' | 'medical' | 'clinical' | 'supporting'>('all');
  const [uploadCategory, setUploadCategory] = useState<'medical' | 'clinical' | 'supporting'>('medical');
  const [aiInsightsCache, setAiInsightsCache] = useState<Record<string, any>>({});
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [consultants, setConsultants] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [showConvertToast, setShowConvertToast] = useReactState(false);

  useEffect(() => {
    const fetchCaseData = async () => {
      if (id) {
        const data = await getCase(id);
        if (data) {
          setCaseData(data);
        } else {
          navigate('/cases');
        }
      }
    };
    
    fetchCaseData();
  }, [id, getCase, navigate]);

  // Fetch AI Insights only once per case view
  useEffect(() => {
    if (caseData && caseData.id && !aiInsightsCache[caseData.id]) {
      setAiInsightsLoading(true);
      setAiInsightsError(null);
      aiService.analyzeCase(caseData, undefined)
        .then((result) => {
          setAiInsightsCache((prev) => ({ ...prev, [caseData.id]: result }));
        })
        .catch((err) => {
          setAiInsightsError(err.message || 'Failed to load AI Insights');
        })
        .finally(() => setAiInsightsLoading(false));
    }
  }, [caseData, aiInsightsCache]);

  useEffect(() => {
    // Fetch consultants and admins for reassignment
    const fetchConsultants = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .in('role', ['consultant', 'admin']);
      if (data) setConsultants(data);
    };
    fetchConsultants();
  }, []);

  useEffect(() => {
    if (caseData && caseData.consultant) {
      setSelectedConsultantId(caseData.consultant);
    }
  }, [caseData]);

  const handleUpdateField = async (field: string, value: string) => {
    if (!caseData) return;

    try {
      let updateData: any = {};

      // Handle nested updates
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const parentValue = caseData[parent as keyof Case];
        updateData[parent] = {
          ...((typeof parentValue === 'object' && parentValue !== null) ? parentValue : {}),
          [child]: value
        };
      } else {
        updateData[field] = value;
      }

      await updateCase(caseData.id, updateData);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const refreshCaseData = async () => {
    if (id) {
      const refreshedData = await getCase(id);
      if (refreshedData) {
        setCaseData(refreshedData);
      }
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caseData) return;

    try {
      await uploadDocument(caseData.id, file, uploadCategory);
      await refreshCaseData();
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      e.target.value = '';
    }
  };

  const handleStakeholdersUpdate = async (stakeholders: any[]) => {
    if (!caseData) return;
    
    try {
      await updateCase(caseData.id, { stakeholders });
      await refreshCaseData();
    } catch (error) {
      console.error('Failed to update stakeholders:', error);
    }
  };

  const handleRTWPlanUpdate = async (rtwPlan: any) => {
    if (!caseData) return;
    
    try {
      await updateCase(caseData.id, { rtwPlan });
      await refreshCaseData();
    } catch (error) {
      console.error('Failed to update RTW plan:', error);
    }
  };

  const handleStatusUpdate = async (status: CaseStatus, outcome?: any) => {
    if (!caseData) return;
    
    try {
      const updateData: any = { 
        status,
        updatedAt: new Date().toISOString()
      };
      
      if (outcome) {
        updateData.outcome = outcome;
        
        // Add a communication entry for the status change
        const statusChangeComm = {
          id: `comm-${Date.now()}`,
          type: 'other' as const,
          date: new Date().toISOString(),
          content: `Case status changed to ${status}. Outcome: ${outcome.outcome}. Reason: ${outcome.reason}`,
          author: user?.name || 'System'
        };
        
        updateData.communications = [...caseData.communications, statusChangeComm];
      }
      
      await updateCase(caseData.id, updateData);
      await refreshCaseData();
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  const categorizeDocuments = (documents: Document[]) => {
    const categories = {
      medical: documents.filter(doc => 
        doc.category === 'medical' || 
        doc.name.toLowerCase().includes('certificate') ||
        doc.name.toLowerCase().includes('medical')
      ),
      clinical: documents.filter(doc => 
        doc.name.toLowerCase().includes('report') ||
        doc.name.toLowerCase().includes('assessment') ||
        doc.name.toLowerCase().includes('evaluation') ||
        doc.name.toLowerCase().includes('clinical')
      ),
      supporting: documents.filter(doc => 
        !doc.name.toLowerCase().includes('certificate') &&
        !doc.name.toLowerCase().includes('medical') &&
        !doc.name.toLowerCase().includes('report') &&
        !doc.name.toLowerCase().includes('assessment') &&
        !doc.name.toLowerCase().includes('evaluation') &&
        !doc.name.toLowerCase().includes('clinical')
      )
    };

    return categories;
  };

  const getSupervisorNotesCount = () => {
    if (!caseData?.supervisorNotes) return { total: 0, unread: 0 };
    
    const total = caseData.supervisorNotes.length;
    const unread = caseData.supervisorNotes.filter(note => 
      !note.readBy.includes(user?.id || '')
    ).length;
    
    return { total, unread };
  };

  const handleReassignConsultant = async (newConsultantId: string) => {
    if (!caseData) return;
    setIsReassigning(true);
    try {
      await updateCase(caseData.id, { consultant: newConsultantId });
      await refreshCaseData();
    } catch (err) {
      // Optionally show error
    } finally {
      setIsReassigning(false);
    }
  };

  const handleConvertToClaim = async () => {
    if (!caseData) return;
    try {
      await updateCase(caseData.id, { workcoverType: 'workcover', claimType: 'insured' });
      await refreshCaseData();
      setShowConvertToast(true);
      setTimeout(() => setShowConvertToast(false), 3000);
    } catch (error) {
      console.error('Failed to convert to claim:', error);
    }
  };

  if (isLoading || !caseData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-success-700 bg-success-50 border-success-200';
      case 'closed':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      case 'pending':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText className="h-4 w-4" /> },
    { id: 'reviews', label: 'Review Dates', icon: <Bell className="h-4 w-4" /> },
    { id: 'case-notes', label: 'Case Notes', icon: <StickyNote className="h-4 w-4" /> },
    { id: 'documents', label: 'Case Documents', icon: <Paperclip className="h-4 w-4" /> },
    ...(caseData.workcoverType !== 'non-workcover'
      ? [
          { id: 'compensation', label: 'Compensation & PIAWE', icon: <DollarSign className="h-4 w-4" /> },
        ]
      : [
          { id: 'wages', label: 'Wages', icon: <DollarSign className="h-4 w-4" /> },
        ]),
    { id: 'rtwc', label: 'RTWC', icon: <Target className="h-4 w-4" /> },
    { id: 'stakeholders', label: 'Stakeholders', icon: <Users className="h-4 w-4" /> },
    { id: 'ai-insights', label: 'AI Insights', icon: <Brain className="h-4 w-4" /> }
  ];

  const documentCategories = categorizeDocuments(caseData.documents);
  const filteredDocuments = selectedDocumentCategory === 'all' 
    ? caseData.documents 
    : documentCategories[selectedDocumentCategory];

  const supervisorNotesCount = getSupervisorNotesCount();

  return (
    <div className="space-y-6 animate-fade-in">
      {showConvertToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg transition-all">
          Case successfully converted to WorkCover claim!
        </div>
      )}
      {/* Back Button */}
      <button
        className="flex items-center text-gray-600 hover:text-gray-900"
        onClick={() => navigate('/cases')}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to cases
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {caseData.worker.firstName} {caseData.worker.lastName}
                </h1>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsStatusManagerOpen(true)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 mr-1.5" />
                      Manage Status
                    </div>
                  </button>
                  <button
                    onClick={() => setIsSupervisorNotesOpen(true)}
                    className="relative px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1.5" />
                      Supervisor Notes
                      {supervisorNotesCount.total > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded">
                          {supervisorNotesCount.total}
                        </span>
                      )}
                      {supervisorNotesCount.unread > 0 && (
                        <span className="absolute -top-1 -right-1 block h-4 w-4 rounded-full bg-error-500 text-white text-xs flex items-center justify-center">
                          {supervisorNotesCount.unread}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-50"
                    onClick={() => navigate(`/reports?caseId=${caseData.id}`)}
                  >
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1.5" />
                      Generate Report
                    </div>
                  </button>
                  {caseData.workcoverType !== 'workcover' ? (
                    <button
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                      onClick={handleConvertToClaim}
                    >
                      <div className="flex items-center">
                        <Edit className="h-4 w-4 mr-1.5" />
                        Convert to Claim
                      </div>
                    </button>
                  ) : (
                    <button
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                      onClick={() => navigate(`/cases/${caseData.id}/edit`)}
                    >
                      <div className="flex items-center">
                        <Edit className="h-4 w-4 mr-1.5" />
                        Edit Case
                      </div>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">{caseData.workcoverType === 'workcover' ? 'Claim Number' : 'Case Number'}</span>
                  <span className="font-medium">{caseData.claimNumber}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Case Type</span>
                  <span className="font-medium">{caseData.workcoverType === 'workcover' ? 'WorkCover' : 'Non-WorkCover'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Injury Date</span>
                  <span className="font-medium">
                    {format(parseISO(caseData.injuryDate), 'dd/MM/yyyy')}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Planned RTW Date</span>
                  <span className="font-medium">
                    {format(parseISO(caseData.plannedRtwDate), 'dd/MM/yyyy')}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-2">Status:</span>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(caseData.status)}`}>
                    {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Consultant</span>
                  {user?.role === 'admin' ? (
                    <select
                      value={selectedConsultantId}
                      onChange={e => {
                        setSelectedConsultantId(e.target.value);
                        handleReassignConsultant(e.target.value);
                      }}
                      className="font-medium rounded border border-gray-300 px-2 py-1 text-sm"
                      disabled={isReassigning}
                    >
                      {consultants.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium">{consultants.find(c => c.id === caseData.consultant)?.name || 'N/A'}</span>
                  )}
                </div>
              </div>

              {/* Case Outcome Display */}
              {(caseData as any).outcome && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Case Outcome</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Outcome:</span>
                      <p className="font-medium">{(caseData as any).outcome.outcome}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Effective Date:</span>
                      <p className="font-medium">
                        {format(parseISO((caseData as any).outcome.effectiveDate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Completed By:</span>
                      <p className="font-medium">{(caseData as any).outcome.completedBy}</p>
                    </div>
                  </div>
                  {(caseData as any).outcome.rtwDate && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">RTW Date:</span>
                      <span className="font-medium ml-2">
                        {format(parseISO((caseData as any).outcome.rtwDate), 'dd/MM/yyyy')}
                      </span>
                      {(caseData as any).outcome.durationWeeks && (
                        <span className="text-gray-500 ml-4">
                          Duration: {(caseData as any).outcome.durationWeeks} weeks
                        </span>
                      )}
                    </div>
                  )}
                  {(caseData as any).outcome.details && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">{(caseData as any).outcome.details}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'stakeholders' && caseData.stakeholders && caseData.stakeholders.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {caseData.stakeholders.length}
                  </span>
                )}
                {tab.id === 'rtwc' && caseData.rtwPlan.tasks.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {caseData.rtwPlan.tasks.filter(t => !t.completed).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Worker Information */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Worker Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField
                    label="First Name"
                    value={caseData.worker.firstName}
                    onSave={(value) => handleUpdateField('worker.firstName', value)}
                  />
                  <EditableField
                    label="Last Name"
                    value={caseData.worker.lastName}
                    onSave={(value) => handleUpdateField('worker.lastName', value)}
                  />
                  <EditableField
                    label="Email"
                    type="email"
                    value={caseData.worker.email}
                    onSave={(value) => handleUpdateField('worker.email', value)}
                  />
                  <EditableField
                    label="Phone"
                    type="tel"
                    value={caseData.worker.phone}
                    onSave={(value) => handleUpdateField('worker.phone', value)}
                  />
                  <EditableField
                    label="Position"
                    value={caseData.worker.position}
                    onSave={(value) => handleUpdateField('worker.position', value)}
                  />
                </div>
                
                <div className="mt-4">
                  <EditableTextArea
                    label="Injury Description"
                    value={caseData.injuryDescription}
                    onSave={(value) => handleUpdateField('injuryDescription', value)}
                  />
                </div>
              </div>

              {/* Employer Information */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Employer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField
                    label="Company Name"
                    value={caseData.employer.name}
                    onSave={(value) => handleUpdateField('employer.name', value)}
                  />
                  <EditableField
                    label="Contact Person"
                    value={caseData.employer.contactPerson}
                    onSave={(value) => handleUpdateField('employer.contactPerson', value)}
                  />
                  <EditableField
                    label="Email"
                    type="email"
                    value={caseData.employer.email}
                    onSave={(value) => handleUpdateField('employer.email', value)}
                  />
                  <EditableField
                    label="Phone"
                    type="tel"
                    value={caseData.employer.phone}
                    onSave={(value) => handleUpdateField('employer.phone', value)}
                  />
                </div>
                
                <div className="mt-4">
                  <EditableTextArea
                    label="Address"
                    value={caseData.employer.address}
                    onSave={(value) => handleUpdateField('employer.address', value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* RTW Plan Summary */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Return to Work Plan Summary</h3>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    caseData.rtwPlan.status === 'active' 
                      ? 'bg-success-100 text-success-800' 
                      : caseData.rtwPlan.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-warning-100 text-warning-800'
                  }`}>
                    {caseData.rtwPlan.status.charAt(0).toUpperCase() + caseData.rtwPlan.status.slice(1)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Start Date</label>
                    <p className="mt-1">{format(parseISO(caseData.rtwPlan.startDate), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">End Date</label>
                    <p className="mt-1">{format(parseISO(caseData.rtwPlan.endDate), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Review Date</label>
                    <p className="mt-1">{format(parseISO(caseData.rtwPlan.reviewDate), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-2">Goals</label>
                  <ul className="list-disc list-inside space-y-1">
                    {caseData.rtwPlan.goals.map((goal, index) => (
                      <li key={index} className="text-sm">{goal}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex justify-end">
                  <button
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                    onClick={() => setActiveTab('rtwc')}
                  >
                    <div className="flex items-center">
                      <Target className="h-4 w-4 mr-1.5" />
                      View Full RTWC
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <ReviewDatesManager
                caseId={caseData.id}
                reviewDates={caseData.reviewDates}
                onUpdate={refreshCaseData}
              />
            </div>
          )}

          {activeTab === 'case-notes' && (
            <div className="space-y-6">
              {/* Communications Section */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Communications Log</h3>
                  <button
                    onClick={() => setIsAddCommunicationOpen(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                  >
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1.5" />
                      Add Communication
                    </div>
                  </button>
                </div>

                {caseData.communications.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No communications logged yet</p>
                  </div>
                ) : (
                  <CommunicationLog communications={caseData.communications} />
                )}
              </div>

              {/* Case Notes Section */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Internal Notes</h3>
                <CaseNotes
                  notes={caseData.notes || []}
                  onAddNote={async (content) => {
                    try {
                      await useCaseStore.getState().addNote(caseData.id, content);
                      await refreshCaseData();
                    } catch (error) {
                      console.error('Failed to add note:', error);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Document Categories */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setSelectedDocumentCategory('all')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${
                      selectedDocumentCategory === 'all'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      All Documents ({caseData.documents.length})
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedDocumentCategory('medical')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${
                      selectedDocumentCategory === 'medical'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Medical Certificates ({documentCategories.medical.length})
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedDocumentCategory('clinical')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${
                      selectedDocumentCategory === 'clinical'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <Stethoscope className="h-4 w-4 mr-2" />
                      Clinical Reports ({documentCategories.clinical.length})
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedDocumentCategory('supporting')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${
                      selectedDocumentCategory === 'supporting'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Supporting Documents ({documentCategories.supporting.length})
                    </div>
                  </button>
                </div>
              </div>

              {/* Single Upload Section */}
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Document</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Category
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="uploadCategory"
                          value="medical"
                          checked={uploadCategory === 'medical'}
                          onChange={(e) => setUploadCategory(e.target.value as 'medical' | 'clinical' | 'supporting')}
                          className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        />
                        <div className="ml-3 flex items-center">
                          <FileText className="h-4 w-4 text-success-600 mr-2" />
                          <span className="text-sm font-medium text-gray-700">Medical Certificates</span>
                        </div>
                      </label>
                      <p className="ml-7 text-xs text-gray-500">Medical certificates, work capacity evaluations</p>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="uploadCategory"
                          value="clinical"
                          checked={uploadCategory === 'clinical'}
                          onChange={(e) => setUploadCategory(e.target.value as 'medical' | 'clinical' | 'supporting')}
                          className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        />
                        <div className="ml-3 flex items-center">
                          <Stethoscope className="h-4 w-4 text-primary-600 mr-2" />
                          <span className="text-sm font-medium text-gray-700">Clinical Reports</span>
                        </div>
                      </label>
                      <p className="ml-7 text-xs text-gray-500">Specialist reports, assessments, evaluations</p>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="uploadCategory"
                          value="supporting"
                          checked={uploadCategory === 'supporting'}
                          onChange={(e) => setUploadCategory(e.target.value as 'medical' | 'clinical' | 'supporting')}
                          className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        />
                        <div className="ml-3 flex items-center">
                          <ClipboardList className="h-4 w-4 text-gray-600 mr-2" />
                          <span className="text-sm font-medium text-gray-700">Supporting Documents</span>
                        </div>
                      </label>
                      <p className="ml-7 text-xs text-gray-500">Forms, correspondence, other documents</p>
                    </div>
                  </div>

                  {/* Upload Area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File
                    </label>
                    <label className="cursor-pointer flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-100 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700">Click to upload</span>
                      <span className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocumentUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Documents Grid */}
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <Paperclip className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No {selectedDocumentCategory === 'all' ? '' : selectedDocumentCategory + ' '}documents
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Upload documents to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map(doc => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          {selectedDocumentCategory === 'medical' || doc.name.toLowerCase().includes('certificate') ? (
                            <FileText className="h-5 w-5 text-success-600 mr-2" />
                          ) : selectedDocumentCategory === 'clinical' || doc.name.toLowerCase().includes('report') ? (
                            <Stethoscope className="h-5 w-5 text-primary-600 mr-2" />
                          ) : (
                            <ClipboardList className="h-5 w-5 text-gray-600 mr-2" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm leading-tight">{doc.name}</h4>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-800 text-xs font-medium border border-primary-100 rounded px-2 py-1"
                            title="View document"
                          >
                            View
                          </a>
                          <a
                            href={doc.url}
                            download={doc.name}
                            className="text-gray-600 hover:text-primary-700 text-xs font-medium border border-gray-200 rounded px-2 py-1"
                            title="Download document"
                          >
                            Download
                          </a>
                          {(user?.id === caseData.caseManager.id || user?.id === caseData.consultant) && (
                            <button
                              className="text-red-600 hover:text-white hover:bg-red-600 text-xs font-medium border border-red-200 rounded px-2 py-1"
                              title="Delete document"
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this document?')) {
                                  try {
                                    console.log('Attempting to delete document:', doc.id, 'by user:', user, 'for case:', caseData.id);
                                    await supabaseService.deleteDocument(doc.id);
                                    await refreshCaseData();
                                  } catch (error: any) {
                                    console.error('Failed to delete document:', {
                                      error,
                                      docId: doc.id,
                                      user,
                                      caseId: caseData.id
                                    });
                                    alert(
                                      'Failed to delete document.\n' +
                                      (error?.name ? `Error: ${error.name}\n` : '') +
                                      (error?.message ? `Message: ${error.message}\n` : error) +
                                      (error?.stack ? `\nStack: ${error.stack}` : '')
                                    );
                                  }
                                }
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          {format(parseISO(doc.uploadDate), 'dd/MM/yyyy')} • {Math.round(doc.size / 1024)} KB
                        </p>
                        
                        {doc.category && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {doc.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'compensation' && caseData.workcoverType !== 'non-workcover' && (
            <div className="space-y-6">
              {caseData.piaweCalculation ? (
                <div className="space-y-4">
                  <div className="bg-primary-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-primary-900">Current PIAWE</h4>
                        <p className="text-3xl font-bold text-primary-900">
                          ${caseData.piaweCalculation.finalPIAWE.toFixed(2)}
                        </p>
                        <p className="text-sm text-primary-700">
                          {caseData.piaweCalculation.methodUsed}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-primary-600">Jurisdiction</p>
                        <p className="font-medium text-primary-900">{caseData.piaweCalculation.jurisdiction}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium mb-3">52-Week Period</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Earnings:</span>
                          <span>${caseData.piaweCalculation.calculations.period52Week.totalEarnings.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Included Weeks:</span>
                          <span>{caseData.piaweCalculation.calculations.period52Week.includedWeeks}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Average Weekly:</span>
                          <span>${caseData.piaweCalculation.calculations.period52Week.averageWeekly.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium mb-3">13-Week Period</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Earnings:</span>
                          <span>${caseData.piaweCalculation.calculations.period13Week.totalEarnings.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Included Weeks:</span>
                          <span>{caseData.piaweCalculation.calculations.period13Week.includedWeeks}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Average Weekly:</span>
                          <span>${caseData.piaweCalculation.calculations.period13Week.averageWeekly.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => navigate(`/cases/${caseData.id}/piawe`)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => navigate(`/cases/${caseData.id}/piawe`)}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      <div className="flex items-center">
                        <Calculator className="h-4 w-4 mr-1.5" />
                        Recalculate
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No PIAWE calculation available</h3>
                  <p className="text-gray-500 mb-6">
                    {caseData.wagesSalary ? 
                      'PIAWE can be calculated from the wages & salary information provided' :
                      'Add wages & salary information to calculate PIAWE'
                    }
                  </p>
                  <button
                    onClick={() => navigate(`/cases/${caseData.id}/piawe`)}
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                  >
                    <Calculator className="h-5 w-5 mr-2" />
                    Calculate PIAWE
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wages' && caseData.workcoverType === 'non-workcover' && (
            <div className="space-y-6">
              <div className="bg-primary-50 rounded-lg p-6">
                <h4 className="font-medium text-primary-900">Wages Information</h4>
                {caseData.wagesSalary ? (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditableField
                      label="Employment Type"
                      value={String(caseData.wagesSalary.employmentType || '')}
                      onSave={value => handleUpdateField('wagesSalary.employmentType', value)}
                    />
                    <EditableField
                      label="Pay Period"
                      value={String(caseData.wagesSalary.payPeriod || '')}
                      onSave={value => handleUpdateField('wagesSalary.payPeriod', value)}
                    />
                    <EditableField
                      label="Current Salary"
                      value={String(caseData.wagesSalary.currentSalary ?? '')}
                      onSave={value => handleUpdateField('wagesSalary.currentSalary', Number(value))}
                    />
                    <EditableField
                      label="Ordinary Hourly Rate"
                      value={String(caseData.wagesSalary.ordinaryHourlyRate ?? '')}
                      onSave={value => handleUpdateField('wagesSalary.ordinaryHourlyRate', Number(value))}
                    />
                    <EditableField
                      label="Average Weekly Hours"
                      value={String(caseData.wagesSalary.averageWeeklyHours ?? '')}
                      onSave={value => handleUpdateField('wagesSalary.averageWeeklyHours', Number(value))}
                    />
                    <EditableField
                      label="Allowances (Total)"
                      value={String(Object.values(caseData.wagesSalary.allowances || {}).reduce((a, b) => a + b, 0))}
                      onSave={() => {}}
                      disabled
                    />
                    <EditableField
                      label="Bonuses (Total)"
                      value={String(Object.values(caseData.wagesSalary.bonuses || {}).reduce((a, b) => a + b, 0))}
                      onSave={() => {}}
                      disabled
                    />
                    <EditableField
                      label="Commissions"
                      value={String(caseData.wagesSalary.commissions ?? '')}
                      onSave={value => handleUpdateField('wagesSalary.commissions', Number(value))}
                    />
                    <EditableField
                      label="Superannuation"
                      value={String(caseData.wagesSalary.superannuation ?? '')}
                      onSave={value => handleUpdateField('wagesSalary.superannuation', Number(value))}
                    />
                    <EditableTextArea
                      label="Notes"
                      value={String(caseData.wagesSalary.notes || '')}
                      onSave={value => handleUpdateField('wagesSalary.notes', value)}
                    />
                  </div>
                ) : (
                  <p className="text-gray-600">No wages information available for this case.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rtwc' && (
            <div>
              <RTWPlanManager
                rtwPlan={caseData.rtwPlan}
                caseId={caseData.id}
                workerName={`${caseData.worker.firstName} ${caseData.worker.lastName}`}
                onUpdate={handleRTWPlanUpdate}
              />
            </div>
          )}

          {activeTab === 'ai-insights' && (
            <div className="flex flex-col md:flex-row gap-6 h-[600px]">
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white h-full flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex items-center bg-gray-50">
                    <span className="text-lg font-semibold flex items-center">
                      <span className="inline-block w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                      AI Insights
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    <AIInsights
                      caseData={caseData}
                      cachedInsights={aiInsightsCache[caseData.id]}
                      isLoading={aiInsightsLoading}
                      error={aiInsightsError}
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white h-full flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex items-center bg-gray-50">
                    <span className="text-lg font-semibold flex items-center">
                      <span className="inline-block w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                      AI Chat Assistant
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <AIChatAssistant caseId={caseData.id} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stakeholders' && (
            <div>
              <StakeholderManager
                stakeholders={caseData.stakeholders || []}
                onUpdate={handleStakeholdersUpdate}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isAddCommunicationOpen && (
        <AddCommunicationModal
          isOpen={isAddCommunicationOpen}
          onClose={() => setIsAddCommunicationOpen(false)}
          caseId={caseData.id}
        />
      )}

      {isEditDatesOpen && (
        <EditKeyDatesModal
          isOpen={isEditDatesOpen}
          onClose={() => setIsEditDatesOpen(false)}
          caseData={caseData}
        />
      )}

      {isSupervisorNotesOpen && (
        <SupervisorNotesModal
          isOpen={isSupervisorNotesOpen}
          onClose={() => {
            setIsSupervisorNotesOpen(false);
            refreshCaseData(); // Refresh to update unread counts
          }}
          caseId={caseData.id}
          workerName={`${caseData.worker.firstName} ${caseData.worker.lastName}`}
        />
      )}

      {isStatusManagerOpen && (
        <CaseStatusManager
          caseData={caseData}
          onStatusUpdate={handleStatusUpdate}
          isOpen={isStatusManagerOpen}
          onClose={() => setIsStatusManagerOpen(false)}
        />
      )}
    </div>
  );
};

export default CaseDetail;