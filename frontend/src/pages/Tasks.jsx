import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import CustomModal from "../components/CustomModal";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Search,
  Filter,
  Sliders,
  Clock,
  History,
  MessageSquare,
  Paperclip,
  Upload,
  AlertTriangle
} from "lucide-react";

const Tasks = () => {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [assigneesList, setAssigneesList] = useState([]);

  // Task Editing State
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editEstHours, setEditEstHours] = useState("");

  // Task Checklist & Submission State
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [submissionDetails, setSubmissionDetails] = useState("");
  const [submissionChecklist, setSubmissionChecklist] = useState([]);
  const [editChecklist, setEditChecklist] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Comments / logs / attachments form
  const [commentText, setCommentText] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [workDesc, setWorkDesc] = useState("");
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (projectFilter) params.project = projectFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assignedTo = assigneeFilter;

      const res = await API.get("/tasks", { params });
      if (res.data.success) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      console.error("Error loading tasks list", err);
    }
    setLoading(false);
  };

  const fetchProjectsList = async () => {
    try {
      const res = await API.get("/projects");
      if (res.data.success) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.error("Error loading projects directory dropdown", err);
    }
  };

  const fetchAssigneesList = async () => {
    try {
      const res = await API.get("/users");
      if (res.data.success) {
        setAssigneesList(res.data.users.filter(u => u.role === "Team Leader" || u.role === "Employee"));
      }
    } catch (err) {
      console.error("Error loading assignees directory dropdown", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, projectFilter, statusFilter, priorityFilter, assigneeFilter]);

  useEffect(() => {
    fetchProjectsList();
    fetchAssigneesList();
  }, []);

  const handleOpenTaskDetails = async (task) => {
    try {
      const res = await API.get(`/tasks/${task._id}`);
      if (res.data.success) {
        const taskData = res.data.task;
        setSelectedTask(taskData);
        setSubmissionChecklist(taskData.checklist ? JSON.parse(JSON.stringify(taskData.checklist)) : []);
        setIsSubmittingTask(false);
        setSubmissionDetails("");
        setIsTaskModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load task details", err);
    }
  };

  const handleSubmitTask = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const res = await API.put(`/tasks/${selectedTask._id}/submit`, {
        checklist: submissionChecklist,
        submissionDetails: submissionDetails
      });
      if (res.data.success) {
        const taskRes = await API.get(`/tasks/${selectedTask._id}`);
        setSelectedTask(taskRes.data.task);
        setIsSubmittingTask(false);
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to submit task:", err);
      alert(err.response?.data?.error || "Error submitting task");
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    if (user.role === "Employee" && newStatus === "Completed") {
      setSubmissionChecklist(selectedTask.checklist ? JSON.parse(JSON.stringify(selectedTask.checklist)) : []);
      setSubmissionDetails("");
      setIsSubmittingTask(true);
      return;
    }
    try {
      const res = await API.put(`/tasks/${taskId}`, { status: newStatus });
      if (res.data.success) {
        fetchTasks();
        if (selectedTask && selectedTask._id === taskId) {
          setSelectedTask((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error("Error updating task status", err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await API.post(`/tasks/${selectedTask._id}/comments`, { text: commentText });
      if (res.data.success) {
        const taskRes = await API.get(`/tasks/${selectedTask._id}`);
        setSelectedTask(taskRes.data.task);
        setCommentText("");
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to add comment", err);
    }
  };

  const handleLogWork = async (e) => {
    e.preventDefault();
    if (!workHours || !workDesc.trim()) return;

    try {
      const res = await API.post(`/tasks/${selectedTask._id}/worklogs`, {
        hoursLogged: parseFloat(workHours),
        description: workDesc
      });
      if (res.data.success) {
        const taskRes = await API.get(`/tasks/${selectedTask._id}`);
        setSelectedTask(taskRes.data.task);
        setWorkHours("");
        setWorkDesc("");
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to log work hours", err);
    }
  };

  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!uploadingFile) return;
    setUploadError("");

    const formData = new FormData();
    formData.append("file", uploadingFile);

    try {
      const res = await API.post(`/tasks/${selectedTask._id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        const taskRes = await API.get(`/tasks/${selectedTask._id}`);
        setSelectedTask(taskRes.data.task);
        setUploadingFile(null);
        document.getElementById("task-file-input-tasks").value = "";
        fetchTasks();
      }
    } catch (err) {
      setUploadError(err.response?.data?.error || "Error uploading file");
    }
  };

  // --- Task Editing Handlers ---
  const handleStartEditTask = () => {
    setEditTitle(selectedTask.title || "");
    setEditDesc(selectedTask.description || "");
    setEditAssignee(selectedTask.assignedTo?._id || selectedTask.assignedTo || "");
    setEditPriority(selectedTask.priority || "Medium");
    setEditStartDate(selectedTask.startDate ? new Date(selectedTask.startDate).toISOString().substring(0, 10) : "");
    setEditDueDate(selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().substring(0, 10) : "");
    setEditEstHours(selectedTask.estimatedHours || 0);
    setEditChecklist(selectedTask.checklist ? JSON.parse(JSON.stringify(selectedTask.checklist)) : []);
    setNewChecklistItem("");
    setIsEditingTask(true);
  };

  const handleSaveTaskEdits = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const response = await API.put(`/tasks/${selectedTask._id}`, {
        title: editTitle,
        description: editDesc,
        assignedTo: editAssignee,
        priority: editPriority,
        startDate: editStartDate,
        dueDate: editDueDate,
        estimatedHours: parseFloat(editEstHours) || 0,
        checklist: editChecklist
      });
      if (response.data.success) {
        const taskRes = await API.get(`/tasks/${selectedTask._id}`);
        setSelectedTask(taskRes.data.task);
        setIsEditingTask(false);
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to save task edits:", err);
      alert(err.response?.data?.error || "Failed to update task details");
    }
  };


  const getPriorityStyle = (p) => {
    switch (p) {
      case "Critical":
        return "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30";
      case "High":
        return "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30";
      case "Medium":
        return "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/30";
      default:
        return "bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500";
      case "Delayed":
        return "bg-rose-500";
      case "In Progress":
        return "bg-indigo-500";
      case "On Hold":
        return "bg-amber-500";
      default:
        return "bg-slate-400";
    }
  };

  // Live client-side filtered metrics calculations
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const activeCount = tasks.filter((t) => ["In Progress", "Not Started"].includes(t.status)).length;
  const delayedCount = tasks.filter((t) => t.status === "Delayed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Workspace Tasks Directory</h1>
        <p className="text-xs text-slate-500 dark:text-gray-400">
          Track deadlines, update activity statuses, and log hours logged on tasks
        </p>
      </div>

      {/* Task Overview Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-4">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Tasks</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-4">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Tasks</span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-4">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Delayed</span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{delayedCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-4">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Completed</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedCount}</p>
        </div>
      </div>

      {/* Filters Dashboard */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-4 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search task title or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-gray-400" />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Selector */}
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

        {/* Status Selector */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="On Hold">On Hold</option>
          <option value="Delayed">Delayed</option>
        </select>

        {/* Assignee Selector */}
        {user?.role !== "Employee" && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2 px-3 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Assignees</option>
            {assigneesList.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name} ({a.role})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Task List - Modern Card Directory */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto mb-4" />
          Loading tasks directory...
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center text-slate-500 dark:text-gray-400 text-sm bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg">
          No tasks found matching current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task._id}
              onClick={() => handleOpenTaskDetails(task)}
              className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand-400 dark:hover:border-brand-800 cursor-pointer transition-all duration-200"
            >
              {/* Left Side: Task Info */}
              <div className="flex items-start gap-3 min-w-0 md:flex-1">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${getStatusColor(task.status)}`} />
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm hover:text-brand-700 dark:hover:text-brand-400 transition-colors truncate">
                    {task.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded uppercase shrink-0">
                      {task.taskId}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold truncate">
                      {task.project?.name || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle & Right Side: Metadata Grid */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                {/* Assignee */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <img
                    src={task.assignedTo?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                    alt={task.assignedTo?.name}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                  <span className="font-semibold text-slate-600 dark:text-slate-300 text-[11px] truncate">
                    {task.assignedTo?.name || "Unassigned"}
                  </span>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 min-w-[110px]">
                  <Clock size={13} className={task.status === "Delayed" ? "text-rose-500" : "text-slate-400"} />
                  <span className={`font-bold text-[11px] ${task.status === "Delayed" ? "text-rose-500 dark:text-rose-400" : ""}`}>
                    {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Priority */}
                <div className="w-[80px]">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider block text-center ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="w-[100px] text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    task.status === "Completed"
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30"
                      : task.status === "Delayed"
                      ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30"
                      : task.status === "In Progress"
                      ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30"
                      : "bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700"
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <CustomModal isOpen={isTaskModalOpen} onClose={() => { setIsTaskModalOpen(false); setIsEditingTask(false); }} title={`${selectedTask.taskId} Details`} size="xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[75vh] overflow-y-auto pr-1 text-slate-800 dark:text-slate-200">
            
            {/* Left 2 columns: Title, desc, comment thread, activity */}
            <div className="lg:col-span-2 space-y-6">
              {isEditingTask ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Task Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Task Description
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Checklist (To-Do List)
                    </label>
                    <div className="space-y-2">
                      {editChecklist.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700 text-xs">
                          <span>{item.text}</span>
                          <button
                            type="button"
                            onClick={() => setEditChecklist(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-800 font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add new checklist item..."
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newChecklistItem.trim()) {
                              setEditChecklist(prev => [...prev, { text: newChecklistItem.trim(), isCompleted: false }]);
                              setNewChecklistItem("");
                            }
                          }}
                          className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${getPriorityStyle(selectedTask.priority)}`}>
                    {selectedTask.priority} Priority
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white leading-snug">{selectedTask.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-gray-800 p-4 rounded-lg border border-slate-100 dark:border-gray-800">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Task Checklist & Submission Section */}
              {isSubmittingTask ? (
                <form onSubmit={handleSubmitTask} className="bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4 space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-gray-700 pb-2">
                    <h4 className="font-extrabold text-slate-800 dark:text-white uppercase tracking-wider text-[10px] ">
                      Submit Task Completion
                    </h4>
                    <span className="text-[10px] bg-brand-50 dark:bg-brand-900/30 text-brand-600 px-2 py-0.5 rounded font-black uppercase">
                      {selectedTask.taskId}
                    </span>
                  </div>

                  {/* Checklist Section */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      Checklist (To-Do List given by manager/TL)
                    </label>
                    {submissionChecklist.length === 0 ? (
                      <p className="text-slate-400 italic">No checklist items defined for this task.</p>
                    ) : (
                      <div className="space-y-2">
                        {submissionChecklist.map((item, idx) => (
                          <label key={idx} className="flex items-center gap-2.5 cursor-pointer p-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800/80 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={item.isCompleted}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setSubmissionChecklist(prev => prev.map((c, i) => i === idx ? { ...c, isCompleted: val } : c));
                              }}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                            />
                            <span className={item.isCompleted ? "line-through text-slate-400 font-semibold" : "text-slate-700 dark:text-slate-300 font-semibold"}>
                              {item.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Automatic submission date display */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      Submission Date
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${new Date().toLocaleDateString()} (Today - Automatically Captured)`}
                      className="w-full bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-500 dark:text-slate-400 focus:outline-none font-semibold cursor-not-allowed"
                    />
                  </div>

                  {/* Optional Submission Details */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      Submission Details (Optional)
                    </label>
                    <textarea
                      placeholder="Add any extra details, links, or notes about this submission..."
                      rows={3}
                      value={submissionDetails}
                      onChange={(e) => setSubmissionDetails(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSubmittingTask(false)}
                      className="bg-slate-200 hover:bg-slate-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-2 rounded-lg font-bold"
                    >
                      Confirm & Submit
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Read-Only Checklist for Active Task OR Submission Record for Completed Task */}
                  {selectedTask.status === "Completed" ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 p-4 rounded-lg space-y-3 text-xs text-slate-800 dark:text-slate-200">
                      <h4 className="font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider text-[10px] border-b border-emerald-200 dark:border-emerald-900 pb-1">
                        Task Submission Record
                      </h4>
                      {selectedTask.submissionDate && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Submission Date:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {new Date(selectedTask.submissionDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric" })}
                          </span>
                        </div>
                      )}
                      {selectedTask.submissionDetails && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block mb-1">Submission Details:</span>
                          <p className="p-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded font-semibold text-slate-700 dark:text-slate-300">
                            {selectedTask.submissionDetails}
                          </p>
                        </div>
                      )}
                      {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block mb-1">To-Do List Status:</span>
                          <div className="space-y-1.5">
                            {selectedTask.checklist.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.isCompleted}
                                  disabled
                                  className="rounded border-slate-300 text-brand-600 h-3.5 w-3.5 shrink-0"
                                />
                                <span className={item.isCompleted ? "line-through text-slate-400 font-semibold" : "text-slate-700 dark:text-slate-300 font-semibold"}>
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    selectedTask.checklist && selectedTask.checklist.length > 0 && (
                      <div className="space-y-2 bg-slate-50 dark:bg-gray-800 p-4 rounded-lg border border-slate-100 dark:border-gray-800">
                        <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider border-b border-slate-200 dark:border-gray-700 pb-1">
                          Task Checklist (To-Do List)
                        </h4>
                        <div className="space-y-1.5 text-xs">
                          {selectedTask.checklist.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.isCompleted}
                                disabled
                                className="rounded border-slate-300 text-brand-600 h-3.5 w-3.5 shrink-0"
                              />
                              <span className={item.isCompleted ? "line-through text-slate-400 font-semibold" : "text-slate-700 dark:text-slate-300 font-semibold"}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </>
              )}

              {/* AI priority suggestion */}
              {selectedTask.aiSuggestion && (
                <div className={`p-3 rounded-lg border text-xs leading-relaxed flex items-center gap-3 ${
                  selectedTask.aiSuggestion.priorityChangeSuggested
                    ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 text-slate-800"
                    : "bg-slate-50 dark:bg-gray-800 border-slate-200 text-slate-500 dark:text-slate-400"
                }`}>
                  <Sliders size={18} className="text-brand-500 animate-pulse" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[9px] text-brand-600 dark:text-brand-400">
                      AI Priority suggestion
                    </span>
                    <span>{selectedTask.aiSuggestion.reason}</span>
                    {selectedTask.aiSuggestion.priorityChangeSuggested && (
                      <span className="font-extrabold ml-1 text-amber-600 dark:text-amber-400">
                        Raise priority to {selectedTask.aiSuggestion.suggestedPriority}.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Work logs tracker */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-gray-800 pb-1">
                  Task Work Logs ({selectedTask.workLogs?.length || 0})
                </h4>
                
                {/* Log list */}
                {selectedTask.workLogs?.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic">No hours logged yet</p>
                ) : (
                  <div className="space-y-2">
                    {selectedTask.workLogs.map((log, idx) => (
                      <div key={log._id || idx} className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-gray-800 p-2.5 rounded-lg flex justify-between gap-4 text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{log.employee?.name}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{log.description}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold block text-brand-600">{log.hoursLogged} hrs</span>
                          <span className="text-[9px] text-gray-400 block">{new Date(log.date).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Log work hours form */}
                <form onSubmit={handleLogWork} className="flex gap-2 items-center bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-800 rounded-lg p-3">
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="Hrs"
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                    className="w-16 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-2.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Work description..."
                    value={workDesc}
                    onChange={(e) => setWorkDesc(e.target.value)}
                    className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-xs font-bold"
                  >
                    Log Time
                  </button>
                </form>
              </div>

              {/* Comment thread */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-gray-800 pb-1">
                  Comments Thread ({selectedTask.comments?.length || 0})
                </h4>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {selectedTask.comments?.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">No comments posted</p>
                  ) : (
                    selectedTask.comments.map((c, idx) => (
                      <div key={c._id || idx} className="flex gap-2.5 items-start text-xs bg-slate-50/30 dark:bg-gray-900/20 border border-slate-200 dark:border-gray-800 p-2.5 rounded-lg">
                        <img
                          src={c.author?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                          alt={c.author?.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{c.author?.name}</span>
                            <span className="text-[9px] text-gray-400">{new Date(c.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "numeric" })}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">{c.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-xs font-bold"
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>

            {/* Right column: meta details, attachments, status selector */}
            <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-gray-800 rounded-lg p-4 space-y-6 text-xs h-fit">
              {/* Status and Action Panel */}
              <div className="space-y-3">
                {user?.role !== "Employee" && (
                  <div className="flex gap-2">
                    {isEditingTask ? (
                      <>
                        <button
                          onClick={handleSaveTaskEdits}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingTask(false)}
                          className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-800 dark:text-slate-200 py-2 px-3 rounded-lg text-xs font-bold transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStartEditTask}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors"
                      >
                        Edit Task Details
                      </button>
                    )}
                  </div>
                )}

                {!isEditingTask && (
                  <div className="space-y-3">
                    <div>
                      <span className="block text-[9px] uppercase font-black tracking-wider text-gray-400 mb-1">Status</span>
                      <select
                        value={selectedTask.status}
                        onChange={(e) => handleUpdateStatus(selectedTask._id, e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Delayed">Delayed</option>
                        {user?.role !== "Employee" && <option value="Completed">Completed</option>}
                      </select>
                    </div>
                    {user?.role === "Employee" && (selectedTask.assignedTo?._id === user._id || selectedTask.assignedTo === user._id) && selectedTask.status !== "Completed" && !isSubmittingTask && (
                      <button
                        onClick={() => {
                          setSubmissionChecklist(selectedTask.checklist ? JSON.parse(JSON.stringify(selectedTask.checklist)) : []);
                          setSubmissionDetails("");
                          setIsSubmittingTask(true);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors shadow-sm"
                      >
                        Submit Task for Completion
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Task metadata */}
              <div className="space-y-3 border-t border-slate-200 dark:border-gray-800 pt-4">
                {isEditingTask ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                        Est. Hours
                      </label>
                      <input
                        type="number"
                        value={editEstHours}
                        onChange={(e) => setEditEstHours(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                        Priority
                      </label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                        Assignee
                      </label>
                      <select
                        value={editAssignee}
                        onChange={(e) => setEditAssignee(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="">Select Assignee...</option>
                        {selectedTask.project?.teamMembers ? (
                          selectedTask.project.teamMembers.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name} ({m.role})
                            </option>
                          ))
                        ) : (
                          assigneesList.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name} ({m.role})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Due Date</span>
                      <span className="font-bold flex items-center gap-1">
                        <CalendarIcon size={12} className="text-rose-500" />
                        {new Date(selectedTask.dueDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Est. Hours</span>
                      <span className="font-bold">{selectedTask.estimatedHours} hrs</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Logged Time</span>
                      <span className="font-bold text-brand-600">{selectedTask.totalCompletionTime || 0} hrs</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Assignee</span>
                      <span className="font-bold">{selectedTask.assignedTo?.name || "Unassigned"}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Creator</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-400">{selectedTask.assignedBy?.name || "System"}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Task attachments upload */}
              <div className="space-y-3 border-t border-slate-200 dark:border-gray-800 pt-4">
                <span className="block text-[9px] uppercase font-black tracking-wider text-gray-400 mb-1">
                  Task Files ({selectedTask.attachments?.length || 0})
                </span>

                {/* Attachments List */}
                {selectedTask.attachments?.length > 0 && (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {selectedTask.attachments.map((file, idx) => (
                      <a
                        key={file._id || idx}
                        href={`http://localhost:5000${file.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-800 rounded-lg hover:border-brand-400 transition-colors"
                      >
                        <span className="font-semibold truncate max-w-[120px] text-slate-700 dark:text-slate-200">
                          {file.name}
                        </span>
                        <Paperclip size={10} className="text-gray-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Upload attachment file */}
                <form onSubmit={handleUploadAttachment} className="space-y-2">
                  <input
                    type="file"
                    id="task-file-input-tasks"
                    onChange={(e) => setUploadingFile(e.target.files[0])}
                    className="text-[10px] w-full"
                  />
                  <button
                    type="submit"
                    disabled={!uploadingFile}
                    className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload size={12} />
                    Upload File
                  </button>
                  {uploadError && <span className="text-[10px] text-red-500 block">{uploadError}</span>}
                </form>
              </div>

              {/* Task Activity History Log */}
              <div className="space-y-2 border-t border-slate-200 dark:border-gray-800 pt-4">
                <span className="block text-[9px] uppercase font-black tracking-wider text-gray-400 mb-1.5 flex items-center gap-1">
                  <History size={10} />
                  Activity History
                </span>
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                  {selectedTask.activityHistory?.map((h, index) => (
                    <div key={h._id || index} className="text-[10px] border-l-2 border-slate-300 dark:border-gray-800 pl-2.5 py-0.5 space-y-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block leading-tight">{h.action}</span>
                      <span className="text-gray-400 block text-[9px]">
                        By {h.performedBy?.name || "User"} • {new Date(h.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </CustomModal>
      )}
    </div>
  );
};

export default Tasks;
