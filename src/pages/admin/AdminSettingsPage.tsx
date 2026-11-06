/**
 * /admin/settings — Profile and password management.
 */
import React, { useState } from 'react';
import { Settings, Shield, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/admin/ui/Button';
import Input from '../../components/admin/ui/Input';
import { ToastContainer, useToast } from '../../components/admin/ui/Toast';

export default function AdminSettingsPage() {
  const { profile, user, refreshProfile } = useAuth();
  const { toasts, showToast, dismissToast } = useToast();

  const [displayName,   setDisplayName] = useState(profile?.display_name ?? '');
  const [savingName,    setSavingName]  = useState(false);

  const [currentPwd,    setCurrentPwd]  = useState('');
  const [newPwd,        setNewPwd]      = useState('');
  const [confirmPwd,    setConfirmPwd]  = useState('');
  const [savingPwd,     setSavingPwd]   = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', user?.id ?? '');
      if (error) throw error;
      await refreshProfile();
      showToast('Display name updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally { setSavingName(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { showToast('New passwords do not match.', 'error'); return; }
    if (newPwd.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      showToast('Password changed successfully.', 'success');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Password change failed', 'error');
    } finally { setSavingPwd(false); }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <title>Settings | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div>
        <h1 className="text-2xl font-bold text-[#1B365D]">Settings</h1>
        <p className="text-sm text-[#5F6E80] mt-0.5">Manage your account and profile.</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-[#DDE3EA] p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-[#4A777A]" />
          <h2 className="text-sm font-semibold text-[#1A2B40]">Profile</h2>
        </div>
        <div className="text-sm text-[#5F6E80] space-y-1">
          <p><span className="font-medium text-[#1A2B40]">Email:</span> {user?.email}</p>
          <p><span className="font-medium text-[#1A2B40]">Role:</span> {profile?.role}</p>
        </div>
        <form onSubmit={handleSaveName} className="space-y-3">
          <Input
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Chef Peter the Teacher"
            hint="Shown as the author name on articles."
          />
          <Button type="submit" size="sm" loading={savingName}>Save name</Button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-[#DDE3EA] p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-[#4A777A]" />
          <h2 className="text-sm font-semibold text-[#1A2B40]">Change password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <Input
            label="New password"
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            autoComplete="new-password"
            hint="Minimum 8 characters."
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            autoComplete="new-password"
          />
          <Button type="submit" size="sm" variant="secondary" loading={savingPwd}>
            Update password
          </Button>
        </form>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
