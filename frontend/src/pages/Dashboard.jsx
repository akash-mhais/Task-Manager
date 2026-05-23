import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import {
  Briefcase,
  CheckSquare,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  Calendar,
  ChevronRight,
  ShieldAlert,
  UserCheck
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [performers, setPerformers] = useState([]);
  const [overloads, setOverloads] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Team Hierarchy Widget State
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectDetail, setSelectedProjectDetail] = useState(null);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await API.get("/analytics/dashboard");
        if (res.data.success) {
          const { stats: s, upcomingDeadlines, topPerformers, workloadBalancing, projectAnalytics } = res.data;
          setStats(s);
          setUpcoming(upcomingDeadlines);
          setPerformers(topPerformers || []);
          setOverloads(workloadBalancing || []);
          setChartData(projectAnalytics || []);
        }
      } catch (err) {
        console.error("Error loading dashboard metrics", err);
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (user && user.role === "Manager") {
      const fetchProjects = async () => {
        try {
          const res = await API.get("/projects");
          if (res.data.success && res.data.projects.length > 0) {
            setProjects(res.data.projects);
            setSelectedProjectId(res.data.projects[0]._id);
          }
        } catch (err) {
          console.error("Error fetching projects for dashboard hierarchy", err);
        }
      };
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProjectId) {
      const fetchProjectDetail = async () => {
        setLoadingHierarchy(true);
        try {
          const res = await API.get(`/projects/${selectedProjectId}`);
          if (res.data.success) {
            setSelectedProjectDetail(res.data);
          }
        } catch (err) {
          console.error("Error fetching project detail for dashboard hierarchy", err);
        }
        setLoadingHierarchy(false);
      };
      fetchProjectDetail();
    }
  }, [selectedProjectId]);

  const renderDashboardHierarchy = () => {
    if (loadingHierarchy) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-[10px] text-slate-500 mt-2">Loading hierarchy view...</p>
        </div>
      );
    }

    if (!selectedProjectDetail || !selectedProjectDetail.project) {
      return (
        <div className="text-center text-xs text-gray-400 py-8 bg-slate-50 dark:bg-gray-900 rounded-xl border border-dashed border-slate-200 dark:border-gray-800">
          No project data available.
        </div>
      );
    }

    const { project, tasks = [] } = selectedProjectDetail;
    const manager = project.manager;
    if (!manager) {
      return (
        <div className="text-center text-xs text-gray-400 py-8 bg-slate-50 dark:bg-gray-900 rounded-xl border border-dashed border-slate-200 dark:border-gray-800">
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
            <div className="inline-flex items-center gap-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-2.5 rounded-lg">
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
                        <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-2 rounded-lg w-44">
                          <img
                            src={item.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
                            alt={item.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div className="text-left min-w-0 pr-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                              <span className="text-[8px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded shrink-0">TL</span>
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
                                  <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-1.5 rounded-lg w-40 justify-between">
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
                      <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-2 rounded-lg w-44 justify-between">
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

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-xs text-slate-500">Calculating portal metrics...</p>
        </div>
      </div>
    );
  }

  // 1. Color mappings for pie chart statuses
  const taskDistribution = [
    { name: "Completed", value: stats?.completedTasks || 0, color: "#10b981" },
    { name: "Active", value: stats?.activeTasks || 0, color: "#dc2626" },
    { name: "Delayed", value: stats?.delayedTasks || 0, color: "#ef4444" }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="bg-brand-600/10 text-brand-400 border border-brand-600/20 text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider">
            Workspace Hub
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Here is a snapshot of your projects, team members, and productivity metrics for today. Real-time connections are active.
          </p>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total Projects" value={stats?.totalProjects} icon={Briefcase} change="+2 new" isPending />
        <StatCard title="Active Tasks" value={stats?.activeTasks} icon={CheckSquare} change="Assigned" isCompleted />
        <StatCard title="Delayed Tasks" value={stats?.delayedTasks} icon={AlertTriangle} isDelayed />
        {user.role === "Admin" || user.role === "Manager" ? (
          <StatCard title="Employees" value={stats?.totalEmployees} icon={Users} change="Active" isCompleted />
        ) : (
          <StatCard title="My Performance" value={`${user?.performanceScore || 85}%`} icon={TrendingUp} isCompleted />
        )}
      </div>

      {/* Main Grid: Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Charts & Graph Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recharts Area Chart for Project Velocities */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">
              Project Completion Progress (%)
            </h3>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                Create projects and add tasks to view progress analytics.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(17, 24, 39, 0.9)",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#fff"
                      }}
                    />
                    <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.status === "Delayed" ? "#ef4444" : entry.status === "At Risk" ? "#f59e0b" : "#dc2626"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Upcoming Deadlines Pane */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">
              Upcoming Deadlines (Next 7 Days)
            </h3>
            {upcoming.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                No task deadlines approaching. Great job!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-gray-800/80">
                {upcoming.map((task) => (
                  <div key={task._id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate hover:underline cursor-pointer">
                        {task.title}
                      </span>
                      <span className="text-[10px] text-gray-400 block truncate">
                        Project: {task.project?.name || "Unknown"} • Assignee: {task.assignedTo?.name || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Team Hierarchy widget */}
          {user && user.role === "Manager" && (
            <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Project Team Hierarchy
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Visual tree showing project manager, team leaders, and reporting employees.
                  </p>
                </div>
                {projects.length > 0 && (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {projects.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-8 bg-slate-50 dark:bg-gray-900 rounded-xl border border-dashed border-slate-200 dark:border-gray-800">
                  No active projects found.
                </div>
              ) : (
                renderDashboardHierarchy()
              )}
            </div>
          )}
        </div>

        {/* Right Column: Mini Panels & Leaderboards */}
        <div className="space-y-6">
          {/* Recharts Pie Chart for Task Status Distributions */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">
              Task Workload State
            </h3>
            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskDistribution}
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {taskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Total counter center */}
              <div className="absolute text-center">
                <span className="block text-xl font-black text-slate-800 dark:text-white leading-none">
                  {(stats?.completedTasks || 0) + (stats?.activeTasks || 0)}
                </span>
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Total Tasks</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex justify-around items-center gap-2 pt-2 border-t border-slate-100 dark:border-gray-800/80 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              {taskDistribution.map((t) => (
                <div key={t.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                  <span>
                    {t.name} ({t.value})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Workload Balancer Alerts (Admin/Manager only) */}
          {(user.role === "Admin" || user.role === "Manager") && overloads.length > 0 && (
            <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <ShieldAlert size={18} />
                <h4 className="text-xs font-bold uppercase tracking-wider">Smart Workload Warning</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                AI Heuristics detected employees with overloaded backlogs. Consider re-allocating active tasks:
              </p>
              <div className="space-y-2">
                {overloads.slice(0, 3).map((ov) => (
                  <div key={ov.userId} className="flex justify-between items-center text-xs bg-white dark:bg-gray-900 p-2 rounded-lg border border-slate-200 dark:border-gray-800">
                    <div>
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">{ov.name}</span>
                      <span className="text-[9px] text-gray-400 block">{ov.reasons[0]}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                      Score {ov.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Performance Leaderboard (Admin/Manager only) */}
          {(user.role === "Admin" || user.role === "Manager") && performers.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">
                Productive Employees
              </h3>
              <div className="space-y-4">
                {performers.map((emp) => (
                  <div key={emp.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <img src={emp.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} alt={emp.name} className="w-8 h-8 rounded-full object-cover" />
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">{emp.name}</span>
                        <span className="text-[10px] text-gray-400 block truncate">{emp.designation}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1.5">
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">{emp.performanceScore}%</span>
                      <UserCheck size={12} className="text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
