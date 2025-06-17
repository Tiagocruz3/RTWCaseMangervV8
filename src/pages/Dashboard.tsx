import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { useAuthStore } from '../store/authStore';
import DashboardMetrics from '../components/dashboard/DashboardMetrics';
import UpcomingReviewsCard from '../components/dashboard/UpcomingReviewsCard';
import RecentCasesCard from '../components/dashboard/RecentCasesCard';
import DailyTasksCard from '../components/dashboard/DailyTasksCard';
import ActionCenter from '../components/notifications/ActionCenter';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Dashboard = () => {
  const { cases, fetchCases, isLoading, filterCases } = useCaseStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);
  
  const handleMetricClick = (metric: string) => {
    switch (metric) {
      case 'active-cases':
        filterCases('open');
        navigate('/cases');
        break;
      case 'overdue-tasks':
      case 'upcoming-reviews':
      case 'critical-actions':
        navigate('/calendar');
        break;
    }
  };

  if (isLoading && cases.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const openCases = cases.filter(c => c.status === 'open').length;
  const pendingCases = cases.filter(c => c.status === 'pending').length;
  const totalCases = cases.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name}</h1>
            <p className="text-primary-100">
              You have {openCases + pendingCases} active cases requiring attention
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{totalCases}</div>
            <div className="text-primary-200 text-sm">Total Cases</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <DashboardMetrics cases={cases} onMetricClick={handleMetricClick} />

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyTasksCard cases={cases} />
        <UpcomingReviewsCard cases={cases} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentCasesCard cases={cases} />
        </div>
        <div>
          <ActionCenter cases={cases} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;