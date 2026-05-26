import { useEffect, useState } from 'react';
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import CustomModal from './CustomModal';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    firstname: '',
    lastname: '',
    middlename: '',
    username: '',
    email: '',
    role: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      middlename: user.middlename || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role || '',
    });
  }, [user]);

  const showModal = (title) => {
    setModalTitle(title);
    setModalOpen(true);
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const updateProfileField = (key, value) => {
    setProfileForm(prev => ({ ...prev, [key]: value }));
  };

  const updatePasswordField = (key, value) => {
    setPasswordForm(prev => ({ ...prev, [key]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      showModal('Error', 'User information is not available. Please log in again.');
      return;
    }

    setSavingProfile(true);

    try {
      const updatedProfile = {
        firstname: profileForm.firstname.trim().toUpperCase(),
        lastname: profileForm.lastname.trim().toUpperCase(),
        middlename: profileForm.middlename.trim().toUpperCase(),
        username: profileForm.username.trim(),
      };

      if (!updatedProfile.firstname || !updatedProfile.lastname) {
        showModal('Warning', 'First name and last name are required.');
        return;
      }

      const { error } = await supabase
        .from('tbluser')
        .update(updatedProfile)
        .eq('id', user.id);

      if (error) throw error;

      updateUser(updatedProfile);
      showModal('Your user information has been updated successfully.');
    } catch (err) {
      console.error('Profile update error:', err);
      showModal( err.message || 'Failed to update user information.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSavingPassword(true);

    try {
      if (!user?.email) {
        showModal('Email address is not available. Please log in again.');
        return;
      }

      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        showModal('Please complete all password fields.');
        return;
      }

      if (!validatePassword(passwordForm.newPassword)) {
        showModal('New password must be at least 8 characters with uppercase, lowercase, and number.');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showModal('New password and confirm password do not match.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        showModal('Current password is incorrect.');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showModal('Your password has been changed successfully.');
    } catch (err) {
      console.error('Password update error:', err);
      showModal( err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <p className="text-gray-600">Please log in to view settings.</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto px-4 py-8 mt-8">
      <div className="mx-auto max-w-5xl pt-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form
            onSubmit={handleProfileSubmit}
            className="rounded-lg border border-gray-300 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100">
                <UserCircleIcon className="h-8 w-8 text-sky-800" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-sky-900">User Information</h2>
                <p className="text-sm text-gray-500">Update your account profile details.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm font-medium text-gray-700">
                First Name
                <input
                  type="text"
                  value={profileForm.firstname}
                  onChange={(e) => updateProfileField('firstname', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2 uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={savingProfile}
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Last Name
                <input
                  type="text"
                  value={profileForm.lastname}
                  onChange={(e) => updateProfileField('lastname', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2 uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={savingProfile}
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Middle Name
                <input
                  type="text"
                  value={profileForm.middlename}
                  onChange={(e) => updateProfileField('middlename', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2 uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={savingProfile}
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Email
                <input
                  type="email"
                  value={profileForm.email}
                  className="mt-1 w-full rounded border border-gray-200 bg-gray-100 p-2 text-gray-600"
                  disabled
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Role
                <input
                  type="text"
                  value={profileForm.role}
                  className="mt-1 w-full rounded border border-gray-200 bg-gray-100 p-2 uppercase text-gray-600"
                  disabled
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded bg-sky-800 px-5 py-2 text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Information'}
              </button>
            </div>
          </form>

          <form
            onSubmit={handlePasswordSubmit}
            className="rounded-lg border border-gray-300 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
                <LockClosedIcon className="h-7 w-7 text-amber-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-sky-900">Change Password</h2>
                <p className="text-sm text-gray-500">Use a strong password for your account.</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Current Password
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => updatePasswordField('currentPassword', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={savingPassword}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                New Password
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => updatePasswordField('newPassword', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={savingPassword}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Confirm New Password
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => updatePasswordField('confirmPassword', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  disabled={savingPassword}
                  required
                />
              </label>

              <p className="text-xs text-gray-500">
                Password must be at least 8 characters with uppercase, lowercase, and number.
              </p>

              <label htmlFor="show-settings-password" className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  id="show-settings-password"
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(prev => !prev)}
                  disabled={savingPassword}
                />
                {showPassword ? (
                  <EyeSlashIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-gray-500" />
                )}
                Show passwords
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded bg-amber-600 px-5 py-2 text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CustomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
      />
    </div>
  );
}
