# WorkFlow Pro – Employee Task & Project Management Portal

WorkFlow Pro is a modern, enterprise-grade project and task management application designed for seamless role-based collaboration, deadline tracking, real-time team messaging, productivity auditing, and smart timeline forecasting. It is styled with a sleek violet/indigo theme and supports full light/dark mode toggling.

---

## 🚀 Key Features

1. **Role-Based Access Control (RBAC)**
   - **Admin**: Full user administration, project creation, and team assigning.
   - **Manager**: Project oversight, task allocation, Gantt timelines, AI workload balancing, and report exporting.
   - **Team Leader (TL)**: Subtask assignment, team monitoring, and completion approvals.
   - **Employee**: Task board (Kanban), logging work hours, posting comments/file uploads, and performance tracking.
2. **Project Detail Hub**
   - **Kanban Board**: Drag-and-drop or fast status updates.
   - **Gantt Timeline Planner**: Visual task durations and dependencies.
   - **Calendar View**: High-level calendar mapping deadlines.
   - **Team Chat**: Instant websocket-based messaging room for project collaborators.
   - **Project Documents**: General storage for shared files.
3. **Smart AI Heuristics Engine**
   - **Delay Prediction**: AI warns if a project is likely to miss its target based on completed task speeds.
   - **Employee Workload Balancing**: Automatically flags team members with excessive active critical tasks and suggests redistribution.
   - **Intelligent Priority Recommendation**: Escalates priority suggestions when task due dates draw close.
4. **Real-time Notifications**
   - Immediate in-app slide-out toasts (built with Socket.io) when tasks are assigned, updated, or overdue.
5. **Auditing & Reporting**
   - Interactive Recharts visual graphs.
   - Filters for Employee Productivity, Project Status Health, and Security Audit Trails.
   - One-click CSV exports of reports.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Recharts, Socket.io-client, Axios.
- **Backend**: Node.js, Express, Socket.io, Mongoose (MongoDB ODM), Multer (file uploads), Bcrypt, JWT.
- **Database Fallback (Mock DB)**: A custom-built, fully functional in-memory database simulation that intercepts Mongoose query chains if no active MongoDB instance is detected on port `27017`. Zero database configuration is needed to run locally!

---

## 🔑 Default Accounts (Pre-Seeded)

The portal automatically boots with the following pre-seeded credentials for validation:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@workflowpro.com` | `AdminPassword123!` |
| **Manager** | `manager@workflowpro.com` | `ManagerPassword123!` |
| **Team Leader** | `tl@workflowpro.com` | `LeaderPassword123!` |
| **Employee** | `employee@workflowpro.com` | `EmployeePassword123!` |

---

## 💻 Running the App Locally

### 1. Prerequisite Installation
Install dependencies for both projects from the root workspace:
```bash
npm run install:all
```

### 2. Start Services
Boot the frontend development client and the backend server concurrently:
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173/`
- **Backend Server**: `http://localhost:5000/`

---

## 🐳 Running via Docker Compose

To boot using Docker with a real, isolated MongoDB container:
```bash
docker-compose up --build
```
- **Frontend App**: `http://localhost:3000/` (proxies backend requests automatically)
- **Backend Server**: `http://localhost:5000/`

---

## 🌐 Secure Production Deployment Guide

You can deploy this full-stack application completely for **free** using standard cloud services. Below are step-by-step instructions.

### 1. Push Code Securely to GitHub
Your repository is configured with a strict `.gitignore` file to ensure security credentials, token secrets, and dependencies are never pushed to the cloud.

Run the following commands in the project root:
```bash
# Verify Git is initialized
git status

# Stage all files (excluding ignored files)
git add .

# Create initial commit
git commit -m "Initial commit - Branded Task Manager with enhanced security"

# Create a new repository on your GitHub account, then link and push:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

### 2. Set Up a Free Database (MongoDB Atlas)
MongoDB Atlas offers a generous **free tier (M0 Sandbox)** with 512MB of storage—perfect for this task manager.

1. **Sign Up / Login**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and register for a free account.
2. **Create Database Cluster**: Select **Create a Deployment** and pick the **M0 Free tier** (Shared cluster). Choose a cloud provider and region close to you.
3. **Database Access Security**:
   - Create a database user (e.g. `db_admin`).
   - Generate a strong, secure password (avoid special characters like `@` or `:` in the password as they require URL-encoding, or use simple alpha-numeric passwords).
4. **Network Access (IP Whitelist)**:
   - Go to **Network Access** > **Add IP Address**.
   - For local development, select **Add Current IP Address**.
   - If hosting the backend on dynamic cloud environments (like Render/Koyeb), select **Allow Access From Anywhere** (`0.0.0.0/0`).
5. **Get Connection String**:
   - In the Database dashboard, click **Connect**.
   - Choose **Drivers** under "Connect to your application".
   - Copy the connection URI string. It will look like this:
     ```
     mongodb+srv://db_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
     ```
   - Replace `<password>` with your database user's password. Keep this string secret!

---

### 3. Deploy the Backend Server (Free)
You can deploy the Node.js backend using **Render** or **Koyeb** (free tier).

#### Deployment on Render:
1. Log in to [Render](https://render.com/) using your GitHub account.
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following details:
   - **Name**: `faith-automation-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
5. Scroll down to **Environment Variables** and add:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: *Your MongoDB Atlas connection string*
   - `JWT_SECRET`: *A strong secret key (e.g. any random 32+ character string)*
   - `JWT_EXPIRE`: `30d`
   - `FRONTEND_URL`: *The URL of your frontend (you will set this after deploying the React app, e.g. `https://faith-automation.vercel.app`)*
6. Click **Deploy Web Service**. Once running, Render will give you a public URL (e.g. `https://faith-automation-backend.onrender.com`).

---

### 4. Deploy the Frontend Application (Free)
You can host the React frontend on **Vercel** or **Netlify** for free.

#### Deployment on Vercel:
1. Log in to [Vercel](https://vercel.com/) with your GitHub account.
2. Click **Add New** > **Project** and import your repository.
3. Set the following details:
   - **Framework Preset**: `Vite` (automatically detected)
   - **Root Directory**: `frontend`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: *Your deployed backend service API URL* (e.g., `https://faith-automation-backend.onrender.com/api`)
5. Click **Deploy**. Vercel will deploy the application and give you a public URL (e.g. `https://faith-automation.vercel.app`).
6. **Important CORS Step**: Copy this frontend URL, go back to your backend service settings on Render, and update the `FRONTEND_URL` environment variable with it. Re-deploy the backend service to apply.

