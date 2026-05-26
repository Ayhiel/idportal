import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/solid';
import { supabase } from './supabaseClient';
import CustomModal from './CustomModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DEFAULT_USER_PASSWORD = '301304';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [resettingUserId, setResettingUserId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage] = useState('');


  const showModal = (title, message = '') => {
    setModalTitle(title);
    setModalOpen(true);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tbluser')
        .select('id, firstname, lastname, middlename, username, email, role')
        .order('lastname', { ascending: true });

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      showModal( err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const fullName = `${user.lastname || ''} ${user.firstname || ''} ${user.middlename || ''}`.toLowerCase();
      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.username?.toLowerCase().includes(search);
      const matchesRole = !roleFilter || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleResetPassword = async (user) => {
    if (!user?.email) {
      showModal('This user does not have an email address.');
      return;
    }

    setResettingUserId(user.id);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        showModal('Your session has expired. Please log in again.');
        return;
      }

      let response;

      try {
        response = await fetch(`${API_URL}/api/users/${user.id}/reset-default-password`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (networkError) {
        throw new Error(`Cannot connect to the server at ${API_URL}. Please start the server and try again.`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to set default password.');
      }

      showModal(`${user.email}'s password has been set to ${DEFAULT_USER_PASSWORD}.`);
    } catch (err) {
      console.error('Reset password error:', err);
      showModal( err.message || 'Failed to set default password.');
    } finally {
      setResettingUserId(null);
    }
  };

  return (
    <div className="h-screen overflow-y-auto px-4 py-8 mt-8">
      <div className="mx-auto max-w-6xl pt-8">
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-300 bg-white p-3 shadow-sm lg:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, username, or email"
              className="w-full rounded border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 lg:w-48"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded bg-sky-800 px-4 py-2 text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
          <table className="w-full min-w-[820px] table-auto">
            <thead className="bg-gray-200 text-left text-sm text-sky-900">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Username</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-gray-200 text-sm hover:bg-gray-50">
                    <td className="p-3 uppercase">
                      {user.lastname}, {user.firstname} {user.middlename || ''}
                    </td>
                    <td className="p-3">{user.username || '-'}</td>
                    <td className="p-3">{user.email || '-'}</td>
                    <td className="p-3 uppercase">{user.role || '-'}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleResetPassword(user)}
                        disabled={resettingUserId === user.id}
                        className="rounded bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {resettingUserId === user.id ? 'Resetting...' : 'Set Default Password'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        message={modalMessage}
      />
    </div>
  );
}
