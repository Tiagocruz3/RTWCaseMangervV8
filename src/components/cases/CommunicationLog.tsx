import React from 'react';
import { Communication } from '../../types';
import { format, parseISO } from 'date-fns';
import { Mail, Phone, Users, MessageSquare } from 'lucide-react';

interface CommunicationLogProps {
  communications: Communication[];
}

const CommunicationLog: React.FC<CommunicationLogProps> = ({ communications }) => {
  const sortedCommunications = [...communications].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4 text-primary-600" />;
      case 'phone':
        return <Phone className="h-4 w-4 text-success-600" />;
      case 'meeting':
        return <Users className="h-4 w-4 text-warning-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };
  
  const getTypeBackground = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-primary-50';
      case 'phone':
        return 'bg-success-50';
      case 'meeting':
        return 'bg-warning-50';
      default:
        return 'bg-gray-50';
    }
  };
  
  return (
    <div className="flow-root">
      <ul className="divide-y divide-gray-200">
        {sortedCommunications.map(comm => (
          <li key={comm.id} className="py-3">
            <div className="flex items-start">
              <div className={`p-1.5 rounded-full ${getTypeBackground(comm.type)}`}>
                {getTypeIcon(comm.type)}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium text-gray-900 capitalize">{comm.type} Contact</p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(comm.date), 'dd MMM yyyy, h:mm a')}
                  </p>
                </div>
                <p className="mt-1 text-sm text-gray-700">{comm.content}</p>
                <p className="mt-1 text-xs text-gray-500">By: {comm.author}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CommunicationLog;