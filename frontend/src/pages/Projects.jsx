import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import CustomModal from "../components/CustomModal";
import {
  FolderPlus,
  Calendar,
  DollarSign,
  User,
  Users as UsersIcon,
  Search,
  Filter,
  CheckCircle,
  Archive,
  ArrowRight,
  Trash2
} from "lucide-react";

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedManager, setSelectedManager] = useState("");
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [selectedTeamLeader, setSelectedTeamLeader] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await API.get("/projects", { params });
      if (res.data.success) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.error("Error fetching projects", err);
    }
    setLoading(false);
  };

  const fetchUsersList = async () => {
    if (!user || user.role !== "Manager") return;
    try {
      const res = await API.get("/users");
      if (res.data.success) {
        const allUsers = res.data.users;
        setManagers(allUsers.filter((u) => u.role === "Manager" && u.status === "Active"));
        setTeamLeaders(allUsers.filter((u) => u.role === "Team Leader" && u.status === "Active"));
        setEmployees(allUsers.filter((u) => u.role === "Employee" && u.status === "Active"));
      }
    } catch (err) {
      console.error("Error fetching users list for project selection", err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsersList();
  }, [search, priorityFilter, statusFilter, user]);

  useEffect(() => {
    if (isModalOpen && user && user.role === "Manager" && !selectedManager) {
      setSelectedManager(user._id);
    }
  }, [isModalOpen, user, selectedManager]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedManager) {
      setError("Please select a Manager for this project");
      return;
    }

    if (!selectedTeamLeader) {
      setError("Please select a Team Leader for this project");
      return;
    }

    const projectData = {
      name,
      description,
      clientName,
      priority: priority || "Medium",
      plannedStartDate,
      plannedEndDate,
      budget: parseFloat(budget) || 0,
      manager: selectedManager,
      teamMembers: selectedTeamLeader ? [selectedTeamLeader] : []
    };

    try {
      const res = await API.post("/projects", projectData);
      if (res.data.success) {
        setSuccess("Project created successfully");
        fetchProjects();
        setTimeout(() => {
          setIsModalOpen(false);
          // Reset form
          setName("");
          setDescription("");
          setClientName("");
          setPriority("Medium");
          setPlannedStartDate("");
          setPlannedEndDate("");
          setBudget("");
          setSelectedManager("");
          setSelectedTeam([]);
          setSelectedTeamLeader("");
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error creating project");
    }
  };

  const handleArchiveProject = async (id) => {
    if (window.confirm("Are you sure you want to archive this project?")) {
      try {
        const res = await API.delete(`/projects/${id}?archive=true`);
        if (res.data.success) {
          fetchProjects();
        }
      } catch (err) {
        console.error("Error archiving project", err);
      }
    }
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm("Are you sure you want to PERMANENTLY delete this project and all its tasks? This action cannot be undone.")) {
      try {
        const res = await API.delete(`/projects/${id}`);
        if (res.data.success) {
          fetchProjects();
        }
      } catch (err) {
        console.error("Error deleting project", err);
        alert(err.response?.data?.error || "Error deleting project");
      }
    }
  };

  const handleTeamMemberToggle = (empId) => {
    if (selectedTeam.includes(empId)) {
      setSelectedTeam((prev) => prev.filter((id) => id !== empId));
    } else {
      setSelectedTeam((prev) => [...prev, empId]);
    }
  };

  const getPriorityStyle = (p) => {
    switch (p) {
      case "Critical":
        return "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400";
      case "High":
        return "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400";
      case "Medium":
        return "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400";
      default:
        return "bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400";
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case "On Track":
        return "bg-green-500";
      case "At Risk":
        return "bg-amber-500";
      case "Delayed":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Projects Directory</h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Monitor workloads, budgets, priorities, and project analytics health
          </p>
        </div>
        {user.role === "Manager" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors self-start"
          >
            <FolderPlus size={16} />
            Create Project
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-4 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Priority */}
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-gray-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="On Track">On Track</option>
          <option value="At Risk">At Risk</option>
          <option value="Delayed">Delayed</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto mb-4" />
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center text-slate-500 dark:text-gray-400 text-sm">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div
              key={p._id}
              className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col justify-between transition-all duration-300 relative group"
            >
              {/* Project Card Body */}
              <div className="p-6 space-y-4">
                {/* Health & Priority */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full text-white ${getHealthColor(
                      p.status
                    )}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {p.status}
                  </span>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getPriorityStyle(p.priority)}`}>
                    {p.priority} Priority
                  </span>
                </div>

                {/* Name */}
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                {/* Info Fields */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Calendar size={14} className="text-gray-400" />
                    <span>
                      {new Date(p.plannedEndDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <DollarSign size={14} className="text-gray-400" />
                    <span>${p.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 truncate">
                    <User size={14} className="text-gray-400" />
                    <span className="truncate">{p.manager?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <UsersIcon size={14} className="text-gray-400" />
                    <span>{p.teamMembers?.length || 0} Members</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="text-gray-400 uppercase">Completion Rate</span>
                    <span className="text-slate-800 dark:text-slate-200">{p.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-gray-800/40 border-t border-slate-200/60 dark:border-gray-800 flex items-center justify-between">
                <Link
                  to={`/projects/${p._id}`}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1 group-hover:gap-1.5 transition-all"
                >
                  Dashboard & Tasks
                  <ArrowRight size={12} />
                </Link>
                {user.role === "Manager" && (
                  <div className="flex items-center gap-1.5">
                    {p.status !== "Archived" && (
                      <button
                        onClick={() => handleArchiveProject(p._id)}
                        title="Archive Project"
                        className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteProject(p._id)}
                      title="Permanently Delete Project"
                      className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal (Admin Only) */}
      <CustomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project" size="lg">
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

        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Project Name
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
                Client Name
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Planned Start Date
              </label>
              <input
                type="date"
                required
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Planned End Date
              </label>
              <input
                type="date"
                required
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Team Leader Selection Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Select Team Leader
            </label>
            <select
              required
              value={selectedTeamLeader}
              onChange={(e) => setSelectedTeamLeader(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            >
              <option value="">Select Team Leader...</option>
              {teamLeaders.map((tl) => (
                <option key={tl._id} value={tl._id}>
                  {tl.name} ({tl.department || "No Department"})
                </option>
              ))}
            </select>
          </div>

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
              Create Project
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default Projects;
