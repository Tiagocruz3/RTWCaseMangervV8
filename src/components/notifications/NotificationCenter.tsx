import React, { useState, useEffect } from 'react';
import { Bell, X, Calendar, Clock, AlertTriangle, CheckCircle, User, FileText, MessageSquare, Users, Shield } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays, differenceInHours } from 'date-fns';
import { Case, SupervisorNote } from '../../types';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Notification {
  id: string;
  type: 'review_due' | 'task_overdue' | 'document_required' | 'communication_needed' | 'compliance_alert' | 'system_update' | 'supervisor_note';
  title: string;
  message: string;
  caseId?: string;
  workerName?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  dueDate?: string;
  read: boolean;
  actionRequired: boolean;
  category: 'case_management' | 'compliance' | 'system' | 'reminder' | 'supervisor';
  supervisorNoteId?: string;
  supervisorNoteType?: 'instruction' | 'question' | 'reply' | 'general';
}

interface NotificationCenterProps {
  cases: Case[];
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ cases, isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high_priority' | 'supervisor'>('all');

  useEffect(() => {
    generateNotifications();
  }, [cases, user]);

  const generateNotifications = () => {
    const newNotifications: Notification[] = [];

    cases.forEach(caseItem => {
      const workerName = `${caseItem.worker.firstName} ${caseItem.worker.lastName}`;

      // Supervisor Notes Notifications
      if (caseItem.supervisorNotes && user?.id) {
        caseItem.supervisorNotes.forEach(note => {
          // Only show notifications for notes not created by current user and not read by current user
          if (note.author !== user.name && !note.readBy.includes(user.id)) {
            const isInstruction = note.type === 'instruction' && note.authorRole === 'admin';
            const isQuestion = note.type === 'question' && note.authorRole === 'consultant';
            const isReply = note.type === 'reply';
            
            let title = 'New Supervisor Note';
            let message = `${note.author} added a note`;
            let priority: 'low' | 'medium' | 'high' | 'critical' = note.priority;
            
            if (isInstruction) {
              title = 'New Instruction';
              message = `Supervisor ${note.author} provided instructions for ${workerName}`;
              priority = note.requiresResponse ? 'high' : 'medium';
            } else if (isQuestion) {
              title = 'Question from Case Manager';
              message = `${note.author} asked a question about ${workerName}`;
              priority = 'medium';
            } else if (isReply) {
              title = 'Reply to Your Note';
              message = `${note.author} replied to your note about ${workerName}`;
              priority = 'medium';
            } else {
              message = `${note.author} added a note about ${workerName}`;
            }

            newNotifications.push({
              id: `supervisor-note-${note.id}`,
              type: 'supervisor_note',
              title,
              message,
              caseId: caseItem.id,
              workerName,
              priority,
              createdAt: note.createdAt,
              read: false,
              actionRequired: note.requiresResponse || isQuestion,
              category: 'supervisor',
              supervisorNoteId: note.id,
              supervisorNoteType: note.type
            });
          }
        });
      }

      // Review date notifications
      caseItem.reviewDates.forEach(reviewDate => {
        const date = parseISO(reviewDate);
        const daysUntil = differenceInDays(date, new Date());
        const hoursUntil = differenceInHours(date, new Date());

        if (isPast(date)) {
          const daysOverdue = Math.abs(daysUntil);
          newNotifications.push({
            id: `review-overdue-${caseItem.id}-${reviewDate}`,
            type: 'review_due',
            title: 'Review Overdue',
            message: `RTW review for ${workerName} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
            caseId: caseItem.id,
            workerName,
            priority: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
            createdAt: new Date().toISOString(),
            dueDate: reviewDate,
            read: false,
            actionRequired: true,
            category: 'case_management'
          });
        } else if (isToday(date)) {
          newNotifications.push({
            id: `review-today-${caseItem.id}-${reviewDate}`,
            type: 'review_due',
            title: 'Review Due Today',
            message: `RTW review for ${workerName} is scheduled for today`,
            caseId: caseItem.id,
            workerName,
            priority: 'high',
            createdAt: new Date().toISOString(),
            dueDate: reviewDate,
            read: false,
            actionRequired: true,
            category: 'reminder'
          });
        } else if (isTomorrow(date)) {
          newNotifications.push({
            id: `review-tomorrow-${caseItem.id}-${reviewDate}`,
            type: 'review_due',
            title: 'Review Due Tomorrow',
            message: `RTW review for ${workerName} is scheduled for tomorrow`,
            caseId: caseItem.id,
            workerName,
            priority: 'medium',
            createdAt: new Date().toISOString(),
            dueDate: reviewDate,
            read: false,
            actionRequired: false,
            category: 'reminder'
          });
        } else if (daysUntil <= 7) {
          newNotifications.push({
            id: `review-upcoming-${caseItem.id}-${reviewDate}`,
            type: 'review_due',
            title: 'Upcoming Review',
            message: `RTW review for ${workerName} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            caseId: caseItem.id,
            workerName,
            priority: 'low',
            createdAt: new Date().toISOString(),
            dueDate: reviewDate,
            read: false,
            actionRequired: false,
            category: 'reminder'
          });
        }
      });

      // Task overdue notifications
      caseItem.rtwPlan.tasks.forEach(task => {
        if (!task.completed && isPast(parseISO(task.dueDate))) {
          const daysOverdue = differenceInDays(new Date(), parseISO(task.dueDate));
          newNotifications.push({
            id: `task-overdue-${task.id}`,
            type: 'task_overdue',
            title: 'Task Overdue',
            message: `"${task.title}" for ${workerName} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
            caseId: caseItem.id,
            workerName,
            priority: daysOverdue > 5 ? 'critical' : 'high',
            createdAt: new Date().toISOString(),
            dueDate: task.dueDate,
            read: false,
            actionRequired: true,
            category: 'case_management'
          });
        }
      });

      // Communication needed notifications
      const daysSinceLastComm = caseItem.communications.length > 0 
        ? differenceInDays(new Date(), parseISO(caseItem.communications[caseItem.communications.length - 1].date))
        : differenceInDays(new Date(), parseISO(caseItem.injuryDate));

      if (daysSinceLastComm > 14 && caseItem.status === 'open') {
        newNotifications.push({
          id: `comm-needed-${caseItem.id}`,
          type: 'communication_needed',
          title: 'Communication Required',
          message: `No communication with ${workerName} for ${daysSinceLastComm} days`,
          caseId: caseItem.id,
          workerName,
          priority: daysSinceLastComm > 30 ? 'high' : 'medium',
          createdAt: new Date().toISOString(),
          read: false,
          actionRequired: true,
          category: 'case_management'
        });
      }

      // Document requirements
      if (caseItem.documents.length === 0) {
        newNotifications.push({
          id: `docs-missing-${caseItem.id}`,
          type: 'document_required',
          title: 'Documents Missing',
          message: `No supporting documents uploaded for ${workerName}`,
          caseId: caseItem.id,
          workerName,
          priority: 'medium',
          createdAt: new Date().toISOString(),
          read: false,
          actionRequired: true,
          category: 'compliance'
        });
      }

      // Compliance alerts
      const injuryDate = parseISO(caseItem.injuryDate);
      const daysSinceInjury = differenceInDays(new Date(), injuryDate);
      
      if (daysSinceInjury <= 3 && caseItem.communications.length === 0) {
        newNotifications.push({
          id: `compliance-initial-contact-${caseItem.id}`,
          type: 'compliance_alert',
          title: 'Initial Contact Required',
          message: `Initial contact with ${workerName} required within 48 hours of injury`,
          caseId: caseItem.id,
          workerName,
          priority: 'critical',
          createdAt: new Date().toISOString(),
          read: false,
          actionRequired: true,
          category: 'compliance'
        });
      }

      // PIAWE calculation alerts
      if (caseItem.wagesSalary && !caseItem.piaweCalculation) {
        newNotifications.push({
          id: `piawe-missing-${caseItem.id}`,
          type: 'compliance_alert',
          title: 'PIAWE Calculation Required',
          message: `PIAWE calculation needed for ${workerName} - wage information available`,
          caseId: caseItem.id,
          workerName,
          priority: 'medium',
          createdAt: new Date().toISOString(),
          read: false,
          actionRequired: true,
          category: 'compliance'
        });
      }
    });

    // Sort by priority and date
    newNotifications.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setNotifications(newNotifications);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const getNotificationIcon = (type: string, supervisorNoteType?: string) => {
    switch (type) {
      case 'supervisor_note':
        if (supervisorNoteType === 'instruction') {
          return <Shield className="h-4 w-4" />;
        } else if (supervisorNoteType === 'question') {
          return <MessageSquare className="h-4 w-4" />;
        } else if (supervisorNoteType === 'reply') {
          return <MessageSquare className="h-4 w-4" />;
        }
        return <Users className="h-4 w-4" />;
      case 'review_due':
        return <Calendar className="h-4 w-4" />;
      case 'task_overdue':
        return <Clock className="h-4 w-4" />;
      case 'document_required':
        return <FileText className="h-4 w-4" />;
      case 'communication_needed':
        return <MessageSquare className="h-4 w-4" />;
      case 'compliance_alert':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'supervisor':
        return 'bg-purple-100 text-purple-700';
      case 'case_management':
        return 'bg-blue-100 text-blue-700';
      case 'compliance':
        return 'bg-red-100 text-red-700';
      case 'reminder':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !notif.read;
      case 'high_priority':
        return ['critical', 'high'].includes(notif.priority);
      case 'supervisor':
        return notif.category === 'supervisor';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.priority === 'critical').length;
  const supervisorCount = notifications.filter(n => n.category === 'supervisor' && !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bell className="h-6 w-6 text-primary-500" />
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-gray-500">
                {unreadCount} unread
                {criticalCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-error-100 text-error-700 text-xs rounded">
                    {criticalCount} critical
                  </span>
                )}
                {supervisorCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                    {supervisorCount} supervisor
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-sm rounded ${
                  filter === 'all' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 text-sm rounded ${
                  filter === 'unread' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('supervisor')}
                className={`px-3 py-1.5 text-sm rounded ${
                  filter === 'supervisor' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  Supervisor ({notifications.filter(n => n.category === 'supervisor').length})
                </div>
              </button>
              <button
                onClick={() => setFilter('high_priority')}
                className={`px-3 py-1.5 text-sm rounded ${
                  filter === 'high_priority' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                High Priority ({notifications.filter(n => ['critical', 'high'].includes(n.priority)).length})
              </button>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-success-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {filter === 'all' ? 'No notifications' : `No ${filter.replace('_', ' ')} notifications`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
                      {getNotificationIcon(notification.type, notification.supervisorNoteType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getCategoryColor(notification.category)}`}>
                              {notification.category === 'supervisor' ? 'supervisor' : notification.category.replace('_', ' ')}
                            </span>
                            {notification.actionRequired && (
                              <span className="px-2 py-0.5 text-xs bg-warning-100 text-warning-700 rounded">
                                Action Required
                              </span>
                            )}
                          </div>
                          
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.message}
                          </p>
                          
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>{format(parseISO(notification.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                            <span>•</span>
                            <span className="capitalize">{notification.category.replace('_', ' ')}</span>
                            {notification.dueDate && (
                              <>
                                <span>•</span>
                                <span>Due: {format(parseISO(notification.dueDate), 'dd/MM/yyyy')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {notification.caseId && (
                            <Link
                              to={`/cases/${notification.caseId}`}
                              onClick={() => {
                                markAsRead(notification.id);
                                onClose();
                              }}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                              {notification.type === 'supervisor_note' ? 'View Notes' : 'View Case'}
                            </Link>
                          )}
                          
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Mark read
                            </button>
                          )}
                          
                          <button
                            onClick={() => dismissNotification(notification.id)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;