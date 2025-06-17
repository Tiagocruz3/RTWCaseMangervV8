import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="text-center py-8">
    <div className="mx-auto mb-4 text-gray-400">
      {React.cloneElement(icon as React.ReactElement, { className: 'h-12 w-12 mx-auto' })}
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    {description && <p className="text-gray-500 mb-6">{description}</p>}
    {action}
  </div>
);

export default EmptyState;