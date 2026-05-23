import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import CustomModal from "../components/CustomModal";
import {
  Calendar as CalendarIcon,
  DollarSign,
  User,
  Users as UsersIcon,
  Clock,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  Send,
  Upload,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sliders,
  CheckSquare,
  History,
  FileText
} from "lucide-react";

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [ganttTasks, setGanttTasks] = useState([]);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("kanban"); // kanban, gantt, calendar, chat, docs

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  // Create Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstHours, setTaskEstHours] = useState("");
  const [createTaskError, setCreateTaskError] = useState("");
  const [taskChecklist, setTaskChecklist] = useState([]);
  const [newTaskChecklistItem, setNewTaskChecklistItem] = useState("");

  // Task Details Modal State
  const [commentText, setCommentText] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [workDesc, setWorkDesc] = useState("");
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadError, setUploadError] = useState("");

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

  // Manage Team State
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);
  const [allUsersList, setAllUsersList] = useState([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);


  // Chat Tab State
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef(null);

  // Documents Tab State
  const [projectDocs, setProjectDocs] = useState([]);
  const [docFile, setDocFile] = useState(null);
  const [docError, setDocError] = useState("");

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchProjectData = async () => {
    try {
      const res = await API.get(`/projects/${id}`);
      if (res.data.success) {
        setProject(res.data.project);
        setTasks(res.data.tasks);
        setGanttTasks(res.data.ganttTasks);
        setAiPrediction(res.data.aiPrediction);
        setProjectDocs(res.data.project.documents || []);
      }
    } catch (err) {
      console.error("Error loading project detail", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProjectData().finally(() => setLoading(false));
  }, [id]);

  // Chat integration with socket
  useEffect(() => {
    if (activeTab === "chat" && socket) {
      // Join Room
      socket.emit("join_project", id);

      // Load History
      const fetchHistory = async () => {
        try {
          const res = await API.get(`/chat/${id}`);
          if (res.data.success) {
            setMessages(res.data.messages);
          }
        } catch (err) {
          console.error("Error loading chat logs", err);
        }
      };
      fetchHistory();

      // Listen for socket events
      socket.on("receive_message", (msg) => {
        if (msg.project === id) {
          setMessages((prev) => [...prev, msg]);
        }
      });

      return () => {
        socket.emit("leave_project", id);
        socket.off("receive_message");
      };
    }
  }, [activeTab, id, socket]);

  // Auto scroll chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-xs text-slate-500">Retrieving project boards...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg">
        <AlertTriangle className="mx-auto text-amber-500 mb-2" size={32} />
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Project Not Found</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This project may have been deleted or archived.</p>
        <Link to="/projects" className="mt-4 inline-block text-xs font-bold text-brand-600 hover:underline">
          Go back to projects
        </Link>
      </div>
    );
  }

  // --- Task Status Handlers ---
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
        // Refresh local tasks
        fetchProjectData();
        // If modal is open, refresh that too
        if (selectedTask && selectedTask._id === taskId) {
          setSelectedTask((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error("Error updating task status", err);
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
        fetchProjectData();
      }
    } catch (err) {
      console.error("Failed to submit task:", err);
      alert(err.response?.data?.error || "Error submitting task");
    }
  };

  // --- Create Task ---
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreateTaskError("");

    const taskData = {
      title: taskTitle,
      description: taskDesc,
      project: id,
      assignedTo: taskAssignee,
      priority: taskPriority,
      startDate: taskStartDate,
      dueDate: taskDueDate,
      estimatedHours: parseFloat(taskEstHours) || 0,
      checklist: taskChecklist
    };

    try {
      const res = await API.post("/tasks", taskData);
      if (res.data.success) {
        setIsCreateTaskModalOpen(false);
        fetchProjectData();
        // Reset form
        setTaskTitle("");
        setTaskDesc("");
        setTaskAssignee("");
        setTaskPriority("Medium");
        setTaskStartDate("");
        setTaskDueDate("");
        setTaskEstHours("");
        setTaskChecklist([]);
        setNewTaskChecklistItem("");
      }
    } catch (err) {
      setCreateTaskError(err.response?.data?.error || "Failed to create task");
    }
  };

  // --- Task Comments ---
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await API.post(`/tasks/${selectedTask._id}/comments`, { text: commentText });
      if (res.data.success) {
        // Refresh detail modal
        const taskRes = await API.get(`/tasks/${selectedTask._id}`);
        setSelectedTask(taskRes.data.task);
        setCommentText("");
        fetchProjectData(); // refresh parent board
      }
    } catch (err) {
      console.error("Failed to add comment", err);
    }
  };

  // --- Log Work ---
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
        fetchProjectData(); // refresh parent board
      }
    } catch (err) {
      console.error("Failed to log work hours", err);
    }
  };

  // --- Upload Task Attachment ---
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
        // Clear file input manually
        document.getElementById("task-file-input").value = "";
        fetchProjectData();
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
        // Fetch updated task from API to populate correctly
        const taskRes = await API.get(`/tasks/${selectedTask._id}`);
        setSelectedTask(taskRes.data.task);
        setIsEditingTask(false);
        fetchProjectData();
      }
    } catch (err) {
      console.error("Failed to save task edits:", err);
      alert(err.response?.data?.error || "Failed to update task details");
    }
  };

  // --- Manage Team Handlers ---
  const handleOpenManageTeam = async () => {
    try {
      const res = await API.get("/users");
      if (res.data.success) {
        // Get all active employees and team leaders
        const candidates = res.data.users.filter(u => u.role === "Team Leader" || u.role === "Employee");
        setAllUsersList(candidates);
        setSelectedTeamMembers(project.teamMembers ? project.teamMembers.map(m => m._id) : []);
        setIsManageTeamOpen(true);
      }
    } catch (err) {
      console.error("Failed to load users for team management", err);
      alert("Failed to load user list");
    }
  };

  const handleToggleTeamMember = (userId) => {
    if (selectedTeamMembers.includes(userId)) {
      setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== userId));
    } else {
      setSelectedTeamMembers([...selectedTeamMembers, userId]);
    }
  };

  const handleSaveTeamMembers = async () => {
    try {
      const res = await API.put(`/projects/${id}`, {
        teamMembers: selectedTeamMembers
      });
      if (res.data.success) {
        setIsManageTeamOpen(false);
        fetchProjectData();
      }
    } catch (err) {
      console.error("Failed to update project team members", err);
      alert(err.response?.data?.error || "Failed to update team members");
    }
  };

  // --- Upload Project Document ---
  const handleUploadProjectDoc = async (e) => {
    e.preventDefault();
    if (!docFile) return;
    setDocError("");

    const formData = new FormData();
    formData.append("file", docFile);

    try {
      const res = await API.post(`/projects/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        setProjectDocs(res.data.documents);
        setDocFile(null);
        document.getElementById("project-file-input").value = "";
      }
    } catch (err) {
      setDocError(err.response?.data?.error || "Error uploading document");
    }
  };

  // --- Chat Submit ---
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      const res = await API.post(`/chat/${id}`, { message: chatInput });
      if (res.data.success) {
        const savedMsg = res.data.message;
        // Emit Socket message for real-time broadcast
        if (socket) {
          socket.emit("send_message", {
            project: id,
            sender: {
              _id: user._id,
              name: user.name,
              avatar: user.avatar
            },
            message: chatInput,
            createdAt: savedMsg.createdAt
          });
        }
        setMessages((prev) => [...prev, savedMsg]);
        setChatInput("");
      }
    } catch (err) {
      console.error("Error sending message", err);
    }
  };

  // --- Open Task Detail Modal ---
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

  // Helper colors
  const getPriorityStyle = (p) => {
    switch (p) {
      case "Critical":
        return "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30";
      case "High":
        return "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30";
      case "Medium":
        return "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/30";
      default:
        return "bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700";
    }
  };

  // --- Calendar calculations ---
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  // Render Calendar Grid
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const cells = [];

    // Empty spaces before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-gray-900/30 border border-slate-100 dark:border-gray-800 min-h-[90px] p-1" />);
    }

    // Days with tasks
    for (let day = 1; day <= daysInMonth; day++) {
      const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayTasks = tasks.filter((t) => {
        const taskDate = new Date(t.dueDate);
        return (
          taskDate.getDate() === day &&
          taskDate.getMonth() === currentDate.getMonth() &&
          taskDate.getFullYear() === currentDate.getFullYear()
        );
      });

      cells.push(
        <div
          key={`day-${day}`}
          className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 min-h-[90px] p-2 hover:bg-slate-50 dark:hover:bg-gray-800/40 transition-colors flex flex-col justify-between"
        >
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block">{day}</span>
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[60px] mt-1">
            {dayTasks.map((t) => (
              <span
                key={t._id}
                onClick={() => handleOpenTaskDetails(t)}
                className={`text-[8px] leading-tight px-1.5 py-0.5 rounded truncate font-bold cursor-pointer block border hover:opacity-90 ${
                  t.status === "Completed"
                    ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200"
                    : t.status === "Delayed"
                    ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200"
                    : "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border-brand-200"
                }`}
              >
                {t.title}
              </span>
            ))}
          </div>
        </div>
      );
    }

    return cells;
  };

  const renderTeamHierarchy = () => {
    const manager = project.manager;
    if (!manager) {
      return (
        <div className="text-center text-xs text-gray-400 py-8 bg-slate-50 dark:bg-gray-900 rounded-lg border border-dashed border-slate-200 dark:border-gray-800">
          No Manager assigned to this project.
        </div>
      );
    }

    const members = project.teamMembers || [];
    const teamLeaders = members.filter((m) => m.role === "Team Leader");
    const employees = members.filter((m) => m.role === "Employee");

    const leaderToEmployeesMap = {};
    teamLeaders.forEach((tl) => {
      leaderToEmployeesMap[tl._id] = [];
    });
    const directEmployees = [];

    employees.forEach((emp) => {
      const empTasks = tasks.filter((t) => {
        const assignedToId = typeof t.assignedTo === "object" ? t.assignedTo?._id : t.assignedTo;
        return assignedToId?.toString() === emp._id.toString();
      });

      const assigningLeaders = empTasks
        .map((t) => {
          const assignedById = typeof t.assignedBy === "object" ? t.assignedBy?._id : t.assignedBy;
          return assignedById?.toString();
        })
        .filter((id) => id && teamLeaders.some((tl) => tl._id.toString() === id));

      if (assigningLeaders.length > 0) {
        const counts = {};
        let maxId = assigningLeaders[0];
        let maxCount = 0;
        assigningLeaders.forEach((id) => {
          counts[id] = (counts[id] || 0) + 1;
          if (counts[id] > maxCount) {
            maxCount = counts[id];
            maxId = id;
          }
        });
        leaderToEmployeesMap[maxId].push(emp);
      } else {
        if (teamLeaders.length > 0) {
          leaderToEmployeesMap[teamLeaders[0]._id].push(emp);
        } else {
          directEmployees.push(emp);
        }
      }
    });

    const combinedChildren = [
      ...teamLeaders.map((tl) => ({
        id: tl._id,
        type: "leader",
        node: tl,
        employees: leaderToEmployeesMap[tl._id] || []
      })),
      ...directEmployees.map((emp) => ({
        id: emp._id,
        type: "direct",
        node: emp
      }))
    ];

    return (
      <div className="py-6 w-full overflow-x-auto">
        <div className="min-w-[600px] flex flex-col items-center">
          {/* Root Node: Manager */}
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-2.5 rounded-lg transition-all duration-200">
              <img
                src={manager.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"}
                alt={manager.name}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div className="text-left min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{manager.name}</span>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded shrink-0">PM</span>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{manager.designation || "Project Manager"}</p>
              </div>
            </div>
            {/* Connector line down */}
            {combinedChildren.length > 0 && (
              <div className="w-0.5 h-6 bg-slate-300 dark:bg-gray-700" />
            )}
          </div>

          {/* Level 2 children */}
          {combinedChildren.length > 0 ? (
            <div className="flex justify-center gap-6 relative px-4">
              {combinedChildren.map((child, index) => {
                const isLeader = child.type === "leader";
                const item = child.node;
                return (
                  <div key={child.id} className="relative flex flex-col items-center pt-6">
                    {/* Left part of horizontal line */}
                    {index > 0 && (
                      <div className="absolute top-0 left-0 right-1/2 h-0.5 bg-slate-300 dark:bg-gray-700" />
                    )}
                    {/* Right part of horizontal line */}
                    {index < combinedChildren.length - 1 && (
                      <div className="absolute top-0 left-1/2 right-0 h-0.5 bg-slate-300 dark:bg-gray-700" />
                    )}
                    {/* Vertical line down to card */}
                    <div className="absolute top-0 left-1/2 -ml-px w-0.5 h-6 bg-slate-300 dark:bg-gray-700" />

                    {isLeader ? (
                      <div className="flex flex-col items-center">
                        {/* Team Leader Card */}
                        <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-2 rounded-lg w-44 transition-all duration-200">
                          <img
                            src={item.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
                            alt={item.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div className="text-left min-w-0 pr-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                              <span className="text-[8px] font-extrabold uppercase tracking-wider text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded shrink-0">TL</span>
                            </div>
                            <p className="text-[8px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.designation || "Tech Lead"}</p>
                          </div>
                        </div>

                        {/* Level 3: Employees under this Team Leader */}
                        {child.employees.length > 0 ? (
                          <div className="flex flex-col items-center mt-4">
                            {/* Line down from TL Card to first Employee */}
                            <div className="w-0.5 h-4 bg-slate-300 dark:bg-gray-700" />
                            
                            {/* Employee Stack */}
                            <div className="flex flex-col items-center gap-2">
                              {child.employees.map((emp, empIdx) => (
                                <div key={emp._id} className="flex flex-col items-center w-full">
                                  {empIdx > 0 && <div className="w-0.5 h-2 bg-slate-300 dark:bg-gray-700 mb-2" />}
                                  {/* Employee Card */}
                                  <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-1.5 rounded-lg w-40 justify-between hover:shadow-sm transition-all duration-200">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <img
                                        src={emp.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                                        alt={emp.name}
                                        className="w-6 h-6 rounded-full object-cover shrink-0"
                                      />
                                      <div className="text-left min-w-0">
                                        <span className="font-bold text-[9px] text-slate-700 dark:text-slate-300 block truncate">{emp.name}</span>
                                        <p className="text-[7px] text-slate-400 dark:text-slate-500 truncate leading-none mt-0.5">{emp.designation || "Engineer"}</p>
                                      </div>
                                    </div>
                                    <span className="text-[8px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1 rounded shrink-0">
                                      {emp.performanceScore || 85}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center mt-3">
                            <div className="w-0.5 h-3 bg-slate-300 dark:bg-gray-700" />
                            <div className="text-[8px] text-slate-400 dark:text-slate-500 italic">No members</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Direct Employee Card */
                      <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-2 rounded-lg w-44 justify-between transition-all duration-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={item.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                            alt={item.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div className="text-left min-w-0">
                            <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                            <p className="text-[8px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.designation || "Engineer"}</p>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1 rounded shrink-0">
                          {item.performanceScore || 85}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-xs text-gray-400 py-4 mt-2">No team members assigned yet.</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-2">
          <Link to="/projects" className="text-gray-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Projects
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-slate-800 dark:text-white truncate max-w-xs">{project.name}</span>
        </div>

        {/* Client & Budget tag */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="hidden md:flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <DollarSign size={14} className="text-green-500" />
            <span>Budget: ${project.budget?.toLocaleString()}</span>
          </div>
          <span className="text-gray-300 hidden md:inline">|</span>
          <div className="bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-[10px] font-black uppercase">
            Client: {project.clientName}
          </div>
        </div>
      </div>

      {/* Main Info Dashboard Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Columns: Project Overview & Delay Predictions */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white ${
                project.status === "On Track" ? "bg-green-500" : project.status === "At Risk" ? "bg-amber-500" : "bg-red-500"
              }`}>
                {project.status}
              </span>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{project.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{project.description}</p>
              
              {/* Planned dates bar */}
              <div className="flex items-center gap-4 pt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                <span>Start: {new Date(project.plannedStartDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                <span>•</span>
                <span>Deadline: {new Date(project.plannedEndDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>

            {/* Progress circle / gauge */}
            <div className="flex items-center gap-4 self-center md:self-auto border-t md:border-t-0 border-slate-100 dark:border-gray-800 pt-4 md:pt-0 w-full md:w-auto">
              <div className="text-center">
                <span className="block text-3xl font-black text-brand-600 dark:text-brand-400">{project.progress}%</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold">Complete</span>
              </div>
              <div className="w-px h-12 bg-slate-200 dark:bg-gray-800 hidden sm:block" />
              <div className="text-center hidden sm:block">
                <span className="block text-2xl font-black text-slate-800 dark:text-white">{project.remainingDays}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold">Days Left</span>
              </div>
            </div>
          </div>

          {/* AI Timeline Forecasting Card */}
          {aiPrediction && (
            <div className={`border rounded-lg p-5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              aiPrediction.isDelayedProbable
                ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-900/30"
                : aiPrediction.confidence < 70
                ? "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/45 dark:border-amber-900/30"
                : "bg-green-50/20 dark:bg-green-950/5 border-green-200/50 dark:border-green-900/20"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg mt-0.5 ${
                  aiPrediction.isDelayedProbable
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : aiPrediction.confidence < 70
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                }`}>
                  {aiPrediction.isDelayedProbable ? <AlertTriangle size={20} /> : <TrendingUp size={20} />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      AI Heuristics Delay Forecast
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                      aiPrediction.isDelayedProbable ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {aiPrediction.isDelayedProbable ? "High Risk" : "Normal Velocity"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {aiPrediction.reason}
                  </p>
                </div>
              </div>

              {/* Confidence Score Gauge */}
              <div className="flex flex-col items-end shrink-0 pl-11 md:pl-0">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Confidence</span>
                <span className={`text-lg font-black ${
                  aiPrediction.isDelayedProbable ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                }`}>
                  {aiPrediction.confidence}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Project Manager & Assigned Team members */}
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5 space-y-4">
          <div>
            <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Project Lead</h4>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-gray-800 p-2.5 rounded-lg">
              <img
                src={project.manager?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100"}
                alt={project.manager?.name}
                className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-gray-700"
              />
              <div className="min-w-0">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">{project.manager?.name}</span>
                <span className="text-[9px] text-gray-400 block truncate">{project.manager?.designation || "Project Manager"}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Team Members ({project.teamMembers?.length})</h4>
              {(user?.role === "Manager" || user?.role === "Team Leader") && (
                <button
                  onClick={handleOpenManageTeam}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
                >
                  Manage
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {project.teamMembers?.map((member) => (
                <div key={member._id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-gray-800/80 last:border-0">
                  <div className="flex items-center gap-2">
                    <img
                      src={member.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                      alt={member.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{member.name}</span>
                      <span className="text-[9px] text-gray-400 block truncate">{member.role}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded">
                    Score {member.performanceScore || 85}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="border-b border-slate-200 dark:border-gray-800 flex flex-wrap gap-2">
        {[
          { id: "kanban", label: "Kanban Board", icon: CheckSquare },
          { id: "gantt", label: "Gantt Timeline", icon: Sliders },
          { id: "calendar", label: "Calendar View", icon: CalendarIcon },
          { id: "hierarchy", label: "Team Hierarchy", icon: UsersIcon },
          { id: "chat", label: "Team Chat", icon: MessageSquare },
          { id: "docs", label: "Project Documents", icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all relative ${
                isActive
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.id === "kanban" && tasks.length > 0 && (
                <span className="ml-1 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TABS CONTAINER */}
      <div className="pt-2">
        {/* 1. KANBAN BOARD */}
        {activeTab === "kanban" && (
          <div className="space-y-4">
            {/* Create Task Action Trigger (If Admin, PM, or TL) */}
            {user.role !== "Employee" && (
              <button
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors self-start"
              >
                <Plus size={14} />
                Create New Task
              </button>
            )}

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
              {["Not Started", "In Progress", "On Hold", "Delayed", "Completed"].map((status) => {
                const columnTasks = tasks.filter((t) => t.status === status);
                return (
                  <div
                    key={status}
                    className="bg-slate-100/70 dark:bg-gray-900/50 border border-slate-200/50 dark:border-gray-800 rounded-lg p-3 flex flex-col min-w-[220px]"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                        {status}
                      </span>
                      <span className="bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Task Stack */}
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                      {columnTasks.length === 0 ? (
                        <div className="py-8 text-center text-[10px] text-gray-400 italic">No tasks here</div>
                      ) : (
                        columnTasks.map((task) => (
                          <div
                            key={task._id}
                            className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-3.5 hover:border-brand-300 dark:hover:border-brand-900/50 transition-all cursor-pointer space-y-3 group relative"
                            onClick={() => handleOpenTaskDetails(task)}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] font-black text-slate-400 group-hover:text-brand-500 transition-colors">
                                {task.taskId}
                              </span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${getPriorityStyle(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                              {task.title}
                            </h4>

                            <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-slate-100 dark:border-gray-800 pt-2.5">
                              <div className="flex items-center gap-1.5">
                                <img
                                  src={task.assignedTo?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                                  alt={task.assignedTo?.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                                <span className="truncate max-w-[80px] font-semibold text-slate-700 dark:text-slate-300">
                                  {task.assignedTo?.name || "Unassigned"}
                                </span>
                              </div>
                              <span className="font-bold">{new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                            </div>

                            {/* Quickly change status popup */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded shadow-md z-10 px-1 py-0.5"
                            >
                              <select
                                value={task.status}
                                onChange={(e) => handleUpdateStatus(task._id, e.target.value)}
                                className="text-[8px] font-black uppercase tracking-wider bg-transparent border-0 outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
                              >
                                <option value="Not Started">Not Started</option>
                                <option value="In Progress">In Progress</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Delayed">Delayed</option>
                                {user.role !== "Employee" && <option value="Completed">Completed</option>}
                              </select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. GANTT TIMELINE */}
        {activeTab === "gantt" && (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">
              Project Task Timeline Planner
            </h3>
            {ganttTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No tasks available. Create tasks to view timeline ranges.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Gantt List */}
                <div className="divide-y divide-slate-100 dark:divide-gray-800">
                  {ganttTasks.map((gt) => {
                    const originalTask = tasks.find((t) => t.taskId === gt.taskId);
                    const startStr = new Date(gt.start).toLocaleDateString([], { month: "short", day: "numeric" });
                    const endStr = new Date(gt.end).toLocaleDateString([], { month: "short", day: "numeric" });
                    
                    return (
                      <div
                        key={gt.taskId}
                        onClick={() => originalTask && handleOpenTaskDetails(originalTask)}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-800/30 px-2 rounded-lg transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 block mb-0.5">{gt.taskId}</span>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 hover:underline">{gt.title}</span>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                            <span>Assignee: {gt.assignedTo}</span>
                            <span>•</span>
                            <span className="font-bold">Timeline: {startStr} - {endStr}</span>
                          </div>
                        </div>

                        {/* Visual Range bar representing the status */}
                         <div className="w-full sm:w-48 shrink-0 bg-slate-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden border border-slate-100 dark:border-gray-800">
                          <div
                            className={`h-full rounded-full ${
                              gt.status === "Completed"
                                ? "bg-green-500"
                                : gt.status === "Delayed"
                                ? "bg-red-500"
                                : gt.status === "In Progress"
                                ? "bg-indigo-500"
                                : gt.status === "On Hold"
                                ? "bg-amber-500"
                                : "bg-slate-300"
                            }`}
                            style={{ width: gt.status === "Completed" ? "100%" : "60%" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. CALENDAR VIEW */}
        {activeTab === "calendar" && (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5">
            {/* Header controls */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1.5 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-300"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1.5 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-300"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase mb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>
        )}

        {/* 4. TEAM HIERARCHY */}
        {activeTab === "hierarchy" && (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">
              Project Team Hierarchy
            </h3>
            {renderTeamHierarchy()}
          </div>
        )}

        {/* 5. TEAM CHAT ROOM */}
        {activeTab === "chat" && (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col h-[55vh]">
            {/* Header info */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-gray-950/20 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Project Channel</h3>
                <span className="text-[9px] text-green-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live Chat Socket Active
                </span>
              </div>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                  No messages in channel yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender?._id === user._id;
                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                    >
                      <img
                        src={msg.sender?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                        alt={msg.sender?.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                            {msg.sender?.name}
                          </span>
                          <span className="text-[8px] text-gray-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                          isMe
                            ? "bg-brand-600 text-white rounded-tr-none"
                             : "bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-slate-200 rounded-tl-none border border-slate-200/50 dark:border-gray-800"
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Send Form */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 dark:border-gray-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message team channel..."
                className="flex-1 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {/* 5. DOCUMENTS VIEW */}
        {activeTab === "docs" && (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5 space-y-6">
             <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Shared Documents
              </h3>

              {/* Upload document trigger */}
              <form onSubmit={handleUploadProjectDoc} className="flex items-center gap-2">
                <input
                  type="file"
                  id="project-file-input"
                  onChange={(e) => setDocFile(e.target.files[0])}
                  className="text-xs max-w-[150px] sm:max-w-xs"
                />
                <button
                  type="submit"
                  disabled={!docFile}
                  className="bg-brand-600 hover:bg-brand-500 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Upload size={12} />
                  Upload
                </button>
              </form>
            </div>

            {docError && (
              <div className="p-2.5 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900/30">
                {docError}
              </div>
            )}

            {/* Documents List */}
            {projectDocs.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 italic">
                No documents uploaded. Add contract papers, specification sheets, or design maps.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projectDocs.map((doc, idx) => (
                  <a
                    key={doc._id || idx}
                    href={`http://localhost:5000${doc.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/55 dark:border-gray-800 rounded-lg transition-all"
                  >
                    <div className="p-2.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">{doc.name}</span>
                      <span className="text-[9px] text-gray-400 block uppercase">
                        {new Date(doc.uploadedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: CREATE TASK */}
      <CustomModal isOpen={isCreateTaskModalOpen} onClose={() => setIsCreateTaskModalOpen(false)} title="Create New Task" size="lg">
        {createTaskError && (
          <div className="p-3 mb-4 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
            {createTaskError}
          </div>
        )}

        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              required
              rows={3}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Assignee
              </label>
              <select
                required
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                <option value="">Select Assignee...</option>
                {project.teamMembers?.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Estimate Hours
              </label>
              <input
                type="number"
                value={taskEstHours}
                onChange={(e) => setTaskEstHours(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                required
                value={taskStartDate}
                onChange={(e) => setTaskStartDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                required
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Checklist (To-Do List)
            </label>
            <div className="space-y-2">
              {taskChecklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-gray-800 p-2.5 rounded-lg border border-slate-200 dark:border-gray-700 text-xs">
                  <span>{item.text}</span>
                  <button
                    type="button"
                    onClick={() => setTaskChecklist(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add new checklist item..."
                  value={newTaskChecklistItem}
                  onChange={(e) => setNewTaskChecklistItem(e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTaskChecklistItem.trim()) {
                      setTaskChecklist(prev => [...prev, { text: newTaskChecklistItem.trim(), isCompleted: false }]);
                      setNewTaskChecklistItem("");
                    }
                  }}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(false)}
              className="bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Create Task
            </button>
          </div>
        </form>
      </CustomModal>

      {/* MODAL: TASK DETAIL ENGINE */}
      {selectedTask && (
        <CustomModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={`${selectedTask.taskId} Details`} size="xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[75vh] overflow-y-auto pr-1 text-slate-900 dark:text-slate-200">
            
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
                    <h4 className="font-extrabold text-slate-800 dark:text-white uppercase tracking-wider text-[10px]">
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
                    ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 text-slate-800 dark:text-slate-300"
                    : "bg-slate-50 dark:bg-gray-800 border-slate-200 text-slate-500 dark:text-slate-400"
                }`}>
                  <Sliders size={18} className="text-brand-500" />
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
                      <div key={c._id || idx} className="flex gap-2.5 items-start text-xs bg-slate-50/30 dark:bg-gray-950/20 border border-slate-200/40 dark:border-gray-800/80 p-2.5 rounded-lg">
                        <img
                          src={c.author?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                          alt={c.author?.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-300 text-[11px]">{c.author?.name}</span>
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
                        {project?.teamMembers?.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Due Date</span>
                      <span className="font-bold flex items-center gap-1">
                        <CalendarIcon size={12} className="text-red-500" />
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
                    id="task-file-input"
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
                    <div key={h._id || index} className="text-[10px] border-l-2 border-slate-200 dark:border-gray-800 pl-2.5 py-0.5 space-y-0.5">
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

      {/* MODAL: MANAGE TEAM */}
      <CustomModal isOpen={isManageTeamOpen} onClose={() => setIsManageTeamOpen(false)} title="Manage Project Team" size="md">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <p className="text-xs text-slate-500 dark:text-gray-400">
            {user?.role === "Manager" 
              ? "Select the Team Leaders who should be assigned to manage this project." 
              : "Select the Employees (Team Members) who should be assigned to execute this project."}
          </p>

          <div className="space-y-4">
            {/* Team Leaders Section (Manager only) */}
            {user?.role === "Manager" && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                  Team Leaders
                </h3>
                {allUsersList.filter(u => u.role === "Team Leader").length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No team leaders found.</p>
                ) : (
                  allUsersList.filter(u => u.role === "Team Leader").map((u) => {
                    const isSelected = selectedTeamMembers.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => handleToggleTeamMember(u._id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-brand-50/50 dark:bg-brand-950/20 border-brand-200/30 dark:border-brand-800"
                            : "bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {u.role} • {u.department || "No Department"}
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                        />
                      </div>
                    );
                  })
                )}
                <div className="pt-2 border-t border-slate-100 dark:border-gray-800/60">
                  <span className="text-[10px] text-slate-400 block italic">
                    * Team Members (employees) can be assigned to the project by the assigned Team Leader.
                  </span>
                </div>
              </div>
            )}

            {/* Team Members Section (Team Leader only) */}
            {user?.role === "Team Leader" && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                  Team Members
                </h3>
                {allUsersList.filter(u => u.role === "Employee").length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No employees found.</p>
                ) : (
                  allUsersList.filter(u => u.role === "Employee").map((u) => {
                    const isSelected = selectedTeamMembers.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => handleToggleTeamMember(u._id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-brand-50/50 dark:bg-brand-950/20 border-brand-200/30 dark:border-brand-800"
                            : "bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {u.role} • {u.department || "No Department"}
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-gray-800 pt-4 mt-4">
          <button
            onClick={() => setIsManageTeamOpen(false)}
            className="px-4 py-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-400 rounded-lg text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTeamMembers}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-all"
          >
            Save Team
          </button>
        </div>
      </CustomModal>
    </div>
  );
};

export default ProjectDetail;
