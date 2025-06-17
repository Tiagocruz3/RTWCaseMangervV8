import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader, User, Shield, Edit3, Save } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const roleLabels = {
  consultant: 'Consultant',
  admin: 'Admin',
  support: 'Support',
};

const Users = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('consultant');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data) setUsers(data);
      if (error) setError(error.message);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  // Debug: log users array
  console.log('User Management - users:', users);

  const handleEdit = (id: string, currentRole: string) => {
    setEditingId(id);
    setEditRole(currentRole);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('profiles').update({ role: editRole }).eq('id', id);
      if (error) throw error;
      setUsers(users.map(u => (u.id === id ? { ...u, role: editRole } : u)));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-64 text-error-600 font-bold">
        Access denied. Admins only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 mt-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <Shield className="h-6 w-6 text-primary-500 mr-2" />
        User Management
      </h1>
      {error && <div className="text-error-600 text-sm mb-4">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id}>
                <td className="px-4 py-2 flex items-center space-x-2">
                  <img src={u.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name)} alt="avatar" className="w-8 h-8 rounded-full" />
                  <span>{u.name}</span>
                </td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  {editingId === u.id ? (
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    >
                      <option value="consultant">Consultant</option>
                      <option value="admin">Admin</option>
                      <option value="support">Support</option>
                    </select>
                  ) : (
                    <span className="capitalize font-medium">{(u.role in roleLabels ? roleLabels[u.role as keyof typeof roleLabels] : u.role)}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {editingId === u.id ? (
                    <button
                      onClick={() => handleSave(u.id)}
                      disabled={saving}
                      className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center"
                    >
                      {saving ? <Loader className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEdit(u.id, u.role)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-primary-100 flex items-center"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users; 