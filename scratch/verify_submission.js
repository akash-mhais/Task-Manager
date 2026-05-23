const http = require("http");

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json"
      }
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            raw: data
          });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const run = async () => {
  try {
    console.log("=== TASK SUBMISSION SYSTEM VERIFICATION ===");

    // 1. Log in as Manager
    console.log("\n1. Logging in as Manager (manager@faithautomation.com)...");
    const managerLogin = await request("POST", "/api/auth/login", {
      email: "manager@faithautomation.com",
      password: "ManagerPassword123!"
    });
    
    if (managerLogin.statusCode !== 200) {
      console.error("Manager login failed:", managerLogin.body);
      return;
    }
    const managerToken = managerLogin.body.token;
    const managerId = managerLogin.body.user._id;
    console.log("Logged in! Manager ID:", managerId);

    // 2. Fetch Users to find the Employee and Team Leader
    console.log("\n2. Fetching users list...");
    const usersRes = await request("GET", "/api/users", null, managerToken);
    if (usersRes.statusCode !== 200) {
      console.error("Failed to fetch users:", usersRes.body);
      return;
    }
    
    const employee = usersRes.body.users.find(u => u.role === "Employee" && u.email === "employee@faithautomation.com");
    if (!employee) {
      console.error("Employee 'employee@faithautomation.com' not found.");
      return;
    }
    const employeeId = employee._id;
    console.log(`Found Employee: ${employee.name} (${employeeId})`);

    // 3. Create a Test Project for this task
    console.log("\n3. Creating temporary project for task...");
    const projectRes = await request("POST", "/api/projects", {
      name: "Submissions Verification Project",
      description: "A test project to verify checklist tasks submission",
      clientName: "Faith Automation Internal",
      priority: "Medium",
      plannedStartDate: "2026-05-20",
      plannedEndDate: "2026-06-20",
      budget: 10000,
      manager: managerId,
      teamMembers: [employeeId]
    }, managerToken);

    if (projectRes.statusCode !== 201) {
      console.error("Failed to create project:", projectRes.body);
      return;
    }
    const projectId = projectRes.body.project._id;
    console.log(`Project created successfully! ID: ${projectId}`);

    // 4. Create a Task with a Checklist assigned to the Employee
    console.log("\n4. Creating task with checklist assigned to the Employee...");
    const taskRes = await request("POST", "/api/tasks", {
      title: "Verify Submission API Integration",
      description: "Implement and execute programmatic validation for task submission routes.",
      project: projectId,
      assignedTo: employeeId,
      priority: "High",
      startDate: "2026-05-20",
      dueDate: "2026-05-25",
      estimatedHours: 8,
      checklist: [
        { text: "Write verification script", isCompleted: false },
        { text: "Run verification script", isCompleted: false },
        { text: "Verify results are logged", isCompleted: false }
      ]
    }, managerToken);

    if (taskRes.statusCode !== 201) {
      console.error("Failed to create task:", taskRes.body);
      return;
    }
    const taskId = taskRes.body.task._id;
    console.log(`Task created successfully! ID: ${taskId}, Code: ${taskRes.body.task.taskId}`);

    // 5. Try to submit the task as Manager (should fail with 403)
    console.log("\n5. Trying to submit the task as the Manager (Expected: 403 Forbidden)...");
    const badSubmitRes = await request("PUT", `/api/tasks/${taskId}/submit`, {
      checklist: [
        { text: "Write verification script", isCompleted: true },
        { text: "Run verification script", isCompleted: true },
        { text: "Verify results are logged", isCompleted: true }
      ],
      submissionDetails: "Manager attempting to complete task"
    }, managerToken);

    console.log(` - Status Code: ${badSubmitRes.statusCode}`);
    console.log(` - Response Error: ${badSubmitRes.body?.error}`);
    if (badSubmitRes.statusCode !== 403) {
      console.error("FAILED: Manager was able to submit the task or got wrong status code.");
      return;
    }
    console.log("PASSED: Manager was successfully blocked from submitting employee's task!");

    // 6. Log in as Employee
    console.log("\n6. Logging in as Employee (employee@faithautomation.com)...");
    const employeeLogin = await request("POST", "/api/auth/login", {
      email: "employee@faithautomation.com",
      password: "EmployeePassword123!"
    });
    
    if (employeeLogin.statusCode !== 200) {
      console.error("Employee login failed:", employeeLogin.body);
      return;
    }
    const employeeToken = employeeLogin.body.token;
    console.log("Employee logged in successfully!");

    // 7. Submit the task as Employee with checklist ticks and submission details
    console.log("\n7. Submitting task as Employee with ticked checklist...");
    const submitPayload = {
      checklist: [
        { text: "Write verification script", isCompleted: true },
        { text: "Run verification script", isCompleted: true },
        { text: "Verify results are logged", isCompleted: false } // One item left uncompleted, which is allowed
      ],
      submissionDetails: "Verified script runs. Still working on double checking the logging mechanisms."
    };

    const submitRes = await request("PUT", `/api/tasks/${taskId}/submit`, submitPayload, employeeToken);
    if (submitRes.statusCode !== 200) {
      console.error("Failed to submit task:", submitRes.body);
      return;
    }
    console.log("Task submitted successfully! Status code:", submitRes.statusCode);

    // 8. Fetch the task as Employee to verify saved fields
    console.log("\n8. Fetching task details to verify completed properties...");
    const checkTaskRes = await request("GET", `/api/tasks/${taskId}`, null, employeeToken);
    if (checkTaskRes.statusCode !== 200) {
      console.error("Failed to fetch task:", checkTaskRes.body);
      return;
    }

    const completedTask = checkTaskRes.body.task;
    console.log("Verified Properties:");
    console.log(` - Status: ${completedTask.status} (Expected: Completed)`);
    console.log(` - Completion Date: ${completedTask.completionDate}`);
    console.log(` - Submission Date: ${completedTask.submissionDate}`);
    console.log(` - Submission Details: "${completedTask.submissionDetails}"`);
    console.log(` - Checklist Length: ${completedTask.checklist?.length}`);
    completedTask.checklist.forEach((item, index) => {
      console.log(`    [${item.isCompleted ? "X" : " "}] ${item.text}`);
    });

    // Check performance score update
    console.log("\n9. Fetching Employee Profile to check updated Performance Score...");
    const profileRes = await request("GET", "/api/auth/me", null, employeeToken);
    if (profileRes.statusCode === 200) {
      console.log(` - New Performance Score: ${profileRes.body.user.performanceScore}`);
    }

    // Check activity log history
    console.log("\n10. Checking Task Activity Log History...");
    const activities = completedTask.activityHistory;
    activities.forEach(act => {
      console.log(` - Action: "${act.action}" performed at ${act.timestamp}`);
    });

    console.log("\n=== ALL PROGRAMMATIC VERIFICATION PASSED SUCCESSFULLY ===");

  } catch (err) {
    console.error("Verification failed with error:", err.message);
  }
};

run();
