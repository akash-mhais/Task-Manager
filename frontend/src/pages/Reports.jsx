import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  FileDown,
  FileSpreadsheet,
  Award,
  AlertTriangle,
  History,
  Activity,
  FolderOpen
} from "lucide-react";

const Reports = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState("employee-performance"); // employee-performance, project-status, delay-report, audit-activities
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/analytics/reports?type=${reportType}`);
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching report data", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch the CSV as a blob and download it
      const res = await API.get(`/analytics/reports/export?type=${reportType}`, {
        responseType: "blob"
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `faithautomation_${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting report to CSV", err);
    }
    setExporting(false);
  };

  // RBAC guard
  if (user.role !== "Admin" && user.role !== "Manager") {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl shadow-sm">
        <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
        <h2 className="text-base font-bold text-slate-800 dark:text-white font-black uppercase">Access Denied</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Reports page is restricted to system administrators and project managers.
        </p>
      </div>
    );
  }

  // Define chart contents dynamically
  const renderChart = () => {
    if (reportData.length === 0) return null;

    if (reportType === "employee-performance") {
      // Sort and map top scores
      const sorted = [...reportData]
        .sort((a, b) => b.productivityScore - a.productivityScore)
        .slice(0, 8);
      return (
        <div className="h-64 mt-4 bg-slate-50/50 dark:bg-gray-950/20 border border-slate-100 dark:border-gray-800 p-4 rounded-xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted}>
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
              <Bar dataKey="productivityScore" fill="#6366f1" radius={[4, 4, 0, 0]} name="Productivity Score (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (reportType === "project-status") {
      // Count statuses
      const onTrack = reportData.filter((p) => p.status === "On Track").length;
      const atRisk = reportData.filter((p) => p.status === "At Risk").length;
      const delayed = reportData.filter((p) => p.status === "Delayed").length;

      const pieData = [
        { name: "On Track", value: onTrack, color: "#10b981" },
        { name: "At Risk", value: atRisk, color: "#f59e0b" },
        { name: "Delayed", value: delayed, color: "#ef4444" }
      ].filter((d) => d.value > 0);

      return (
        <div className="h-64 mt-4 bg-slate-50/50 dark:bg-gray-950/20 border border-slate-100 dark:border-gray-800 p-4 rounded-xl flex items-center justify-center">
          <div className="w-full max-w-sm h-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (reportType === "delay-report") {
      // Chart showing top delayed tasks
      const sorted = [...reportData]
        .sort((a, b) => b.daysDelayed - a.daysDelayed)
        .slice(0, 8);
      return (
        <div className="h-64 mt-4 bg-slate-50/50 dark:bg-gray-950/20 border border-slate-100 dark:border-gray-800 p-4 rounded-xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted}>
              <XAxis dataKey="taskId" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17, 24, 39, 0.9)",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#fff"
                }}
              />
              <Bar dataKey="daysDelayed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Days Overdue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Portal Reports & Analytics</h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Export csv sheets and view workspace charts for performance audits
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={reportData.length === 0 || exporting}
          className="bg-brand-600 hover:bg-brand-500 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors self-start shadow-md shadow-brand-500/10"
        >
          {exporting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <FileSpreadsheet size={16} />
          )}
          Export CSV Report
        </button>
      </div>

      {/* Report Switcher Menu */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: "employee-performance", label: "Employee Efficiency", icon: Award },
          { id: "project-status", label: "Project Healths", icon: FolderOpen },
          { id: "delay-report", label: "Timeline Risks", icon: AlertTriangle },
          { id: "audit-activities", label: "Audit Log Trail", icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`flex items-center gap-3 p-4 border rounded-xl text-left transition-all ${
                isActive
                  ? "bg-brand-50/50 dark:bg-brand-900/10 border-brand-500 text-brand-600 dark:text-brand-400"
                  : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-500 hover:border-slate-300 dark:hover:border-gray-700"
              }`}
            >
              <div className={`p-2 rounded-lg ${
                isActive ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-gray-800 text-slate-400"
              }`}>
                <Icon size={16} />
              </div>
              <div>
                <span className="text-xs font-bold block leading-none">{tab.label}</span>
                <span className="text-[9px] text-gray-400 mt-1 block uppercase">Report Data</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Graph Chart */}
      {renderChart()}

      {/* Report Data Table Grid */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Activity size={14} className="text-brand-500" />
            Detail Records ({reportData.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto mb-4" />
            Compiling report statistics...
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-gray-400 text-xs italic">
            No records found for this report type.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              
              {/* Dynamic Headers */}
              {reportType === "employee-performance" && (
                <>
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-800 text-slate-400 uppercase font-black tracking-widest border-b border-slate-200 dark:border-gray-800">
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Dept / Designation</th>
                      <th className="py-3 px-4 text-center">Productivity</th>
                      <th className="py-3 px-4 text-center">Done Tasks</th>
                      <th className="py-3 px-4 text-center">Active Tasks</th>
                      <th className="py-3 px-4 text-center">Delayed Tasks</th>
                      <th className="py-3 px-4 text-center">Hours Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                    {reportData.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/20">
                        <td className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400">{r.employeeId}</td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{r.name}</td>
                        <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">{r.department} / {r.designation}</td>
                        <td className="py-3 px-4 text-center font-bold text-green-600 dark:text-green-400">{r.productivityScore}%</td>
                        <td className="py-3 px-4 text-center font-semibold">{r.completedTasks}</td>
                        <td className="py-3 px-4 text-center font-semibold">{r.activeTasks}</td>
                        <td className="py-3 px-4 text-center font-semibold text-red-500">{r.delayedTasks}</td>
                        <td className="py-3 px-4 text-center font-bold text-brand-600">{r.totalHoursLogged} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {reportType === "project-status" && (
                <>
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-800 text-slate-400 uppercase font-black tracking-widest border-b border-slate-200 dark:border-gray-800">
                      <th className="py-3 px-4">Project Name</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">PM</th>
                      <th className="py-3 px-4 text-center">Budget</th>
                      <th className="py-3 px-4 text-center">Progress</th>
                      <th className="py-3 px-4 text-center">Total Tasks</th>
                      <th className="py-3 px-4 text-center">Delayed Tasks</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                    {reportData.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/20">
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{r.projectName}</td>
                        <td className="py-3 px-4 font-semibold text-slate-500">{r.clientName}</td>
                        <td className="py-3 px-4 font-semibold text-slate-500">{r.manager}</td>
                        <td className="py-3 px-4 text-center font-bold">${r.budget?.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-brand-600">{r.progressPercent}%</span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">{r.totalTasks}</td>
                        <td className="py-3 px-4 text-center font-semibold text-red-500">{r.delayedTasks}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black text-white ${
                            r.status === "On Track" ? "bg-green-500" : r.status === "At Risk" ? "bg-amber-500" : "bg-red-500"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {reportType === "delay-report" && (
                <>
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-800 text-slate-400 uppercase font-black tracking-widest border-b border-slate-200 dark:border-gray-800">
                      <th className="py-3 px-4">Task ID</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Dept</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-center">Days Overdue</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                    {reportData.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/20">
                        <td className="py-3 px-4 font-black text-brand-600 dark:text-brand-400">{r.taskId}</td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{r.taskTitle}</td>
                        <td className="py-3 px-4 font-semibold text-slate-500">{r.project}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{r.assignee}</td>
                        <td className="py-3 px-4 text-slate-500">{r.department}</td>
                        <td className="py-3 px-4 font-bold">
                          {new Date(r.dueDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-red-600 dark:text-red-400">{r.daysDelayed} days</td>
                        <td className="py-3 px-4 font-bold text-red-500 uppercase tracking-wide">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {reportType === "audit-activities" && (
                <>
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-800 text-slate-400 uppercase font-black tracking-widest border-b border-slate-200 dark:border-gray-800">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                    {reportData.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/20">
                        <td className="py-3 px-4 font-semibold text-gray-400">
                          {new Date(r.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{r.user}</td>
                        <td className="py-3 px-4 font-semibold text-slate-500">{r.role}</td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold uppercase bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                            {r.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm truncate" title={r.details}>
                          {r.details}
                        </td>
                        <td className="py-3 px-4 text-gray-400 font-semibold">{r.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
