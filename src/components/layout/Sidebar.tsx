import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Layout, 
  Home, 
  Briefcase, 
  Calendar, 
  FileText, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Calculator,
  Shield,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuthStore();
  
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    {
      name: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      path: '/dashboard',
    },
    {
      name: 'Case Management',
      icon: <Briefcase className="w-5 h-5" />,
      path: '/cases',
    },
    {
      name: 'Calendar',
      icon: <Calendar className="w-5 h-5" />,
      path: '/calendar',
    },
    {
      name: 'PIAWE Calculator',
      icon: <Calculator className="w-5 h-5" />,
      path: '/piawe',
    },
    {
      name: 'Quality Control',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/quality-control',
    },
    {
      name: 'Reports',
      icon: <FileText className="w-5 h-5" />,
      path: '/reports',
    }
  ];
  
  const adminMenuItems = [
    {
      name: 'Admin Dashboard',
      icon: <Shield className="w-5 h-5" />,
      path: '/admin',
    },
    {
      name: 'User Management',
      icon: <Users className="w-5 h-5" />,
      path: '/users',
    }
  ];
  
  const bottomMenuItems = [
    {
      name: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      path: '/settings',
    }
  ];
  
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div 
      className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center">
          <Layout className="w-8 h-8 text-primary-600" />
          {!collapsed && (
            <span className="ml-2 text-lg font-semibold">RTW Manager</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-gray-100 focus:outline-none"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <nav className="flex-1 px-2 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`${
                isActive(item.path)
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out`}
            >
              <div className={`${isActive(item.path) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                {item.icon}
              </div>
              {!collapsed && <span className="ml-3">{item.name}</span>}
            </Link>
          ))}
          
          {isAdmin && (
            <div className="pt-5">
              <div className={collapsed ? 'sr-only' : 'px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider'}>
                Administration
              </div>
              {adminMenuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md mt-1 transition-colors duration-150 ease-in-out`}
                >
                  <div className={`${isActive(item.path) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                    {item.icon}
                  </div>
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </div>
      
      <div className="border-t border-gray-200 p-2">
        {bottomMenuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`${
              isActive(item.path)
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out`}
          >
            <div className={`${isActive(item.path) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
              {item.icon}
            </div>
            {!collapsed && <span className="ml-3">{item.name}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;