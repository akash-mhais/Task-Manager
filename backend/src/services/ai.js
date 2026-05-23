/**
 * Smart AI Heuristics Service for WorkFlow Pro
 * Simulates intelligent workflows including delay prediction, task prioritization suggestions,
 * employee workload balancing, and productivity insights.
 */

/**
 * Predicts whether a project will be delayed based on tasks and timeline.
 * Returns { isDelayedProbable: boolean, confidence: number, reason: string }
 */
const predictProjectDelay = (project, tasks) => {
  if (!tasks || tasks.length === 0) {
    return { isDelayedProbable: false, confidence: 100, reason: "No tasks assigned yet." };
  }

  const activeTasks = tasks.filter(t => t.status !== "Completed");
  const completedTasks = tasks.filter(t => t.status === "Completed");

  if (activeTasks.length === 0) {
    return { isDelayedProbable: false, confidence: 100, reason: "All tasks completed." };
  }

  const today = new Date();
  const endDate = new Date(project.plannedEndDate);
  const remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));

  // Calculate statistics
  const overdueTasksCount = activeTasks.filter(t => new Date(t.dueDate) < today).length;
  
  if (overdueTasksCount > 0 && remainingDays === 0) {
    return {
      isDelayedProbable: true,
      confidence: 95,
      reason: `Project end date is today/passed, and there are ${overdueTasksCount} overdue tasks.`
    };
  }

  // Calculate velocity: tasks completed per day since project started (or default)
  const startDate = new Date(project.plannedStartDate);
  const daysElapsed = Math.max(1, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)));
  const completionRate = completedTasks.length / daysElapsed; // completed tasks/day

  let predictedDaysNeeded = 0;
  if (completionRate > 0) {
    predictedDaysNeeded = activeTasks.length / completionRate;
  } else {
    // If no tasks completed yet, estimate 3 days per active task
    predictedDaysNeeded = activeTasks.length * 3;
  }

  const buffer = remainingDays - predictedDaysNeeded;

  if (overdueTasksCount > activeTasks.length * 0.4) {
    return {
      isDelayedProbable: true,
      confidence: 85,
      reason: `${Math.round((overdueTasksCount / activeTasks.length) * 100)}% of active tasks are already overdue.`
    };
  }

  if (buffer < -2) {
    const confidence = Math.min(90, Math.round(50 + Math.abs(buffer) * 10));
    return {
      isDelayedProbable: true,
      confidence,
      reason: `Project completion velocity suggests needing ${Math.round(predictedDaysNeeded)} days, but only ${remainingDays} days remain (Shortfall of ${Math.round(Math.abs(buffer))} days).`
    };
  } else if (buffer < 2) {
    return {
      isDelayedProbable: false,
      confidence: 60,
      reason: `Tight schedule. Estimated days needed is ${Math.round(predictedDaysNeeded)} days; ${remainingDays} days remain.`
    };
  }

  return {
    isDelayedProbable: false,
    confidence: 80,
    reason: "On track. Velocity suggests task completion fits well within the remaining timeline."
  };
};

/**
 * Suggests task priority modifications based on due dates and status.
 * Returns { priorityChangeSuggested: boolean, suggestedPriority: string, reason: string }
 */
const suggestTaskPriority = (task) => {
  if (task.status === "Completed") {
    return { priorityChangeSuggested: false, suggestedPriority: task.priority, reason: "Task is completed." };
  }

  const today = new Date();
  const dueDate = new Date(task.dueDate);
  const remainingDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  if (remainingDays < 0) {
    return {
      priorityChangeSuggested: task.priority !== "Critical",
      suggestedPriority: "Critical",
      reason: "Task is overdue."
    };
  }

  if (remainingDays <= 2 && task.status === "Not Started") {
    if (task.priority !== "Critical" && task.priority !== "High") {
      return {
        priorityChangeSuggested: true,
        suggestedPriority: "Critical",
        reason: "Task is due in less than 48 hours and has not been started yet."
      };
    }
  }

  if (remainingDays <= 4 && task.status === "In Progress" && task.priority === "Low") {
    return {
      priorityChangeSuggested: true,
      suggestedPriority: "Medium",
      reason: "Task is due soon; priority raised to avoid bottleneck."
    };
  }

  return {
    priorityChangeSuggested: false,
    suggestedPriority: task.priority,
    reason: "Current priority is appropriate."
  };
};

/**
 * Analyzes workload for team members and recommends balancing.
 * Returns list of members who are overloaded.
 */
const balanceWorkload = (teamMembers, activeTasks) => {
  const workloadStats = teamMembers.map(member => {
    const memberTasks = activeTasks.filter(t => t.assignedTo && t.assignedTo.toString() === member._id.toString());
    const criticalCount = memberTasks.filter(t => t.priority === "Critical" || t.priority === "High").length;
    const totalEstHours = memberTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    let overloadStatus = "Normal";
    let score = memberTasks.length * 2 + criticalCount * 3 + (totalEstHours / 8) * 1.5;
    let reasons = [];

    if (memberTasks.length > 5) {
      overloadStatus = "Overloaded";
      reasons.push("Assigned to more than 5 active tasks");
    }
    if (criticalCount >= 3) {
      overloadStatus = "Overloaded";
      reasons.push("Assigned to 3 or more High/Critical priority tasks");
    }
    if (totalEstHours > 40) {
      overloadStatus = "Overloaded";
      reasons.push(`Total backlog hours estimated at ${totalEstHours} hours (> 1 week)`);
    }

    return {
      userId: member._id,
      name: member.name,
      role: member.role,
      activeTasksCount: memberTasks.length,
      criticalTasksCount: criticalCount,
      totalHours: totalEstHours,
      status: overloadStatus,
      reasons,
      score: Math.round(score)
    };
  });

  return workloadStats;
};

/**
 * Analyzes employee performance based on tasks.
 * Returns { score: number, productivityInsights: string[] }
 */
const getProductivityInsights = (user, tasks) => {
  const completedTasks = tasks.filter(t => t.status === "Completed" && t.assignedTo && t.assignedTo.toString() === user._id.toString());
  const delayedTasks = tasks.filter(t => t.status === "Delayed" && t.assignedTo && t.assignedTo.toString() === user._id.toString());
  
  if (completedTasks.length === 0) {
    return {
      score: 75, // base performance rating
      insights: ["No completed tasks recorded. Log hours and complete items to build productivity rating."]
    };
  }

  // Calculate delay percentage
  const totalTasks = completedTasks.length + delayedTasks.length;
  const delayRate = delayedTasks.length / (totalTasks || 1);

  // Time analysis (logged hours vs estimated hours)
  let onTimeRatio = 0;
  let totalEstimates = 0;
  let totalLogged = 0;

  completedTasks.forEach(t => {
    totalEstimates += t.estimatedHours || 0;
    // calculate actual total logged hours
    const taskLogged = t.workLogs
      ? t.workLogs.reduce((sum, w) => sum + (w.hoursLogged || 0), 0)
      : 0;
    totalLogged += taskLogged;

    if (t.completionDate && t.dueDate) {
      if (new Date(t.completionDate) <= new Date(t.dueDate)) {
        onTimeRatio++;
      }
    } else {
      onTimeRatio++;
    }
  });

  const onTimeRate = onTimeRatio / completedTasks.length;

  // Compute performance score out of 100
  let score = 75; // base
  score += (onTimeRate * 15); // + up to 15 points for on-time completion
  
  if (totalEstimates > 0) {
    const hoursRatio = totalLogged / totalEstimates;
    if (hoursRatio <= 1.05) {
      score += 10; // +10 points if work finished at or below estimated hours
    } else if (hoursRatio > 1.3) {
      score -= 10; // -10 points if consistently exceeding estimates by 30%+
    }
  } else {
    score += 5; // default buffer
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Generate actionable tips
  const insights = [];
  insights.push(`Completed ${completedTasks.length} tasks successfully.`);
  
  if (onTimeRate >= 0.9) {
    insights.push("Excellent reliability: 90%+ tasks completed on or before the due date.");
  } else if (onTimeRate < 0.7) {
    insights.push("Needs attention: Task completion deadlines are frequently missed. Consider requesting delegation support.");
  }

  if (totalEstimates > 0 && totalLogged > totalEstimates * 1.2) {
    insights.push("Estimation alert: Actual logged time is 20%+ higher than initially estimated. Try adding details to scope initial tasks.");
  } else if (totalEstimates > 0 && totalLogged < totalEstimates * 0.9) {
    insights.push("Speed demon: Consistently finishes tasks faster than expected time templates.");
  }

  if (delayedTasks.length > 0) {
    insights.push(`Currently has ${delayedTasks.length} tasks marked as Delayed. Priority action recommended.`);
  }

  return { score, insights };
};

module.exports = {
  predictProjectDelay,
  suggestTaskPriority,
  balanceWorkload,
  getProductivityInsights
};
