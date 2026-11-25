import React, { useState } from 'react';
import { User, Mail, Building, Lock, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState({ full_name: user?.full_name || '', company: user?.company || '', username: user?.username || '' });
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const response = await authApi.updateProfile(profile);
      setUser(response.data);
      toast.success('Profile updated!');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.new !== password.confirm) { toast.error('Passwords do not match'); return; }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ current_password: password.current, new_password: password.new });
      setPassword({ current: '', new: '', confirm: '' });
      toast.success('Password changed!');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingPassword(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">Manage your account settings</p>
      </div>

      {/* Avatar */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl font-bold">
            {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{user?.full_name || user?.username}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="badge badge-blue text-xs mt-1">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Personal Information</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" className="input pl-8" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" className="input pl-8" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" className="input pl-8 bg-slate-50" value={user?.email} disabled />
            </div>
          </div>
          <div>
            <label className="label">Company</label>
            <div className="relative">
              <Building size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" className="input pl-8" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? <LoadingSpinner size="sm" /> : <Save size={15} />}
            Save Changes
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {['current', 'new', 'confirm'].map((field) => (
            <div key={field}>
              <label className="label capitalize">{field === 'confirm' ? 'Confirm New Password' : `${field} Password`}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" className="input pl-8" value={(password as any)[field]}
                  onChange={(e) => setPassword({ ...password, [field]: e.target.value })} />
              </div>
            </div>
          ))}
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? <LoadingSpinner size="sm" /> : <Lock size={15} />}
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
