import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, AlertTriangle, Clock, Search, Filter, Plus, Send, ThumbsUp, ThumbsDown, User, Briefcase, Calendar, Eye, Flag, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCaseStore } from '../store/caseStore';
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface QAItem {
  id: string;
  type: 'question' | 'feedback' | 'audit' | 'flag';
  title: string;
  description: string;
  category: 'case_management' | 'compliance' | 'documentation' | 'communication' | 'rtw_planning' | 'piawe' | 'medical';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  submittedBy: string;
  submittedAt: string;
  assignedTo?: string;
  caseId?: string;
  consultantId?: string;
  responses: QAResponse[];
  tags: string[];
  rating?: number;
  dueDate?: string;
}

interface QAResponse {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  isOfficial: boolean;
  helpful: number;
  notHelpful: number;
}

interface ConsultantPerformance {
  consultantId: string;
  consultantName: string;
  totalCases: number;
  openIssues: number;
  overdueActions: number;
  qualityScore: number;
  avgResponseTime: number;
  recentActivity: string;
  flaggedCases: string[];
}

interface CaseFlag {
  id: string;
  caseId: string;
  workerName: string;
  consultantName: string;
  flagType: 'overdue_review' | 'missing_docs' | 'compliance_issue' | 'quality_concern' | 'urgent_action';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  createdAt: string;
  dueDate?: string;
  status: 'open' | 'acknowledged' | 'resolved';
}

const QualityControl = () => {
  const { user } = useAuthStore();
  const { cases, fetchCases } = useCaseStore();
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [caseFlags, setCaseFlags] = useState<CaseFlag[]>([]);
  const [consultantPerformance, setConsultantPerformance] = useState<ConsultantPerformance[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewQA, setShowNewQA] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QAItem | null>(null);
  const [newResponse, setNewResponse] = useState('');
  const [activeTab, setActiveTab] = useState<'qa' | 'flags' | 'performance'>('flags');
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [newQATitle, setNewQATitle] = useState('');
  const [newQADescription, setNewQADescription] = useState('');
  const [newQACategory, setNewQACategory] = useState('case_management');
  const [newQAPriority, setNewQAPriority] = useState('medium');
  const [newQAError, setNewQAError] = useState('');

  // Initialize data when component mounts
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        await fetchCases();
        // Fetch all users for consultant filter
        const { data } = await supabase.from('profiles').select('*');
        if (data) setUsers(data);
      } catch (error) {
        console.error('Error fetching cases or users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [fetchCases]);

  // If not admin, force selectedConsultant to current user
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setSelectedConsultant(user.id);
    }
  }, [user]);

  // Generate case flags and performance data when cases are loaded
  useEffect(() => {
    if (cases.length > 0) {
      generateCaseFlags();
      calculateConsultantPerformance();
      generateQAItems();
    }
  }, [cases]);

  const generateCaseFlags = () => {
    const flags: CaseFlag[] = [];
    
    cases.forEach(caseItem => {
      const consultantUser = users.find(u => u.id === caseItem.consultant);
      const consultantName = consultantUser ? `${consultantUser.name} (${consultantUser.role})` : 'Unknown';
      const workerName = `${caseItem.worker.firstName} ${caseItem.worker.lastName}`;
      
      // Check for overdue reviews
      caseItem.reviewDates.forEach(reviewDate => {
        const date = parseISO(reviewDate);
        if (isPast(date)) {
          const daysOverdue = differenceInDays(new Date(), date);
          flags.push({
            id: `flag-review-${caseItem.id}-${reviewDate}`,
            caseId: caseItem.id,
            workerName,
            consultantName,
            flagType: 'overdue_review',
            severity: daysOverdue > 14 ? 'critical' : daysOverdue > 7 ? 'high' : 'medium',
            description: `RTW Review overdue by ${daysOverdue} days`,
            createdAt: new Date().toISOString(),
            dueDate: reviewDate,
            status: 'open'
          });
        }
      });

      // Check for overdue RTW plan tasks
      caseItem.rtwPlan.tasks.forEach(task => {
        if (!task.completed && isPast(parseISO(task.dueDate))) {
          const daysOverdue = differenceInDays(new Date(), parseISO(task.dueDate));
          flags.push({
            id: `flag-task-${task.id}`,
            caseId: caseItem.id,
            workerName,
            consultantName,
            flagType: 'urgent_action',
            severity: daysOverdue > 7 ? 'critical' : 'high',
            description: `Task overdue: ${task.title} (${daysOverdue} days)`,
            createdAt: new Date().toISOString(),
            dueDate: task.dueDate,
            status: 'open'
          });
        }
      });

      // Check for missing documentation
      if (caseItem.documents.length === 0) {
        flags.push({
          id: `flag-docs-${caseItem.id}`,
          caseId: caseItem.id,
          workerName,
          consultantName,
          flagType: 'missing_docs',
          severity: 'medium',
          description: 'No supporting documents uploaded',
          createdAt: new Date().toISOString(),
          status: 'open'
        });
      }

      // Check for recent injuries without initial contact
      const injuryDate = parseISO(caseItem.injuryDate);
      const daysSinceInjury = differenceInDays(new Date(), injuryDate);
      
      if (daysSinceInjury <= 7 && caseItem.communications.length === 0) {
        flags.push({
          id: `flag-contact-${caseItem.id}`,
          caseId: caseItem.id,
          workerName,
          consultantName,
          flagType: 'compliance_issue',
          severity: 'high',
          description: 'No initial contact recorded within 7 days of injury',
          createdAt: new Date().toISOString(),
          status: 'open'
        });
      }

      // Check for PIAWE calculation issues
      if (!caseItem.piaweCalculation && caseItem.wagesSalary) {
        flags.push({
          id: `flag-piawe-${caseItem.id}`,
          caseId: caseItem.id,
          workerName,
          consultantName,
          flagType: 'quality_concern',
          severity: 'medium',
          description: 'PIAWE calculation missing despite wage information available',
          createdAt: new Date().toISOString(),
          status: 'open'
        });
      }
    });

    setCaseFlags(flags);
  };

  const calculateConsultantPerformance = () => {
    const consultantMap = new Map<string, ConsultantPerformance>();

    cases.forEach(caseItem => {
      const consultantId = caseItem.consultant;
      const consultantUser = users.find(u => u.id === consultantId);
      const consultantName = consultantUser ? `${consultantUser.name} (${consultantUser.role})` : 'Unknown';

      if (!consultantMap.has(consultantId)) {
        consultantMap.set(consultantId, {
          consultantId,
          consultantName,
          totalCases: 0,
          openIssues: 0,
          overdueActions: 0,
          qualityScore: 85,
          avgResponseTime: 24,
          recentActivity: caseItem.updatedAt,
          flaggedCases: []
        });
      }

      const performance = consultantMap.get(consultantId)!;
      performance.totalCases++;

      // Count overdue actions
      caseItem.rtwPlan.tasks.forEach(task => {
        if (!task.completed && isPast(parseISO(task.dueDate))) {
          performance.overdueActions++;
        }
      });

      // Count overdue reviews
      caseItem.reviewDates.forEach(reviewDate => {
        if (isPast(parseISO(reviewDate))) {
          performance.overdueActions++;
        }
      });

      // Check for flagged cases
      const hasCriticalIssues = caseFlags.some(flag => 
        flag.caseId === caseItem.id && flag.severity === 'critical'
      );
      
      if (hasCriticalIssues) {
        performance.flaggedCases.push(caseItem.id);
        performance.openIssues++;
      }
    });

    setConsultantPerformance(Array.from(consultantMap.values()));
  };

  const generateQAItems = () => {
    const mockQAItems: QAItem[] = [
      {
        id: 'qa1',
        type: 'question',
        title: 'PIAWE calculation for casual workers',
        description: 'How should we handle PIAWE calculations for casual workers with irregular hours?',
        category: 'piawe',
        priority: 'medium',
        status: 'resolved',
        submittedBy: 'Sarah Johnson',
        submittedAt: '2025-01-15T10:30:00Z',
        assignedTo: 'Quality Team',
        caseId: cases.length > 0 ? cases[0].id : '1',
        consultantId: '1',
        responses: [
          {
            id: 'r1',
            content: 'For casual workers, use the 13-week average if they have consistent work patterns. If irregular, consider the full 52-week period and exclude weeks with no work.',
            author: 'Quality Manager',
            createdAt: '2025-01-15T14:20:00Z',
            isOfficial: true,
            helpful: 8,
            notHelpful: 0
          }
        ],
        tags: ['piawe', 'casual-workers', 'calculation'],
        rating: 5
      },
      {
        id: 'qa2',
        type: 'flag',
        title: 'Compliance concern - Missing initial contact',
        description: 'Case shows no communication within 48 hours of claim receipt',
        category: 'compliance',
        priority: 'high',
        status: 'open',
        submittedBy: 'System',
        submittedAt: '2025-01-16T09:15:00Z',
        caseId: cases.length > 2 ? cases[2].id : '3',
        consultantId: '1',
        responses: [],
        tags: ['compliance', 'initial-contact', 'timing'],
        dueDate: '2025-01-17T17:00:00Z'
      },
      {
        id: 'qa3',
        type: 'audit',
        title: 'Documentation quality review',
        description: 'RTW plan lacks specific measurable goals and timelines',
        category: 'documentation',
        priority: 'medium',
        status: 'in_review',
        submittedBy: 'Audit Team',
        submittedAt: '2025-01-14T11:30:00Z',
        caseId: cases.length > 1 ? cases[1].id : '2',
        consultantId: '1',
        responses: [
          {
            id: 'r3',
            content: 'Updated RTW plan template has been provided with SMART goal examples.',
            author: 'Training Manager',
            createdAt: '2025-01-14T15:45:00Z',
            isOfficial: true,
            helpful: 3,
            notHelpful: 0
          }
        ],
        tags: ['documentation', 'rtw-plan', 'goals']
      }
    ];
    setQaItems(mockQAItems);
  };

  const handleSubmitResponse = () => {
    if (!selectedItem || !newResponse.trim()) return;

    const response: QAResponse = {
      id: `r${Date.now()}`,
      content: newResponse,
      author: user?.name || 'Anonymous',
      createdAt: new Date().toISOString(),
      isOfficial: user?.role === 'admin',
      helpful: 0,
      notHelpful: 0
    };

    setQaItems(prev => prev.map(item => 
      item.id === selectedItem.id 
        ? { ...item, responses: [...item.responses, response] }
        : item
    ));

    setNewResponse('');
  };

  const handleVote = (responseId: string, type: 'helpful' | 'notHelpful') => {
    if (!selectedItem) return;

    setQaItems(prev => prev.map(item => 
      item.id === selectedItem.id 
        ? {
            ...item,
            responses: item.responses.map(response =>
              response.id === responseId
                ? {
                    ...response,
                    [type]: response[type] + 1
                  }
                : response
            )
          }
        : item
    ));

    // Update selected item
    setSelectedItem(prev => prev ? {
      ...prev,
      responses: prev.responses.map(response =>
        response.id === responseId
          ? {
              ...response,
              [type]: response[type] + 1
            }
          : response
      )
    } : null);
  };

  const handleCreateQA = () => {
    if (!newQATitle.trim() || !newQADescription.trim()) {
      setNewQAError('Title and description are required.');
      return;
    }
    const qaItem = {
      id: `qa${Date.now()}`,
      type: 'question' as 'question',
      title: newQATitle,
      description: newQADescription,
      category: newQACategory as QAItem['category'],
      priority: newQAPriority as QAItem['priority'],
      status: 'open' as QAItem['status'],
      submittedBy: user?.name || 'Anonymous',
      submittedAt: new Date().toISOString(),
      assignedTo: user?.role === 'admin' ? '' : user?.name,
      caseId: '',
      consultantId: user?.id,
      responses: [],
      tags: [],
      rating: 0
    } as QAItem;
    setQaItems(prev => [qaItem, ...prev]);
    setShowNewQA(false);
    setNewQATitle('');
    setNewQADescription('');
    setNewQACategory('case_management');
    setNewQAPriority('medium');
    setNewQAError('');
  };

  const filteredItems = qaItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesConsultant = selectedConsultant === 'all' || item.consultantId === selectedConsultant;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesStatus && matchesConsultant && matchesSearch;
  });

  const filteredFlags = caseFlags.filter(flag => {
    const matchesConsultant = selectedConsultant === 'all' || 
      cases.find(c => c.id === flag.caseId)?.consultant === selectedConsultant;
    const matchesSearch = searchQuery === '' ||
      flag.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesConsultant && matchesSearch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'high':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'medium':
        return 'text-primary-600 bg-primary-50 border-primary-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getFlagIcon = (flagType: string) => {
    switch (flagType) {
      case 'overdue_review':
        return <Calendar className="h-4 w-4" />;
      case 'missing_docs':
        return <AlertTriangle className="h-4 w-4" />;
      case 'compliance_issue':
        return <Flag className="h-4 w-4" />;
      case 'quality_concern':
        return <Eye className="h-4 w-4" />;
      case 'urgent_action':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-success-600';
    if (score >= 75) return 'text-warning-600';
    return 'text-error-600';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <MessageSquare className="h-6 w-6 text-primary-500 mr-2" />
            Quality Control & Case Management
          </h1>
          <p className="text-gray-600">Monitor consultant performance and case quality</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {caseFlags.filter(f => f.severity === 'critical').length} Critical Issues
          </span>
          <span className="text-sm text-gray-500">•</span>
          <span className="text-sm text-gray-500">
            {caseFlags.filter(f => f.status === 'open').length} Open Flags
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('flags')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'flags'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <Flag className="h-4 w-4 mr-2" />
                Case Flags ({caseFlags.filter(f => f.status === 'open').length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Performance ({consultantPerformance.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'qa'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Q&A ({qaItems.filter(q => q.status === 'open').length})
              </div>
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                  placeholder="Search cases, consultants..."
                />
              </div>
            </div>
            
            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consultant</label>
                <select
                  value={selectedConsultant}
                  onChange={(e) => setSelectedConsultant(e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                >
                  <option value="all">All Consultants</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}
            
            {activeTab === 'qa' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="case_management">Case Management</option>
                    <option value="compliance">Compliance</option>
                    <option value="documentation">Documentation</option>
                    <option value="communication">Communication</option>
                    <option value="rtw_planning">RTW Planning</option>
                    <option value="piawe">PIAWE</option>
                    <option value="medical">Medical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_review">In Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'flags' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Case Flags & Outstanding Actions</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-error-500 rounded-full mr-2"></span>
                    {caseFlags.filter(f => f.severity === 'critical').length} Critical
                  </span>
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-warning-500 rounded-full mr-2"></span>
                    {caseFlags.filter(f => f.severity === 'high').length} High
                  </span>
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                    {caseFlags.filter(f => f.severity === 'medium').length} Medium
                  </span>
                </div>
              </div>

              {filteredFlags.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success-400 mx-auto mb-3" />
                  <p className="text-gray-500">No outstanding flags</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className={`p-4 rounded-lg border ${getSeverityColor(flag.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`p-1 rounded ${
                            flag.severity === 'critical' ? 'text-error-600' : 
                            flag.severity === 'high' ? 'text-warning-600' : 'text-primary-600'
                          }`}>
                            {getFlagIcon(flag.flagType)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">{flag.workerName}</h4>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(flag.severity)}`}>
                                {flag.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{flag.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Consultant: {flag.consultantName}</span>
                              <span>Type: {flag.flagType.replace('_', ' ')}</span>
                              {flag.dueDate && (
                                <span className="text-error-600 font-medium">
                                  Due: {format(parseISO(flag.dueDate), 'dd/MM/yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/cases/${flag.caseId}`}
                            className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Case
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Consultant Performance Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {consultantPerformance.map((consultant) => (
                  <div key={consultant.consultantId} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="ml-3">
                          <h4 className="font-medium text-gray-900">{consultant.consultantName}</h4>
                          <p className="text-sm text-gray-500">{consultant.totalCases} cases</p>
                        </div>
                      </div>
                      <div className={`text-right ${getPerformanceColor(consultant.qualityScore)}`}>
                        <div className="text-lg font-bold">{consultant.qualityScore}%</div>
                        <div className="text-xs">Quality Score</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Open Issues:</span>
                        <span className={`font-medium ${consultant.openIssues > 0 ? 'text-error-600' : 'text-success-600'}`}>
                          {consultant.openIssues}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Overdue Actions:</span>
                        <span className={`font-medium ${consultant.overdueActions > 0 ? 'text-warning-600' : 'text-success-600'}`}>
                          {consultant.overdueActions}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Response:</span>
                        <span className="font-medium text-gray-900">{consultant.avgResponseTime}h</span>
                      </div>
                      
                      {consultant.flaggedCases.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Flagged Cases:</span>
                            <span className="text-sm font-medium text-error-600">
                              {consultant.flaggedCases.length}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {consultant.flaggedCases.slice(0, 3).map(caseId => (
                              <Link
                                key={caseId}
                                to={`/cases/${caseId}`}
                                className="px-2 py-1 bg-error-100 text-error-700 text-xs rounded hover:bg-error-200"
                              >
                                Case {caseId}
                              </Link>
                            ))}
                            {consultant.flaggedCases.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{consultant.flaggedCases.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'qa' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Questions & Knowledge Base</h3>
                <button
                  onClick={() => setShowNewQA(true)}
                  className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Q&A
                </button>
              </div>
              {showNewQA && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-4">
                  <h4 className="font-medium mb-2">Submit a New Question</h4>
                  {newQAError && <div className="text-error-600 text-sm mb-2">{newQAError}</div>}
                  <input
                    type="text"
                    value={newQATitle}
                    onChange={e => setNewQATitle(e.target.value)}
                    placeholder="Question title..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-2"
                  />
                  <textarea
                    value={newQADescription}
                    onChange={e => setNewQADescription(e.target.value)}
                    placeholder="Describe your question or issue..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-2"
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <select
                      value={newQACategory}
                      onChange={e => setNewQACategory(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="case_management">Case Management</option>
                      <option value="compliance">Compliance</option>
                      <option value="documentation">Documentation</option>
                      <option value="communication">Communication</option>
                      <option value="rtw_planning">RTW Planning</option>
                      <option value="piawe">PIAWE</option>
                      <option value="medical">Medical</option>
                    </select>
                    <select
                      value={newQAPriority}
                      onChange={e => setNewQAPriority(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowNewQA(false)}
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateQA}
                      className="px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No Q&A items found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`bg-gray-50 rounded-lg border border-gray-200 p-4 cursor-pointer transition-colors hover:bg-gray-100 ${
                        selectedItem?.id === item.id ? 'ring-2 ring-primary-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.category.replace('_', ' ')}
                          </span>
                          {item.caseId && (
                            <Link
                              to={`/cases/${item.caseId}`}
                              className="text-xs text-primary-600 hover:text-primary-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Case #{item.caseId}
                            </Link>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(parseISO(item.submittedAt), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>By: {item.submittedBy}</span>
                        <span>{item.responses.length} responses</span>
                      </div>
                      {selectedItem?.id === item.id && (
                        <QAResponseForm
                          qaItem={item}
                          onSubmit={response => {
                            setQaItems(prev => prev.map(q =>
                              q.id === item.id ? { ...q, responses: [...q.responses, response] } : q
                            ));
                            setSelectedItem(prev => prev ? { ...prev, responses: [...prev.responses, response] } : null);
                          }}
                          user={user}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function QAResponseForm({ qaItem, onSubmit, user }: { qaItem: any, onSubmit: (response: any) => void, user: any }) {
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="mt-4 border-t pt-4">
      <textarea
        value={responseText}
        onChange={e => setResponseText(e.target.value)}
        placeholder="Write a response..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-2"
        rows={2}
      />
      {error && <div className="text-error-600 text-sm mb-2">{error}</div>}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (!responseText.trim()) {
              setError('Response cannot be empty.');
              return;
            }
            onSubmit({
              id: `r${Date.now()}`,
              content: responseText,
              author: user?.name || 'Anonymous',
              createdAt: new Date().toISOString(),
              isOfficial: user?.role === 'admin',
              helpful: 0,
              notHelpful: 0
            });
            setResponseText('');
            setError('');
          }}
          className="px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Submit Response
        </button>
      </div>
    </div>
  );
}

export default QualityControl;