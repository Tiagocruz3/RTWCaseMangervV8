import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { FileText, Upload, Save, Loader } from 'lucide-react';

const Profile = () => {
  const { user, isLoading, initialize } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
        setName(data.name);
        setAvatarUrl(data.avatar_url);
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    let newAvatarUrl = avatarUrl;
    try {
      if (avatarFile) {
        const { data, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`${user.id}/${Date.now()}_${avatarFile.name}`, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
        newAvatarUrl = publicUrlData.publicUrl;
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name, avatar_url: newAvatarUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;
      setSuccess(true);
      setAvatarFile(null);
      // Refresh global user state
      if (initialize) {
        await initialize();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8 mt-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <img
            src={avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || user.name)}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-primary-200"
          />
          <button
            className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-2 shadow hover:bg-primary-700"
            onClick={() => fileInputRef.current?.click()}
            title="Change avatar"
          >
            <Upload className="h-4 w-4" />
          </button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleAvatarChange}
          />
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full rounded-md border border-gray-200 px-3 py-2 bg-gray-100 text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <input
            type="text"
            value={user.role}
            disabled
            className="w-full rounded-md border border-gray-200 px-3 py-2 bg-gray-100 text-gray-500 capitalize"
          />
        </div>
        {error && <div className="text-error-600 text-sm">{error}</div>}
        {success && <div className="text-success-600 text-sm">Profile updated!</div>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md font-medium hover:bg-primary-700 disabled:opacity-50 mt-4"
        >
          {saving ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Profile; 