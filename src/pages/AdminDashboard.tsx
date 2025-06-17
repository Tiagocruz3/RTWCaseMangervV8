import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Clock, CheckCircle, MessageSquare, BarChart3, TrendingUp, Filter } from 'lucide-react';
import { useCaseStore } from '../store/caseStore';
import { useAuthStore } from '../store/authStore';
import { format, parseISO, isToday, isPast, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';

interface ConsultantWorkload {
  consultantId: string;
  consultantName: string;
  totalCases: number;
  openCases: number;
  pendingCases: number;
  overdueTasks: number;
  urgentCases: number;
  avgResponseTime: number;
  qualityScore: number;
  recentActivity: string;
}

interface UrgentTask {
  id: string;
  caseId: string;
  workerName: string;
  consultantName: string;
  taskType: 'overdue_review' | 'missing_certificate' | 'urgent_rtw' | 'compliance_issue';
  priority: 'high' | 'critical';
  dueDate: string;
  daysOverdue: number;
  description: string;
}

const AdminDashboard = () => {
  const { cases } = useCaseStore();
  const { user } = useAuthStore();
  const [consultantWorkloads, setConsultantWorkloads] = useState<ConsultantWorkload[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<UrgentTask[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('week');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'critical'>('all');

  useEffect(() => {
    calculateWorkloads();
    identifyUrgentTasks();
  }, [cases]);

  const calculateWorkloads = () => {
    const consultantMap = new Map<string, ConsultantWorkload>();

    cases.forEach(caseItem => {
      const consultantId = caseItem.consultant;
      const consultantName = caseItem.caseManager.name;

      if (!consultantMap.has(consultantId)) {
        consultantMap.set(consultantId, {
          consultantId,
          consultantName,
          totalCases: 0,
          openCases: 0,
          pendingCases: 0,
          overdueTasks: 0,
          urgentCases: 0,
          avgResponseTime: 0,
          qualityScore: 85, // Mock quality score
          recentActivity: caseItem.updatedAt
        });
      }

      const workload = consultantMap.get(consultantId)!;
      workload.totalCases++;

      if (caseItem.status === 'open') workload.openCases++;
      if (caseItem.status === 'pending') workload.pendingCases++;

      // Count overdue tasks
      caseItem.rtwPlan.tasks.forEach(task => {
        if (!task.completed && isPast(parseISO(task.dueDate))) {
          workload.overdueTasks++;
        }
      });

      // Check for urgent cases (injury within last 7 days or overdue reviews)
      const injuryDate = parseISO(caseItem.injuryDate);
      const daysSinceInjury = differenceInDays(new Date(), injuryDate);
      
      if (daysSinceInjury <= 7 || caseItem.reviewDates.some(date => isPast(parseISO(date)))) {
        workload.urgentCases++;
      }
    });

    setConsultantWorkloads(Array.from(consultantMap.values()));
  };

  const identifyUrgentTasks = () => {
    const tasks: UrgentTask[] = [];

    cases.forEach(caseItem => {
      // Overdue reviews
      caseItem.reviewDates.forEach(reviewDate => {
        const date = parseISO(reviewDate);
        if (isPast(date)) {
          const daysOverdue = differenceInDays(new Date(), date);
          tasks.push({
            id: `review-${caseItem.id}-${reviewDate}`,
            caseId: caseItem.id,
            workerName: `${caseItem.worker.firstName} ${caseItem.worker.lastName}`,
            consultantName: caseItem.caseManager.name,
            taskType: 'overdue_review',
            priority: daysOverdue > 7 ? 'critical' : 'high',
            dueDate: reviewDate,
            daysOverdue,
            description: `RTW Review overdue by ${daysOverdue} days`
          });
        }
      });

      // Overdue RTW plan tasks
      caseItem.rtwPlan.tasks.forEach(task => {
        if (!task.completed && isPast(parseISO(task.dueDate))) {
          const daysOverdue = differenceInDays(new Date(), parseISO(task.dueDate));
          tasks.push({
            id: `task-${task.id}`,
            caseId: caseItem.id,
            workerName: `${caseItem.worker.firstName} ${caseItem.worker.lastName}`,
            consultantName: caseItem.caseManager.name,
            taskType: 'urgent_rtw',
            priority: daysOverdue > 5 ? 'critical' : 'high',
            dueDate: task.dueDate,
            daysOverdue,
            description: task.title
          });
        }
      });

      // Recent injuries requiring immediate attention
      const injuryDate = parseISO(caseItem.injuryDate);
      const daysSinceInjury = differenceInDays(new Date(), injuryDate);
      
      if (daysSinceInjury <= 3 && caseItem.status === 'pending') {
        tasks.push({
          id: `urgent-${caseItem.id}`,
          caseId: caseItem.id,
          workerName: `${caseItem.worker.firstName} ${caseItem.worker.lastName}`,
          consultantName: caseItem.caseManager.name,
          taskType: 'compliance_issue',
          priority: 'critical',
          dueDate: caseItem.injuryDate,
          daysOverdue: daysSinceInjury,
          description: `New injury requires immediate case setup and first contact`
        });
      }
    });

    // Sort by priority and days overdue
    tasks.sort((a, b) => {
      if (a.priority === 'critical' && b.priority !== 'critical') return -1;
      if (b.priority === 'critical' && a.priority !== 'critical') return 1;
      return b.daysOverdue - a.daysOverdue;
    });

    setUrgentTasks(tasks);
  };

  const getWorkloadColor = (workload: ConsultantWorkload) => {
    const totalActive = workload.openCases + workload.pendingCases;
    if (totalActive > 15 || workload.overdueTasks > 5) return 'text-error-600 bg-error-50';
    if (totalActive > 10 || workload.overdueTasks > 2) return 'text-warning-600 bg-warning-50';
    return 'text-success-600 bg-success-50';
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'overdue_review':
        return <Clock className="h-4 w-4" />;
      case 'urgent_rtw':
        return <AlertTriangle className="h-4 w-4" />;
      case 'compliance_issue':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredTasks = urgentTasks.filter(task => 
    filterPriority === 'all' || task.priority === filterPriority
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Users className="h-6 w-6 text-primary-500 mr-2" />
            Supervisor Dashboard
          </h1>
          <p className="text-gray-600">Monitor consultant workloads and urgent tasks</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active Consultants</p>
              <p className="text-2xl font-bold">{consultantWorkloads.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-error-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-error-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Urgent Tasks</p>
              <p className="text-2xl font-bold text-error-600">
                {urgentTasks.filter(t => t.priority === 'critical').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Overdue Items</p>
              <p className="text-2xl font-bold text-warning-600">
                {consultantWorkloads.reduce((sum, w) => sum + w.overdueTasks, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Avg Quality Score</p>
              <p className="text-2xl font-bold text-success-600">
                {Math.round(consultantWorkloads.reduce((sum, w) => sum + w.qualityScore, 0) / consultantWorkloads.length || 0)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consultant Workloads */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold flex items-center">
              <BarChart3 className="h-5 w-5 text-primary-500 mr-2" />
              Consultant Workloads
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {consultantWorkloads.map((workload) => (
                <div key={workload.consultantId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{workload.consultantName}</h3>
                      <p className="text-sm text-gray-500">
                        Last active: {format(parseISO(workload.recentActivity), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getWorkloadColor(workload)}`}>
                      {workload.openCases + workload.pendingCases > 15 ? 'Overloaded' : 
                       workload.openCases + workload.pendingCases > 10 ? 'High Load' : 'Normal'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Cases:</span>
                      <p className="font-medium">{workload.totalCases}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Active:</span>
                      <p className="font-medium">{workload.openCases + workload.pendingCases}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Overdue:</span>
                      <p className={`font-medium ${workload.overdueTasks > 0 ? 'text-error-600' : ''}`}>
                        {workload.overdueTasks}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Quality Score:</span>
                      <p className="font-medium text-success-600">{workload.qualityScore}%</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Urgent Cases:</span>
                      <p className={`font-medium ${workload.urgentCases > 0 ? 'text-warning-600' : ''}`}>
                        {workload.urgentCases}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <AlertTriangle className="h-5 w-5 text-error-500 mr-2" />
                Urgent Tasks
              </h2>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="text-sm rounded-md border border-gray-300 px-2 py-1"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Priority</option>
              </select>
            </div>
          </div>
          <div className="p-6">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-success-400 mx-auto mb-3" />
                <p className="text-gray-500">No urgent tasks at this time</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/cases/${task.caseId}`}
                    className={`block p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
                      task.priority === 'critical' 
                        ? 'border-error-200 bg-error-50' 
                        : 'border-warning-200 bg-warning-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        <div className={`p-1 rounded ${
                          task.priority === 'critical' ? 'text-error-600' : 'text-warning-600'
                        }`}>
                          {getTaskIcon(task.taskType)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {task.workerName}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {task.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Consultant: {task.consultantName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          task.priority === 'critical' 
                            ? 'bg-error-100 text-error-700' 
                            : 'bg-warning-100 text-warning-700'
                        }`}>
                          {task.priority}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {task.daysOverdue} days overdue
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Analytics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold flex items-center">
            <TrendingUp className="h-5 w-5 text-primary-500 mr-2" />
            Performance Analytics
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 mb-2">
                {Math.round(cases.filter(c => c.status === 'closed').length / cases.length * 100)}%
              </div>
              <p className="text-sm text-gray-600">Case Closure Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600 mb-2">
                {Math.round(cases.reduce((sum, c) => {
                  const completedTasks = c.rtwPlan.tasks.filter(t => t.completed).length;
                  return sum + (completedTasks / c.rtwPlan.tasks.length * 100);
                }, 0) / cases.length)}%
              </div>
              <p className="text-sm text-gray-600">Task Completion Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600 mb-2">
                {Math.round(consultantWorkloads.reduce((sum, w) => sum + w.avgResponseTime, 0) / consultantWorkloads.length || 0)}h
              </div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;