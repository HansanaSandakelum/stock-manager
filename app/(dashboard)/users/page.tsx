'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { Users, Plus, Edit2, Trash2, Search, Mail, Calendar } from 'lucide-react';
import { Select } from '@/components/ui/Select';

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Validation errors state
  const [errors, setErrors] = useState<any>({});

  // Protect route
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || (session?.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchUsers();
    }
  }, [search, status, session]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/users?search=${search}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        toast(data.error || 'Failed to fetch users', 'error');
      }
    } catch (error) {
      toast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('staff');
    setErrors({});
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate inputs
    const newErrors: any = {};
    if (!name) {
      newErrors.name = 'Full Name is required';
    } else if (name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }
    
    if (!email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      newErrors.password = 'Password must contain at least one letter and one number';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('User registered successfully!', 'success');
        setIsAddOpen(false);
        resetForm();
        fetchUsers();
      } else {
        if (data.error && data.error.toLowerCase().includes('email')) {
          setErrors({ email: data.error });
        } else {
          toast(data.error || 'Registration failed', 'error');
        }
      }
    } catch (err) {
      toast('An error occurred during registration', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role || 'staff');
    setPassword('');
    setIsEditOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: any = {};
    if (!name) {
      newErrors.name = 'Full Name is required';
    } else if (name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }
    
    if (!email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        newErrors.password = 'Password must contain at least one letter and one number';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitLoading(true);
    try {
      const payload: any = { name, email, role };
      if (password.trim() !== '') {
        payload.password = password;
      }

      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast('User updated successfully!', 'success');
        setIsEditOpen(false);
        resetForm();
        setSelectedUser(null);
        fetchUsers();
      } else {
        if (data.error && data.error.toLowerCase().includes('email')) {
          setErrors({ email: data.error });
        } else {
          toast(data.error || 'Failed to update user', 'error');
        }
      }
    } catch (err) {
      toast('An error occurred during update', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if ((session?.user as any)?.id === user._id) {
      toast('You cannot delete your own account!', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast('User deleted successfully', 'success');
        fetchUsers();
      } else {
        toast(data.error || 'Failed to delete user', 'error');
      }
    } catch (err) {
      toast('An error occurred', 'error');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">User Management</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage organization members and roles</p>
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <Card className="p-6 space-y-4 border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </Card>
      </div>
    );
  }

  // Prevent render for non-admin
  if ((session?.user as any)?.role !== 'admin') {
    return null;
  }

  const getRoleBadge = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return <Badge variant="danger">Admin</Badge>;
      case 'staff':
      default:
        return <Badge variant="success">Staff</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            User Management
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage organization members and assign platform access roles</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {/* Main List Card */}
      <Card className="p-0 overflow-hidden border border-zinc-100 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015),0_1px_2px_rgb(0,0,0,0.01)]">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 flex flex-wrap items-center gap-3.5 bg-white dark:bg-[#0c0c14]">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50/30 hover:bg-zinc-50/70 focus:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all duration-200"
            />
          </div>
        </div>

        {users.length === 0 ? (
          <EmptyState 
            icon={Users}
            title="No users found"
            description="Register a new member to give them platform access."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-505">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold">User</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold hidden sm:table-cell">Email</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-center">Role</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold hidden sm:table-cell">Registered</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-zinc-800 dark:text-zinc-150 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-100/50 dark:border-indigo-900/30">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-900 dark:text-zinc-100">{user.name}</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-505 sm:hidden mt-0.5">{user.email}</span>
                        {(session?.user as any)?.id === user._id && (
                          <span className="text-[10px] text-indigo-500 font-medium">(You)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right space-x-1.5">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 inline-flex active:scale-95 cursor-pointer border-none"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {(session?.user as any)?.id !== user._id && (
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50/50 dark:hover:bg-red-950/20 inline-flex active:scale-95 cursor-pointer border-none"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register New User">
        <form onSubmit={handleAddUser} className="space-y-4">
          <Input 
            label="Full Name" 
            placeholder="John Doe" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            error={errors.name}
          />
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="john@example.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            error={errors.email}
          />
          <Input 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            error={errors.password}
          />
          <Input 
            label="Confirm Password" 
            type="password" 
            placeholder="••••••••" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            error={errors.confirmPassword}
          />
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Access Role</label>
            <Select
              value={role}
              onChange={setRole}
              options={[
                { value: 'staff', label: 'Staff (Inventory Management & Operations)' },
                { value: 'admin', label: 'Administrator (Full Access & User Management)' }
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitLoading}>
              Register User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit User Account">
        <form onSubmit={handleEditUser} className="space-y-4">
          <Input 
            label="Full Name" 
            placeholder="John Doe" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            error={errors.name}
          />
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="john@example.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            error={errors.email}
          />
          <Input 
            label="Password (Leave blank to keep current)" 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            error={errors.password}
          />
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Access Role</label>
            <Select
              value={role}
              onChange={setRole}
              disabled={(session?.user as any)?.id === selectedUser?._id}
              options={[
                { value: 'staff', label: 'Staff (Inventory Management & Operations)' },
                { value: 'admin', label: 'Administrator (Full Access & User Management)' }
              ]}
            />
            {(session?.user as any)?.id === selectedUser?._id && (
              <span className="text-[10px] text-zinc-400 mt-1">You cannot modify your own role to prevent lockout.</span>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
