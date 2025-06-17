import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut, User, Settings, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCaseStore } from '../../store/caseStore';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import NotificationCenter from '../notifications/NotificationCenter';

const Header = () => {
  const { user, logout } = useAuthStore();
  const { searchCases, cases } = useCaseStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    searchCases(searchQuery);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/cases') return 'Case Management';
    if (path.startsWith('/cases/')) {
      if (path.includes('/edit')) return 'Edit Case';
      if (path.includes('/new')) return 'New Case';
      if (path.includes('/piawe')) return 'PIAWE Calculator';
      return 'Case Details';
    }
    if (path === '/reports') return 'Reports';
    if (path === '/calendar') return 'Calendar';
    if (path === '/settings') return 'Settings';
    if (path === '/quality-control') return 'Quality Control';
    if (path === '/admin') return 'Admin Dashboard';
    if (path === '/piawe') return 'PIAWE Calculator';
    return '';
  };

  const getNotificationCount = () => {
    let count = 0;
    
    cases.forEach(c => {
      // Count supervisor notes notifications
      if (c.supervisorNotes && user?.id) {
        c.supervisorNotes.forEach(note => {
          // Only count notes not created by current user and not read by current user
          if (note.author !== user.name && !note.readBy.includes(user.id)) {
            count++;
          }
        });
      }

      // Count overdue tasks
      c.rtwPlan.tasks.forEach(task => {
        if (!task.completed && isPast(parseISO(task.dueDate))) {
          count++;
        }
      });
      
      // Count upcoming reviews
      c.reviewDates.forEach(reviewDate => {
        const date = parseISO(reviewDate);
        if (isToday(date) || isTomorrow(date) || isPast(date)) {
          count++;
        }
      });
      
      // Count RTW plan dates
      const rtwStartDate = parseISO(c.rtwPlan.startDate);
      const rtwEndDate = parseISO(c.rtwPlan.endDate);
      
      if (isToday(rtwStartDate) || isTomorrow(rtwStartDate)) count++;
      if (isToday(rtwEndDate) || isTomorrow(rtwEndDate)) count++;
      
      // Count upcoming tasks
      c.rtwPlan.tasks.forEach(task => {
        if (!task.completed && (isToday(parseISO(task.dueDate)) || isTomorrow(parseISO(task.dueDate)))) {
          count++;
        }
      });
    });
    
    return count;
  };

  const getCriticalNotificationCount = () => {
    let count = 0;
    
    cases.forEach(c => {
      // Count critical supervisor notes (instructions requiring response)
      if (c.supervisorNotes && user?.id) {
        c.supervisorNotes.forEach(note => {
          if (note.author !== user.name && 
              !note.readBy.includes(user.id) && 
              (note.requiresResponse || note.priority === 'high')) {
            count++;
          }
        });
      }

      // Count overdue reviews
      c.reviewDates.forEach(reviewDate => {
        const date = parseISO(reviewDate);
        if (isPast(date)) {
          count++;
        }
      });
      
      // Count overdue tasks
      c.rtwPlan.tasks.forEach(task => {
        if (!task.completed && isPast(parseISO(task.dueDate))) {
          count++;
        }
      });
    });
    
    return count;
  };

  const notificationCount = getNotificationCount();
  const criticalCount = getCriticalNotificationCount();

  return (
    <>
      <header className="bg-white border-b border-gray-200 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 min-w-0 space-x-4">
              <img src="/wpi-logo.png" alt="WPI Logo" className="h-10 w-auto" />
              <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
            </div>
            
            {location.pathname === '/cases' && (
              <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="search"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Search cases by worker, employer, or claim number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            )}
            
            <div className="flex items-center space-x-4">
              {/* Quick Action Buttons */}
              <button
                onClick={() => navigate('/cases/new')}
                className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </button>
              
              <button
                onClick={() => navigate('/calendar')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendar
              </button>
              
              {/* Notifications */}
              <button
                type="button"
                className="relative p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className={`absolute -top-1 -right-1 block h-5 w-5 rounded-full text-xs font-medium text-white flex items-center justify-center ${
                    criticalCount > 0 ? 'bg-error-500' : 'bg-primary-500'
                  }`}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center space-x-3"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <span className="hidden md:block text-right">
                    <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                    <span className="text-xs text-gray-500 block capitalize">{user?.role}</span>
                  </span>
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user?.avatar || 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100'}
                    alt={user?.name || 'User profile'}
                  />
                </button>
                
                {showDropdown && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu">
                    <div className="py-1">
                      <button
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/profile');
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Your Profile
                      </button>
                      <button
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/settings');
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </button>
                      <button
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter
        cases={cases}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
};

export default Header;