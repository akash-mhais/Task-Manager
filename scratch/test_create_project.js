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
    console.log("Logging in as Manager (manager@faithautomation.com)...");
    const loginRes = await request("POST", "/api/auth/login", {
      email: "manager@faithautomation.com",
      password: "ManagerPassword123!"
    });
    
    if (loginRes.statusCode !== 200) {
      console.error("Login failed:", loginRes.body);
      return;
    }

    const token = loginRes.body.token;
    const managerId = loginRes.body.user._id;
    console.log("Logged in! Manager ID:", managerId);

    console.log("Attempting to create a project...");
    const projectData = {
      name: "Test Project A",
      description: "A test project description",
      clientName: "Faith Automation Client",
      priority: "High",
      plannedStartDate: "2026-05-25",
      plannedEndDate: "2026-06-25",
      budget: 50000,
      manager: managerId,
      teamMembers: []
    };

    const createRes = await request("POST", "/api/projects", projectData, token);
    console.log("Status Code:", createRes.statusCode);
    console.log("Response Body:", createRes.body);
  } catch (err) {
    console.error("Test failed:", err.message);
  }
};

run();
