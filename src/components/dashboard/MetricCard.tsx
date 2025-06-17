import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description?: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, description, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${onClick ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
    <div>
      <h3 className="text-gray-500 font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
      {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    </div>
  </div>
);

export default MetricCard;