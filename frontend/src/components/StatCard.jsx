import React from "react";

const StatCard = ({ title, value, icon: Icon, change, isDelayed, isCompleted, isPending }) => {
  let accentColor = "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20";
  if (isDelayed) accentColor = "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
  if (isCompleted) accentColor = "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
  if (isPending) accentColor = "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20";

  return (
    <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
            {title}
          </span>
          <span className="text-2xl font-bold text-slate-800 dark:text-white leading-none">
            {value}
          </span>
        </div>
        <div className={`p-3 rounded-lg ${accentColor}`}>
          <Icon size={20} />
        </div>
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs font-medium ${change.startsWith("+") ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
            {change}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">vs last month</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
