import React, { useState } from 'react';
import { Users, Plus, Edit3, Trash2, Phone, Mail, MapPin, Star, Building, User, Stethoscope, Brain, Briefcase, Scale, Shield, X, Save, Calendar } from 'lucide-react';
import { Stakeholder, StakeholderType } from '../../types';
import { format, parseISO } from 'date-fns';

interface StakeholderManagerProps {
  stakeholders: Stakeholder[];
  onUpdate: (stakeholders: Stakeholder[]) => void;
}

const StakeholderManager: React.FC<StakeholderManagerProps> = ({ stakeholders, onUpdate }) => {
  const [isAddingStakeholder, setIsAddingStakeholder] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | StakeholderType>('all');
  const [newStakeholder, setNewStakeholder] = useState<Partial<Stakeholder>>({
    type: 'gp',
    name: '',
    organization: '',
    title: '',
    phone: '',
    email: '',
    address: '',
    fax: '',
    specialization: '',
    notes: '',
    isPrimary: false,
    isActive: true
  });

  const stakeholderTypes: { type: StakeholderType; label: string; icon: React.ReactNode; description: string }[] = [
    { type: 'gp', label: 'General Practitioner', icon: <Stethoscope className="h-4 w-4" />, description: 'Primary care physician' },
    { type: 'specialist', label: 'Medical Specialist', icon: <User className="h-4 w-4" />, description: 'Specialist doctor (orthopedic, neurologist, etc.)' },
    { type: 'physiotherapist', label: 'Physiotherapist', icon: <User className="h-4 w-4" />, description: 'Physical therapy provider' },
    { type: 'psychologist', label: 'Psychologist', icon: <Brain className="h-4 w-4" />, description: 'Mental health professional' },
    { type: 'occupational_therapist', label: 'Occupational Therapist', icon: <User className="h-4 w-4" />, description: 'Workplace rehabilitation specialist' },
    { type: 'rehabilitation_provider', label: 'Rehabilitation Provider', icon: <Building className="h-4 w-4" />, description: 'Vocational or medical rehabilitation service' },
    { type: 'legal_representative', label: 'Legal Representative', icon: <Scale className="h-4 w-4" />, description: 'Lawyer or legal advisor' },
    { type: 'union_representative', label: 'Union Representative', icon: <Shield className="h-4 w-4" />, description: 'Worker union representative' },
    { type: 'employer_contact', label: 'Employer Contact', icon: <Briefcase className="h-4 w-4" />, description: 'Additional employer contact person' },
    { type: 'insurance_contact', label: 'Insurance Contact', icon: <Shield className="h-4 w-4" />, description: 'Insurance company representative' },
    { type: 'other', label: 'Other', icon: <User className="h-4 w-4" />, description: 'Other relevant contact' }
  ];

  const getStakeholderTypeInfo = (type: StakeholderType) => {
    return stakeholderTypes.find(t => t.type === type) || stakeholderTypes[stakeholderTypes.length - 1];
  };

  const handleAddStakeholder = () => {
    if (!newStakeholder.name || !newStakeholder.phone) return;

    const stakeholder: Stakeholder = {
      id: `stakeholder-${Date.now()}`,
      type: newStakeholder.type as StakeholderType,
      name: newStakeholder.name,
      organization: newStakeholder.organization || '',
      title: newStakeholder.title || '',
      phone: newStakeholder.phone,
      email: newStakeholder.email || '',
      address: newStakeholder.address || '',
      fax: newStakeholder.fax || '',
      specialization: newStakeholder.specialization || '',
      notes: newStakeholder.notes || '',
      isPrimary: newStakeholder.isPrimary || false,
      isActive: true,
      addedDate: new Date().toISOString()
    };

    // If this is set as primary, remove primary status from others of the same type
    let updatedStakeholders = [...stakeholders];
    if (stakeholder.isPrimary) {
      updatedStakeholders = updatedStakeholders.map(s => 
        s.type === stakeholder.type ? { ...s, isPrimary: false } : s
      );
    }

    updatedStakeholders.push(stakeholder);
    onUpdate(updatedStakeholders);

    // Reset form
    setNewStakeholder({
      type: 'gp',
      name: '',
      organization: '',
      title: '',
      phone: '',
      email: '',
      address: '',
      fax: '',
      specialization: '',
      notes: '',
      isPrimary: false,
      isActive: true
    });
    setIsAddingStakeholder(false);
  };

  const handleUpdateStakeholder = (id: string, updates: Partial<Stakeholder>) => {
    let updatedStakeholders = stakeholders.map(s => 
      s.id === id ? { ...s, ...updates } : s
    );

    // If setting as primary, remove primary status from others of the same type
    if (updates.isPrimary) {
      const stakeholder = stakeholders.find(s => s.id === id);
      if (stakeholder) {
        updatedStakeholders = updatedStakeholders.map(s => 
          s.type === stakeholder.type && s.id !== id ? { ...s, isPrimary: false } : s
        );
      }
    }

    onUpdate(updatedStakeholders);
    setEditingStakeholder(null);
  };

  const handleDeleteStakeholder = (id: string) => {
    const updatedStakeholders = stakeholders.filter(s => s.id !== id);
    onUpdate(updatedStakeholders);
  };

  const handleContactUpdate = (id: string) => {
    const updatedStakeholders = stakeholders.map(s => 
      s.id === id ? { ...s, lastContactDate: new Date().toISOString() } : s
    );
    onUpdate(updatedStakeholders);
  };

  const filteredStakeholders = stakeholders.filter(s => 
    filter === 'all' || s.type === filter
  );

  const groupedStakeholders = stakeholderTypes.reduce((acc, type) => {
    acc[type.type] = filteredStakeholders.filter(s => s.type === type.type);
    return acc;
  }, {} as Record<StakeholderType, Stakeholder[]>);

  const getTypeColor = (type: StakeholderType) => {
    const colors = {
      gp: 'bg-blue-100 text-blue-700',
      specialist: 'bg-purple-100 text-purple-700',
      physiotherapist: 'bg-green-100 text-green-700',
      psychologist: 'bg-indigo-100 text-indigo-700',
      occupational_therapist: 'bg-teal-100 text-teal-700',
      rehabilitation_provider: 'bg-orange-100 text-orange-700',
      legal_representative: 'bg-red-100 text-red-700',
      union_representative: 'bg-yellow-100 text-yellow-700',
      employer_contact: 'bg-gray-100 text-gray-700',
      insurance_contact: 'bg-pink-100 text-pink-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-5 w-5 text-primary-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Key Stakeholders</h3>
            <p className="text-sm text-gray-500">Manage contacts for healthcare providers, legal representatives, and other key stakeholders</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddingStakeholder(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Stakeholder
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setFilter('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Stakeholders ({stakeholders.length})
          </button>
          {stakeholderTypes.map((type) => {
            const count = stakeholders.filter(s => s.type === type.type).length;
            if (count === 0) return null;
            
            return (
              <button
                key={type.type}
                onClick={() => setFilter(type.type)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === type.type
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center">
                  {type.icon}
                  <span className="ml-1">{type.label} ({count})</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Stakeholders List */}
      <div className="space-y-4">
        {filteredStakeholders.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No stakeholders added yet</p>
            <p className="text-sm text-gray-400 mt-1">Add healthcare providers, legal representatives, and other key contacts</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStakeholders.map((stakeholder) => {
              const typeInfo = getStakeholderTypeInfo(stakeholder.type);
              const isEditing = editingStakeholder === stakeholder.id;
              
              return (
                <div
                  key={stakeholder.id}
                  className={`border rounded-lg p-4 ${stakeholder.isPrimary ? 'border-primary-200 bg-primary-50' : 'border-gray-200'}`}
                >
                  {isEditing ? (
                    <EditStakeholderForm
                      stakeholder={stakeholder}
                      stakeholderTypes={stakeholderTypes}
                      onSave={(updates) => handleUpdateStakeholder(stakeholder.id, updates)}
                      onCancel={() => setEditingStakeholder(null)}
                    />
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded ${getTypeColor(stakeholder.type)}`}>
                            {typeInfo.icon}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 flex items-center">
                              {stakeholder.name}
                              {stakeholder.isPrimary && (
                                <Star className="h-4 w-4 text-yellow-500 ml-1" />
                              )}
                            </h4>
                            <p className="text-sm text-gray-500">{typeInfo.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setEditingStakeholder(stakeholder.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStakeholder(stakeholder.id)}
                            className="p-1 text-gray-400 hover:text-error-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {stakeholder.organization && (
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Building className="h-4 w-4 mr-2" />
                          {stakeholder.organization}
                          {stakeholder.title && ` - ${stakeholder.title}`}
                        </div>
                      )}

                      {stakeholder.specialization && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Specialization:</span> {stakeholder.specialization}
                        </div>
                      )}

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          <a href={`tel:${stakeholder.phone}`} className="hover:text-primary-600">
                            {stakeholder.phone}
                          </a>
                        </div>
                        
                        {stakeholder.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-4 w-4 mr-2" />
                            <a href={`mailto:${stakeholder.email}`} className="hover:text-primary-600">
                              {stakeholder.email}
                            </a>
                          </div>
                        )}
                        
                        {stakeholder.address && (
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                            <span>{stakeholder.address}</span>
                          </div>
                        )}
                      </div>

                      {stakeholder.notes && (
                        <div className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                          <span className="font-medium">Notes:</span> {stakeholder.notes}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Added: {format(parseISO(stakeholder.addedDate), 'dd/MM/yyyy')}</span>
                        {stakeholder.lastContactDate && (
                          <span>Last contact: {format(parseISO(stakeholder.lastContactDate), 'dd/MM/yyyy')}</span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center space-x-2">
                        <button
                          onClick={() => handleContactUpdate(stakeholder.id)}
                          className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                        >
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Mark Contact
                          </div>
                        </button>
                        
                        {stakeholder.phone && (
                          <a
                            href={`tel:${stakeholder.phone}`}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              Call
                            </div>
                          </a>
                        )}
                        
                        {stakeholder.email && (
                          <a
                            href={`mailto:${stakeholder.email}`}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </div>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Stakeholder Modal */}
      {isAddingStakeholder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Add New Stakeholder</h3>
              <button
                onClick={() => setIsAddingStakeholder(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Stakeholder Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stakeholder Type *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {stakeholderTypes.map((type) => (
                    <button
                      key={type.type}
                      type="button"
                      onClick={() => setNewStakeholder(prev => ({ ...prev, type: type.type }))}
                      className={`p-3 rounded-md border text-left ${
                        newStakeholder.type === type.type
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {type.icon}
                        <div>
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newStakeholder.name}
                    onChange={(e) => setNewStakeholder(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                    placeholder="Full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title/Position
                  </label>
                  <input
                    type="text"
                    value={newStakeholder.title}
                    onChange={(e) => setNewStakeholder(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                    placeholder="Dr., Manager, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization/Practice
                  </label>
                  <input
                    type="text"
                    value={newStakeholder.organization}
                    onChange={(e) => setNewStakeholder(prev => ({ ...prev, organization: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                    placeholder="Hospital, clinic, law firm, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={newStakeholder.specialization}
                    onChange={(e) => setNewStakeholder(prev => ({ ...prev, specialization: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                    placeholder="Area of expertise"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={newStakeholder.phone}
                    onChange={(e) => setNewStakeholder(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                    placeholder="Phone number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newStakeholder.email}
                    onChange={(e) => setNewStakeholder(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                    placeholder="Email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fax
                  </label>
                  <input
                    type="tel"
                    value={newStakeholder.fax}
                    onChange={(e) => setNewStakeholder(prev => ({ ...prev, fax: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                    placeholder="Fax number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={newStakeholder.address}
                  onChange={(e) => setNewStakeholder(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  rows={2}
                  placeholder="Full address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newStakeholder.notes}
                  onChange={(e) => setNewStakeholder(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  rows={3}
                  placeholder="Additional notes or important information"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newStakeholder.isPrimary}
                    onChange={(e) => setNewStakeholder(prev => ({ ...prev, isPrimary: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Set as primary contact for this type
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsAddingStakeholder(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStakeholder}
                disabled={!newStakeholder.name || !newStakeholder.phone}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  Add Stakeholder
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit Stakeholder Form Component
interface EditStakeholderFormProps {
  stakeholder: Stakeholder;
  stakeholderTypes: any[];
  onSave: (updates: Partial<Stakeholder>) => void;
  onCancel: () => void;
}

const EditStakeholderForm: React.FC<EditStakeholderFormProps> = ({
  stakeholder,
  stakeholderTypes,
  onSave,
  onCancel
}) => {
  const [editData, setEditData] = useState<Partial<Stakeholder>>({
    name: stakeholder.name,
    organization: stakeholder.organization,
    title: stakeholder.title,
    phone: stakeholder.phone,
    email: stakeholder.email,
    address: stakeholder.address,
    fax: stakeholder.fax,
    specialization: stakeholder.specialization,
    notes: stakeholder.notes,
    isPrimary: stakeholder.isPrimary,
    isActive: stakeholder.isActive
  });

  const handleSave = () => {
    onSave(editData);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={editData.name}
          onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
          placeholder="Name"
        />
        <input
          type="text"
          value={editData.organization}
          onChange={(e) => setEditData(prev => ({ ...prev, organization: e.target.value }))}
          className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
          placeholder="Organization"
        />
        <input
          type="tel"
          value={editData.phone}
          onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
          className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
          placeholder="Phone"
        />
        <input
          type="email"
          value={editData.email}
          onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
          className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
          placeholder="Email"
        />
      </div>
      
      <textarea
        value={editData.notes}
        onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
        className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm"
        rows={2}
        placeholder="Notes"
      />

      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editData.isPrimary}
            onChange={(e) => setEditData(prev => ({ ...prev, isPrimary: e.target.checked }))}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">Primary</span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={editData.isActive}
            onChange={(e) => setEditData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">Active</span>
        </label>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          <div className="flex items-center">
            <Save className="h-3 w-3 mr-1" />
            Save
          </div>
        </button>
      </div>
    </div>
  );
};

export default StakeholderManager;