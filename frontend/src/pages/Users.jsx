import React, { useEffect, useState } from "react";
import API from "../services/api";
import CustomModal from "../components/CustomModal";
import {
  UserPlus,
  Search,
  Filter,
  UserCheck,
  UserX,
  Key,
  Edit2,
  Trash2
} from "lucide-react";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Form fields
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("Employee");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");

  // Password reset modal controls
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (deptFilter) params.department = deptFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await API.get("/users", { params });
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error("Error loading users", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, deptFilter, statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const userData = {
      name,
      employeeId,
      email,
      mobile,
      role,
      department,
      designation,
      password
    };

    try {
      if (isEditMode) {
        // Exclude password in edit mode (we have a separate reset password action)
        delete userData.password;
        const res = await API.put(`/users/${selectedUserId}`, userData);
        if (res.data.success) {
          setSuccess("User updated successfully");
          fetchUsers();
          setTimeout(() => setIsModalOpen(false), 1500);
        }
      } else {
        const res = await API.post("/users", userData);
        if (res.data.success) {
          setSuccess("User created successfully");
          fetchUsers();
          setTimeout(() => setIsModalOpen(false), 1500);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === "Active" ? "Disabled" : "Active";
    try {
      const res = await API.put(`/users/${user._id}`, { status: nextStatus });
      if (res.data.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, status: nextStatus } : u))
        );
      }
    } catch (err) {
      console.error("Error toggling status", err);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this user account?")) {
      try {
        const res = await API.delete(`/users/${id}?hard=true`);
        if (res.data.success) {
          setUsers((prev) => prev.filter((u) => u._id !== id));
        }
      } catch (err) {
        console.error("Error deleting user", err);
      }
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!newPassword) {
      setError("Please specify a new password");
      return;
    }
    try {
      const res = await API.put(`/users/${selectedUserId}/reset-password`, { password: newPassword });
      if (res.data.success) {
        setSuccess("Password reset successfully");
        setNewPassword("");
        setTimeout(() => setIsResetOpen(false), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error resetting password");
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedUserId(null);
    setName("");
    setEmployeeId("");
    setEmail("");
    setMobile("");
    setRole("Employee");
    setDepartment("");
    setDesignation("");
    setPassword("");
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setIsEditMode(true);
    setSelectedUserId(user._id);
    setName(user.name);
    setEmployeeId(user.employeeId);
    setEmail(user.email);
    setMobile(user.mobile);
    setRole(user.role);
    setDepartment(user.department);
    setDesignation(user.designation);
    setPassword(""); // Password cannot be edited here
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const openResetModal = (user) => {
    setSelectedUserId(user._id);
    setNewPassword("");
    setError("");
    setSuccess("");
    setIsResetOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">User Directory</h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Create, manage, and monitor employee access and details
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors self-start"
        >
          <UserPlus size={16} />
          Create User Account
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-4 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search by name, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Role */}
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Team Leader">Team Leader</option>
            <option value="Employee">Employee</option>
          </select>
        </div>

        {/* Department */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Departments</option>
          <option value="Management">Management</option>
          <option value="Engineering">Engineering</option>
          <option value="Design">Design</option>
          <option value="Delivery">Delivery</option>
          <option value="QA">QA</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Disabled">Disabled</option>
        </select>
      </div>

      {/* Directory Table */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto mb-4" />
            Loading accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-gray-400 text-sm">
            No user accounts found matching selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/50 text-slate-500 dark:text-gray-400 text-xs font-bold uppercase border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Employee ID</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Role / Department</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800/80">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img
                        src={u.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">{u.name}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{u.designation}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300 font-bold">
                      {u.employeeId}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-700 dark:text-slate-300 block">{u.email}</span>
                      <span className="text-[10px] text-gray-400 block">{u.mobile}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-1">
                        {u.role}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-gray-400 font-medium">
                        {u.department}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          u.status === "Active"
                            ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400"
                            : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit Profile"
                          className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-md"
                        >
                          <Edit2 size={13} />
                        </button>
                        {/* Password reset */}
                        <button
                          onClick={() => openResetModal(u)}
                          title="Reset Password"
                          className="p-1.5 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-md"
                        >
                          <Key size={13} />
                        </button>
                        {/* Disable/Enable */}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={u.status === "Active" ? "Disable Account" : "Activate Account"}
                          className={`p-1.5 rounded-md ${
                            u.status === "Active"
                              ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10"
                              : "text-green-500 hover:bg-green-50 dark:hover:bg-green-950/10"
                          }`}
                        >
                          {u.status === "Active" ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>
                        {/* Hard Delete */}
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          title="Permanently Delete"
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-md"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Account Modal */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "Modify Profile Details" : "Create User Account"}
      >
        {error && (
          <div className="p-3 mb-4 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 mb-4 text-xs font-semibold text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Employee ID
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Email ID (Username)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Mobile Number
              </label>
              <input
                type="text"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                <option value="Employee">Employee</option>
                <option value="Team Leader">Team Leader</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Designation
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Developer"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {!isEditMode && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Manual Password
              </label>
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-semibold"
            >
              {isEditMode ? "Save Changes" : "Create Account"}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* Manual Password Reset Modal */}
      <CustomModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="Admin Reset Password"
      >
        {error && (
          <div className="p-3 mb-4 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 mb-4 text-xs font-semibold text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Enter New Password
            </label>
            <input
              type="password"
              required
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              className="bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Save Password
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default Users;
