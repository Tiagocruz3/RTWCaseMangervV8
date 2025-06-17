import React, { useState } from 'react';
import { Target, Plus, Edit3, Trash2, CheckCircle, Clock, AlertTriangle, Calendar, User, FileText, MessageSquare, Save, X, Flag, TrendingUp, Activity, Users, Briefcase } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, addDays, addWeeks, differenceInDays } from 'date-fns';
import { RtwPlan, Task } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { PDFDocument } from 'pdf-lib';
import { useAISettings } from '../../store/aiSettingsStore';
import { aiService } from '../../services/aiService';

interface RTWPlanManagerProps {
  rtwPlan: RtwPlan;
  caseId: string;
  workerName: string;
  onUpdate: (rtwPlan: RtwPlan) => void;
}

interface RTWNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  type: 'progress' | 'concern' | 'milestone' | 'general';
  taskId?: string;
}

interface RTWMilestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  completed: boolean;
  completedDate?: string;
  type: 'medical' | 'functional' | 'workplace' | 'administrative';
}

const RTWPlanManager: React.FC<RTWPlanManagerProps> = ({ rtwPlan, caseId, workerName, onUpdate }) => {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<'overview' | 'tasks' | 'milestones' | 'notes' | 'progress' | 'barriers'>('overview');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [newGoal, setNewGoal] = useState('');
  
  // Mock data for RTW notes and milestones (in a real app, these would come from the backend)
  const [rtwNotes, setRtwNotes] = useState<RTWNote[]>([]);

  const [milestones, setMilestones] = useState<RTWMilestone[]>([
    {
      id: 'm1',
      title: 'Medical Clearance',
      description: 'Obtain medical clearance for return to modified duties',
      targetDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      completed: false,
      type: 'medical'
    },
    {
      id: 'm2',
      title: 'Workplace Assessment',
      description: 'Complete ergonomic assessment of workstation',
      targetDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
      completed: false,
      type: 'workplace'
    },
    {
      id: 'm3',
      title: 'Functional Capacity Evaluation',
      description: 'Complete FCE to determine work capacity',
      targetDate: format(addDays(new Date(), 21), 'yyyy-MM-dd'),
      completed: false,
      type: 'functional'
    }
  ]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: format(addWeeks(new Date(), 1), 'yyyy-MM-dd'),
    assignedTo: ''
  });

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    targetDate: format(addWeeks(new Date(), 2), 'yyyy-MM-dd'),
    type: 'medical' as RTWMilestone['type']
  });

  const [newNote, setNewNote] = useState({
    content: '',
    type: 'general' as RTWNote['type'],
    taskId: ''
  });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [barrierAnalysis, setBarrierAnalysis] = useState<any>({});
  const [isAnalyzingBarriers, setIsAnalyzingBarriers] = useState(false);
  const { selectedModel } = useAISettings();

  const flagCategories = [
    {
      color: 'red',
      label: 'Red Flags',
      description: 'Serious medical conditions or treatment failures that might delay or prevent a return to work.'
    },
    {
      color: 'orange',
      label: 'Orange Flags',
      description: 'Mental health factors like disorders or personality issues that can impact recovery and return to work.'
    },
    {
      color: 'yellow',
      label: 'Yellow Flags',
      description: 'Psychological factors such as unhelpful beliefs about injury, poor coping strategies, or a passive role in recovery.'
    },
    {
      color: 'blue',
      label: 'Blue Flags',
      description: 'Social factors, like low social support, unpleasant work environments, or excessive demands, that can hinder a worker\'s return.'
    },
    {
      color: 'black',
      label: 'Black Flags',
      description: 'External factors like threats to financial security, legal issues, or complex compensation thresholds that can affect the return-to-work process.'
    }
  ];

  // Helper to fetch the fillable PDF template
  const fetchTemplate = async () => {
    const response = await fetch('/Return-work-plan-vic.pdf');
    if (!response.ok) throw new Error('Failed to fetch PDF template');
    return new Uint8Array(await response.arrayBuffer());
  };

  // Placeholder: Generate field values for the PDF using the RTW plan and case data
  const generateFieldMapping = async () => {
    // Map your RTW plan/case data to the PDF field numbers
    // Add more logic as your data model grows
    return {
      1: workerName,
      2: rtwPlan.claimNumber || '',
      3: rtwPlan.preInjuryJobTitle || '',
      4: rtwPlan.preInjuryWorkHours || '',
      5: rtwPlan.preInjuryLocation || '',
      6: rtwPlan.employerName || '',
      7: rtwPlan.dutiesToBeUndertaken || '',
      8: rtwPlan.supportsOrModifications || '',
      9: rtwPlan.dutiesToBeAvoided || '',
      10: rtwPlan.medicalRestrictions || '',
      11: rtwPlan.hoursOfWork?.week1?.monday || '',
      12: rtwPlan.hoursOfWork?.week1?.tuesday || '',
      13: rtwPlan.hoursOfWork?.week1?.wednesday || '',
      14: rtwPlan.hoursOfWork?.week1?.thursday || '',
      15: rtwPlan.hoursOfWork?.week1?.friday || '',
      16: rtwPlan.hoursOfWork?.week1?.saturday || '',
      17: rtwPlan.hoursOfWork?.week1?.sunday || '',
      18: rtwPlan.hoursOfWork?.week1?.total || '',
      19: rtwPlan.hoursOfWork?.week2?.monday || '',
      20: rtwPlan.hoursOfWork?.week2?.tuesday || '',
      21: rtwPlan.hoursOfWork?.week2?.wednesday || '',
      22: rtwPlan.hoursOfWork?.week2?.thursday || '',
      23: rtwPlan.hoursOfWork?.week2?.friday || '',
      24: rtwPlan.hoursOfWork?.week2?.saturday || '',
      25: rtwPlan.hoursOfWork?.week2?.sunday || '',
      26: rtwPlan.hoursOfWork?.week2?.total || '',
      27: rtwPlan.hoursOfWork?.week3?.monday || '',
      28: rtwPlan.hoursOfWork?.week3?.tuesday || '',
      29: rtwPlan.hoursOfWork?.week3?.wednesday || '',
      30: rtwPlan.hoursOfWork?.week3?.thursday || '',
      31: rtwPlan.hoursOfWork?.week3?.friday || '',
      32: rtwPlan.hoursOfWork?.week3?.saturday || '',
      33: rtwPlan.hoursOfWork?.week3?.sunday || '',
      34: rtwPlan.hoursOfWork?.week3?.total || '',
      35: rtwPlan.hoursOfWork?.week4?.monday || '',
      36: rtwPlan.hoursOfWork?.week4?.tuesday || '',
      37: rtwPlan.hoursOfWork?.week4?.wednesday || '',
      38: rtwPlan.hoursOfWork?.week4?.thursday || '',
      39: rtwPlan.hoursOfWork?.week4?.friday || '',
      40: rtwPlan.hoursOfWork?.week4?.saturday || '',
      41: rtwPlan.hoursOfWork?.week4?.sunday || '',
      42: rtwPlan.hoursOfWork?.week4?.total || '',
      43: rtwPlan.workLocation || '',
      44: rtwPlan.startDate || '',
      45: rtwPlan.supervisorDetails || '',
      46: rtwPlan.reviewDate || '',
      47: rtwPlan.preparedBy || '',
      48: rtwPlan.preparedOn || '',
      49: rtwPlan.workerDetails?.name || '',
      50: rtwPlan.workerDetails?.phone || '',
      51: '', // Signature fields are not filled programmatically
      52: rtwPlan.workerDetails?.date || '',
      53: rtwPlan.coordinatorDetails?.name || '',
      54: rtwPlan.coordinatorDetails?.phone || '',
      55: '',
      56: rtwPlan.coordinatorDetails?.date || '',
      57: rtwPlan.supervisorDetailsObj?.name || '',
      58: rtwPlan.supervisorDetailsObj?.phone || '',
      59: '',
      60: rtwPlan.supervisorDetailsObj?.date || '',
      61: rtwPlan.healthPractitioner?.name || '',
      62: rtwPlan.healthPractitioner?.phone || '',
      63: '',
      64: rtwPlan.healthPractitioner?.date || '',
      65: rtwPlan.additionalNotes || '',
    };
  };

  // Fill the PDF and trigger download
  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const templateBytes = await fetchTemplate();
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();
      const fieldMapping = await generateFieldMapping();
      Object.entries(fieldMapping).forEach(([field, value]) => {
        try {
          form.getTextField(field).setText(String(value));
        } catch (e) {
          // Field not found, ignore
        }
      });
      form.flatten();
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RTW-Plan-Filled.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate PDF. Make sure the template exists and has the correct fields.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;

    const task: Task = {
      id: `t${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      dueDate: newTask.dueDate,
      completed: false,
      assignedTo: newTask.assignedTo || undefined
    };

    const updatedPlan = {
      ...rtwPlan,
      tasks: [...rtwPlan.tasks, task]
    };

    onUpdate(updatedPlan);
    setNewTask({
      title: '',
      description: '',
      dueDate: format(addWeeks(new Date(), 1), 'yyyy-MM-dd'),
      assignedTo: ''
    });
    setIsAddingTask(false);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = rtwPlan.tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    );

    const updatedPlan = {
      ...rtwPlan,
      tasks: updatedTasks
    };

    onUpdate(updatedPlan);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = rtwPlan.tasks.filter(task => task.id !== taskId);
    const updatedPlan = {
      ...rtwPlan,
      tasks: updatedTasks
    };
    onUpdate(updatedPlan);
  };

  const handleAddGoal = () => {
    if (!newGoal.trim()) return;

    const updatedPlan = {
      ...rtwPlan,
      goals: [...rtwPlan.goals, newGoal]
    };

    onUpdate(updatedPlan);
    setNewGoal('');
  };

  const handleUpdateGoal = (index: number, value: string) => {
    const updatedGoals = rtwPlan.goals.map((goal, i) =>
      i === index ? value : goal
    );

    const updatedPlan = {
      ...rtwPlan,
      goals: updatedGoals
    };

    onUpdate(updatedPlan);
    setEditingGoal(null);
  };

  const handleDeleteGoal = (index: number) => {
    const updatedGoals = rtwPlan.goals.filter((_, i) => i !== index);
    const updatedPlan = {
      ...rtwPlan,
      goals: updatedGoals
    };
    onUpdate(updatedPlan);
  };

  const handleAddMilestone = () => {
    if (!newMilestone.title.trim()) return;

    const milestone: RTWMilestone = {
      id: `m${Date.now()}`,
      title: newMilestone.title,
      description: newMilestone.description,
      targetDate: newMilestone.targetDate,
      completed: false,
      type: newMilestone.type
    };

    setMilestones(prev => [...prev, milestone]);
    setNewMilestone({
      title: '',
      description: '',
      targetDate: format(addWeeks(new Date(), 2), 'yyyy-MM-dd'),
      type: 'medical'
    });
    setIsAddingMilestone(false);
  };

  const handleToggleMilestone = (milestoneId: string) => {
    setMilestones(prev => prev.map(milestone =>
      milestone.id === milestoneId
        ? {
            ...milestone,
            completed: !milestone.completed,
            completedDate: !milestone.completed ? new Date().toISOString() : undefined
          }
        : milestone
    ));
  };

  const handleAddNote = () => {
    if (!newNote.content.trim()) return;

    const note: RTWNote = {
      id: `rn${Date.now()}`,
      content: newNote.content,
      author: user?.name || 'Case Manager',
      createdAt: new Date().toISOString(),
      type: newNote.type,
      taskId: newNote.taskId || undefined
    };

    setRtwNotes(prev => [note, ...prev]);
    setNewNote({
      content: '',
      type: 'general',
      taskId: ''
    });
    setIsAddingNote(false);
  };

  const getTaskStatus = (task: Task) => {
    if (task.completed) return 'completed';
    const dueDate = parseISO(task.dueDate);
    if (isPast(dueDate)) return 'overdue';
    if (isToday(dueDate)) return 'due-today';
    if (isTomorrow(dueDate)) return 'due-tomorrow';
    return 'upcoming';
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'overdue':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'due-today':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'due-tomorrow':
        return 'text-primary-600 bg-primary-50 border-primary-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'due-today':
      case 'due-tomorrow':
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getMilestoneTypeColor = (type: RTWMilestone['type']) => {
    switch (type) {
      case 'medical':
        return 'bg-red-100 text-red-700';
      case 'functional':
        return 'bg-blue-100 text-blue-700';
      case 'workplace':
        return 'bg-green-100 text-green-700';
      case 'administrative':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getNoteTypeIcon = (type: RTWNote['type']) => {
    switch (type) {
      case 'progress':
        return <TrendingUp className="h-4 w-4 text-success-600" />;
      case 'concern':
        return <AlertTriangle className="h-4 w-4 text-warning-600" />;
      case 'milestone':
        return <Flag className="h-4 w-4 text-primary-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const calculateProgress = () => {
    const totalTasks = rtwPlan.tasks.length;
    const completedTasks = rtwPlan.tasks.filter(t => t.completed).length;
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.completed).length;
    
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
    
    return {
      overall: (taskProgress + milestoneProgress) / 2,
      tasks: taskProgress,
      milestones: milestoneProgress,
      completedTasks,
      totalTasks,
      completedMilestones,
      totalMilestones
    };
  };

  const progress = calculateProgress();

  const sections = [
    { id: 'overview', label: 'Overview', icon: <Target className="h-4 w-4" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckCircle className="h-4 w-4" />, count: rtwPlan.tasks.filter(t => !t.completed).length },
    { id: 'milestones', label: 'Milestones', icon: <Flag className="h-4 w-4" />, count: milestones.filter(m => !m.completed).length },
    { id: 'notes', label: 'RTW Notes', icon: <MessageSquare className="h-4 w-4" />, count: rtwNotes.length },
    { id: 'progress', label: 'Progress', icon: <Activity className="h-4 w-4" /> },
    { id: 'barriers', label: 'RTW Barriers', icon: <AlertTriangle className="h-4 w-4 text-warning-600" /> },
  ];

  const handleAnalyzeBarriers = async () => {
    setIsAnalyzingBarriers(true);
    setBarrierAnalysis({});
    try {
      // Compose a prompt for the AI
      const prompt = `Given the following case and RTW plan, analyze and list any present barriers to return to work using the following flag system.\n\nRed Flags: Serious medical conditions or treatment failures.\nOrange Flags: Mental health factors.\nYellow Flags: Psychological factors.\nBlue Flags: Social factors.\nBlack Flags: External factors.\n\nFor each flag category, list any relevant barriers and a brief explanation.\n\nCase: ${JSON.stringify({ workerName, ...rtwPlan })}`;
      const aiResult = await aiService.answerQuery(prompt, { workerName, ...rtwPlan }, selectedModel || '');
      // Try to parse the AI result into categories
      const parsed: any = {};
      if (aiResult) {
        flagCategories.forEach(cat => {
          const regex = new RegExp(`${cat.label}:([\s\S]*?)(?=\n\w+ Flags:|$)`, 'i');
          const match = aiResult.match(regex);
          parsed[cat.color] = match ? match[1].trim() : '';
        });
      }
      setBarrierAnalysis(parsed);
    } catch (e) {
      setBarrierAnalysis({ error: 'Failed to analyze barriers with AI.' });
    } finally {
      setIsAnalyzingBarriers(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <Target className="h-6 w-6 text-primary-500 mr-2" />
            Return to Work Coordination
          </h2>
          <p className="text-gray-600">Comprehensive RTW planning and progress tracking for {workerName}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {isGeneratingPDF ? 'Generating PDF...' : 'Generate RTW Plan PDF'}
          </button>
          <div className="text-right">
            <div className="text-sm text-gray-500">Overall Progress</div>
            <div className="text-lg font-bold text-primary-600">{Math.round(progress.overall)}%</div>
          </div>
          <div className="w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray={`${progress.overall}, 100`}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Plan Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">{rtwPlan.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {format(parseISO(rtwPlan.startDate), 'dd MMM yyyy')} - {format(parseISO(rtwPlan.endDate), 'dd MMM yyyy')}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                rtwPlan.status === 'active' 
                  ? 'bg-success-100 text-success-700' 
                  : rtwPlan.status === 'completed'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-warning-100 text-warning-700'
              }`}>
                {rtwPlan.status.charAt(0).toUpperCase() + rtwPlan.status.slice(1)}
              </span>
              <select
                value={rtwPlan.status}
                onChange={e => {
                  const value = e.target.value;
                  if (value === 'on hold') {
                    onUpdate({ ...rtwPlan, status: 'draft' });
                  } else {
                    onUpdate({ ...rtwPlan, status: value as 'draft' | 'active' | 'completed' });
                  }
                }}
                className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm bg-white focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Published</option>
                <option value="on hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeSection === section.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {section.icon}
                <span>{section.label}</span>
                {section.count !== undefined && section.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {section.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Section Content */}
        <div className="p-6">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-primary-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-primary-600" />
                    <div className="ml-3">
                      <p className="text-sm text-primary-600">Tasks</p>
                      <p className="text-lg font-bold text-primary-900">{progress.completedTasks}/{progress.totalTasks}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-success-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Flag className="h-8 w-8 text-success-600" />
                    <div className="ml-3">
                      <p className="text-sm text-success-600">Milestones</p>
                      <p className="text-lg font-bold text-success-900">{progress.completedMilestones}/{progress.totalMilestones}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-warning-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-warning-600" />
                    <div className="ml-3">
                      <p className="text-sm text-warning-600">Days Remaining</p>
                      <p className="text-lg font-bold text-warning-900">
                        {Math.max(0, differenceInDays(parseISO(rtwPlan.endDate), new Date()))}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <MessageSquare className="h-8 w-8 text-gray-600" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-600">Notes</p>
                      <p className="text-lg font-bold text-gray-900">{rtwNotes.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Goals Section */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium">RTW Goals</h4>
                  <button
                    onClick={() => setNewGoal('')}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Plus className="h-4 w-4 inline mr-1" />
                    Add Goal
                  </button>
                </div>
                
                <div className="space-y-3">
                  {rtwPlan.goals.map((goal, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      {editingGoal === index ? (
                        <div className="flex-1 flex items-center space-x-2">
                          <input
                            type="text"
                            defaultValue={goal}
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                            onBlur={(e) => handleUpdateGoal(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateGoal(index, e.currentTarget.value);
                              } else if (e.key === 'Escape') {
                                setEditingGoal(null);
                              }
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center">
                          <Target className="h-4 w-4 text-primary-600 mr-2" />
                          <span className="text-sm">{goal}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingGoal(editingGoal === index ? null : index)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(index)}
                          className="text-gray-400 hover:text-error-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {newGoal !== null && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        placeholder="Enter new goal..."
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddGoal();
                          } else if (e.key === 'Escape') {
                            setNewGoal('');
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleAddGoal}
                        className="px-3 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium mb-4">Recent Activity</h4>
                <div className="space-y-3">
                  {rtwNotes.slice(0, 3).map((note) => (
                    <div key={note.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      {getNoteTypeIcon(note.type)}
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{note.content}</p>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                          <span>{note.author}</span>
                          <span>•</span>
                          <span>{format(parseISO(note.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {rtwNotes.length === 0 && (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium">RTW Tasks</h4>
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </button>
              </div>

              {/* Add Task Form */}
              {isAddingTask && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h5 className="font-medium mb-3">Add New Task</h5>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Task title..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Task description..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={newTask.assignedTo}
                        onChange={(e) => setNewTask(prev => ({ ...prev, assignedTo: e.target.value }))}
                        placeholder="Assigned to (optional)"
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => setIsAddingTask(false)}
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTask}
                      className="px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Add Task
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div className="space-y-3">
                {rtwPlan.tasks.map((task) => {
                  const status = getTaskStatus(task);
                  const isEditing = editingTask === task.id;
                  
                  return (
                    <div
                      key={task.id}
                      className={`border rounded-lg p-4 ${getTaskStatusColor(status)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <button
                            onClick={() => handleUpdateTask(task.id, { completed: !task.completed })}
                            className="mt-1"
                          >
                            {task.completed ? (
                              <CheckCircle className="h-5 w-5 text-success-600" />
                            ) : (
                              <div className="h-5 w-5 border-2 border-gray-300 rounded-full hover:border-primary-500" />
                            )}
                          </button>
                          
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  defaultValue={task.title}
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                  onBlur={(e) => handleUpdateTask(task.id, { title: e.target.value })}
                                />
                                <textarea
                                  defaultValue={task.description}
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                  rows={2}
                                  onBlur={(e) => handleUpdateTask(task.id, { description: e.target.value })}
                                />
                              </div>
                            ) : (
                              <div>
                                <h5 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                  {task.title}
                                </h5>
                                {task.description && (
                                  <p className={`text-sm mt-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex items-center space-x-4 mt-2 text-xs">
                                  <div className="flex items-center">
                                    {getTaskStatusIcon(status)}
                                    <span className="ml-1">
                                      Due: {format(parseISO(task.dueDate), 'dd MMM yyyy')}
                                    </span>
                                  </div>
                                  {task.assignedTo && (
                                    <div className="flex items-center">
                                      <User className="h-3 w-3 mr-1" />
                                      <span>{task.assignedTo}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingTask(isEditing ? null : task.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-gray-400 hover:text-error-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {rtwPlan.tasks.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No tasks created yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'milestones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium">RTW Milestones</h4>
                <button
                  onClick={() => setIsAddingMilestone(true)}
                  className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </button>
              </div>

              {/* Add Milestone Form */}
              {isAddingMilestone && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h5 className="font-medium mb-3">Add New Milestone</h5>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Milestone title..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Milestone description..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={newMilestone.targetDate}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, targetDate: e.target.value }))}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                      <select
                        value={newMilestone.type}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, type: e.target.value as RTWMilestone['type'] }))}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="medical">Medical</option>
                        <option value="functional">Functional</option>
                        <option value="workplace">Workplace</option>
                        <option value="administrative">Administrative</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => setIsAddingMilestone(false)}
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMilestone}
                      className="px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Add Milestone
                    </button>
                  </div>
                </div>
              )}

              {/* Milestones List */}
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`border rounded-lg p-4 ${
                      milestone.completed 
                        ? 'bg-success-50 border-success-200' 
                        : isPast(parseISO(milestone.targetDate))
                        ? 'bg-error-50 border-error-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          onClick={() => handleToggleMilestone(milestone.id)}
                          className="mt-1"
                        >
                          {milestone.completed ? (
                            <CheckCircle className="h-5 w-5 text-success-600" />
                          ) : (
                            <Flag className="h-5 w-5 text-gray-400 hover:text-primary-500" />
                          )}
                        </button>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h5 className={`font-medium ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                              {milestone.title}
                            </h5>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getMilestoneTypeColor(milestone.type)}`}>
                              {milestone.type}
                            </span>
                          </div>
                          
                          {milestone.description && (
                            <p className={`text-sm mt-1 ${milestone.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                              {milestone.description}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>
                                Target: {format(parseISO(milestone.targetDate), 'dd MMM yyyy')}
                              </span>
                            </div>
                            {milestone.completedDate && (
                              <div className="flex items-center text-success-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <span>
                                  Completed: {format(parseISO(milestone.completedDate), 'dd MMM yyyy')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {milestones.length === 0 && (
                  <div className="text-center py-8">
                    <Flag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No milestones created yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium">RTW Notes</h4>
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </button>
              </div>

              {/* Add Note Form */}
              {isAddingNote && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h5 className="font-medium mb-3">Add RTW Note</h5>
                  <div className="space-y-3">
                    <textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter your note..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      rows={3}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={newNote.type}
                        onChange={(e) => setNewNote(prev => ({ ...prev, type: e.target.value as RTWNote['type'] }))}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="general">General Note</option>
                        <option value="progress">Progress Update</option>
                        <option value="concern">Concern/Issue</option>
                        <option value="milestone">Milestone Achievement</option>
                      </select>
                      <select
                        value={newNote.taskId}
                        onChange={(e) => setNewNote(prev => ({ ...prev, taskId: e.target.value }))}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Not linked to task</option>
                        {rtwPlan.tasks.map(task => (
                          <option key={task.id} value={task.id}>{task.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => setIsAddingNote(false)}
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNote}
                      className="px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
              )}

              {/* Notes List */}
              <div className="space-y-3">
                {rtwNotes.map((note) => (
                  <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {getNoteTypeIcon(note.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium">{note.author}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            note.type === 'progress' ? 'bg-success-100 text-success-700' :
                            note.type === 'concern' ? 'bg-warning-100 text-warning-700' :
                            note.type === 'milestone' ? 'bg-primary-100 text-primary-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {note.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(parseISO(note.createdAt), 'dd MMM yyyy, HH:mm')}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
                        
                        {note.taskId && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">
                              Linked to task: {rtwPlan.tasks.find(t => t.id === note.taskId)?.title}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {rtwNotes.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No RTW notes yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'progress' && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium">Progress Tracking</h4>
              
              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-primary-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-primary-900">Overall Progress</h5>
                    <Target className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="text-3xl font-bold text-primary-900 mb-2">
                    {Math.round(progress.overall)}%
                  </div>
                  <div className="w-full bg-primary-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.overall}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-success-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-success-900">Task Completion</h5>
                    <CheckCircle className="h-6 w-6 text-success-600" />
                  </div>
                  <div className="text-3xl font-bold text-success-900 mb-2">
                    {Math.round(progress.tasks)}%
                  </div>
                  <div className="w-full bg-success-200 rounded-full h-2">
                    <div 
                      className="bg-success-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.tasks}%` }}
                    />
                  </div>
                  <p className="text-sm text-success-700 mt-2">
                    {progress.completedTasks} of {progress.totalTasks} tasks completed
                  </p>
                </div>
                
                <div className="bg-warning-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-warning-900">Milestones</h5>
                    <Flag className="h-6 w-6 text-warning-600" />
                  </div>
                  <div className="text-3xl font-bold text-warning-900 mb-2">
                    {Math.round(progress.milestones)}%
                  </div>
                  <div className="w-full bg-warning-200 rounded-full h-2">
                    <div 
                      className="bg-warning-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.milestones}%` }}
                    />
                  </div>
                  <p className="text-sm text-warning-700 mt-2">
                    {progress.completedMilestones} of {progress.totalMilestones} milestones achieved
                  </p>
                </div>
              </div>

              {/* Timeline View */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h5 className="font-medium mb-4">RTW Timeline</h5>
                <div className="space-y-4">
                  {/* Plan Start */}
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">RTW Plan Started</p>
                      <p className="text-sm text-gray-500">{format(parseISO(rtwPlan.startDate), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                  
                  {/* Completed Tasks */}
                  {rtwPlan.tasks.filter(t => t.completed).map(task => (
                    <div key={task.id} className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-success-600 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">Task Completed: {task.title}</p>
                        <p className="text-sm text-gray-500">Due: {format(parseISO(task.dueDate), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Completed Milestones */}
                  {milestones.filter(m => m.completed).map(milestone => (
                    <div key={milestone.id} className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-warning-600 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">Milestone Achieved: {milestone.title}</p>
                        <p className="text-sm text-gray-500">
                          {milestone.completedDate && format(parseISO(milestone.completedDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Plan End */}
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-gray-400 rounded-full border-2 border-gray-300"></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-600">RTW Plan Target End</p>
                      <p className="text-sm text-gray-500">{format(parseISO(rtwPlan.endDate), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'barriers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">RTW Barriers</h4>
                <button
                  onClick={handleAnalyzeBarriers}
                  disabled={isAnalyzingBarriers}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isAnalyzingBarriers ? 'Analyzing...' : 'Analyze Barriers with AI'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {flagCategories.map(cat => (
                  <div key={cat.color} className={`border-l-8 rounded-lg p-4 bg-white border-${cat.color}-500 shadow-sm`}>
                    <div className="flex items-center mb-2">
                      <span className={`inline-block w-3 h-3 rounded-full bg-${cat.color}-500 mr-2`}></span>
                      <span className={`font-semibold text-${cat.color}-700`}>{cat.label}</span>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">{cat.description}</div>
                    {barrierAnalysis[cat.color] && (
                      <div className="mt-2 text-sm text-gray-900 whitespace-pre-line">
                        <strong>AI Analysis:</strong>
                        <div>{barrierAnalysis[cat.color]}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {barrierAnalysis.error && (
                <div className="text-error-600 text-sm mt-2">{barrierAnalysis.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RTWPlanManager;