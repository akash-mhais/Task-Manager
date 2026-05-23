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
    console.log("=== WORKFLOW PRO BACKEND VERIFICATION ===");

    // --- 1. ADMIN ROLE TESTING ---
    console.log("\n--- TESTING ADMIN ROLE ---");
    console.log("1. Logging in as Admin (admin@faithautomation.com)...");
    const adminLogin = await request("POST", "/api/auth/login", {
      email: "admin@faithautomation.com",
      password: "AdminPassword123!"
    });
    
    if (adminLogin.statusCode !== 200 || !adminLogin.body.success) {
      console.error("Admin login failed:", adminLogin.body);
      return;
    }

    const adminToken = adminLogin.body.token;
    console.log("Admin login successful!");

    // 1.a. Check Admin Profile
    const adminMe = await request("GET", "/api/auth/me", null, adminToken);
    console.log(` - /api/auth/me: Status ${adminMe.statusCode} | User: ${adminMe.body?.user?.name} (${adminMe.body?.user?.role})`);

    // 1.b. Check Admin Projects Restriction
    const adminProjects = await request("GET", "/api/projects", null, adminToken);
    console.log(` - /api/projects: Status ${adminProjects.statusCode} (Expected: 403) | Error: ${adminProjects.body?.error}`);

    // 1.c. Check Admin Tasks Restriction
    const adminTasks = await request("GET", "/api/tasks", null, adminToken);
    console.log(` - /api/tasks: Status ${adminTasks.statusCode} (Expected: 403) | Error: ${adminTasks.body?.error}`);

    // 1.d. Check Admin Dashboard Analytics Restriction
    const adminDashboard = await request("GET", "/api/analytics/dashboard", null, adminToken);
    console.log(` - /api/analytics/dashboard: Status ${adminDashboard.statusCode} (Expected: 403) | Error: ${adminDashboard.body?.error}`);


    // --- 2. MANAGER ROLE TESTING ---
    console.log("\n--- TESTING MANAGER ROLE ---");
    console.log("2. Logging in as Manager (manager@faithautomation.com)...");
    const managerLogin = await request("POST", "/api/auth/login", {
      email: "manager@faithautomation.com",
      password: "ManagerPassword123!"
    });
    
    if (managerLogin.statusCode !== 200 || !managerLogin.body.success) {
      console.error("Manager login failed:", managerLogin.body);
      return;
    }

    const managerToken = managerLogin.body.token;
    console.log("Manager login successful!");

    // 2.a. Check Manager Profile
    const managerMe = await request("GET", "/api/auth/me", null, managerToken);
    console.log(` - /api/auth/me: Status ${managerMe.statusCode} | User: ${managerMe.body?.user?.name} (${managerMe.body?.user?.role})`);

    // 2.b. Check Manager Projects (Should see all projects globally)
    const managerProjects = await request("GET", "/api/projects", null, managerToken);
    console.log(` - /api/projects: Status ${managerProjects.statusCode} (Expected: 200) | Projects Count: ${managerProjects.body?.count}`);
    if (managerProjects.statusCode === 200 && managerProjects.body?.projects) {
      managerProjects.body.projects.forEach(p => {
        console.log(`    - [${p.status}] ${p.name} (Manager: ${p.manager?.name || "None"}, Progress: ${p.progress}%)`);
      });
    }

    // 2.c. Check Manager Tasks (Should see all tasks globally)
    const managerTasks = await request("GET", "/api/tasks", null, managerToken);
    console.log(` - /api/tasks: Status ${managerTasks.statusCode} (Expected: 200) | Tasks Count: ${managerTasks.body?.count}`);
    if (managerTasks.statusCode === 200 && managerTasks.body?.tasks) {
      managerTasks.body.tasks.forEach(t => {
        console.log(`    - [${t.status}] ${t.title} (Assigned to: ${t.assignedTo ? t.assignedTo.name : "None"}, AI Suggestion: ${t.aiSuggestion?.suggestedPriority})`);
      });
    }

    // 2.d. Check Manager Dashboard Analytics (Should access statistics globally)
    const managerDashboard = await request("GET", "/api/analytics/dashboard", null, managerToken);
    console.log(` - /api/analytics/dashboard: Status ${managerDashboard.statusCode} (Expected: 200)`);
    if (managerDashboard.statusCode === 200 && managerDashboard.body?.stats) {
      console.log("   Dashboard Stats:");
      console.log("    - Total Projects:", managerDashboard.body.stats.totalProjects);
      console.log("    - Total Employees:", managerDashboard.body.stats.totalEmployees);
      console.log("    - Active Tasks:", managerDashboard.body.stats.activeTasks);
      console.log("    - Delayed Tasks:", managerDashboard.body.stats.delayedTasks);
      console.log("    - Delayed Projects:", managerDashboard.body.stats.delayedProjects);
    }

    console.log("\n=== MULTI-ROLE VERIFICATION COMPLETED SUCCESSFULY ===");
  } catch (err) {
    console.error("Verification failed with error:", err.message);
  }
};

run();
