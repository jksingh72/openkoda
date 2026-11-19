# Openkoda Feature Development: Complete Step-by-Step Guide

## Overview: The 7-Step Process

Adding a new feature to Openkoda follows this systematic approach:

1. **Feature Design** - Define what you're building
2. **Data Model Design** - Design database tables and relationships  
3. **Configuration Development** - Create YAML + JavaScript files
4. **UI Development** - Build HTML templates and components
5. **Business Logic** - Add server-side JavaScript
6. **Database Migration** - Create SQL scripts
7. **Testing & Deployment** - Test and deploy the feature

Let's walk through a complete example: Building a **"Project Management"** feature with projects, tasks, and team members.

---

## Step 1: Feature Design & Requirements

### 1.1 Define Feature Scope
**Feature**: Project Management System
**Purpose**: Track projects, tasks, and team assignments

### 1.2 User Stories
```
1. As a manager, I want to create projects with details
2. As a team member, I want to see my assigned tasks
3. As a PM, I want to track project progress
4. As a user, I want to upload files to tasks
5. As an admin, I want to generate project reports
```

### 1.3 Entities & Relationships
```
Project (1) --- (many) Task (1) --- (many) TaskAssignment
     |                             |
     |--- (many) ProjectMember     |--- (1) User
```

### 1.4 Privileges Required
- `canManageProjects` - Create/edit/delete projects
- `canViewProjects` - View projects and tasks
- `canAssignTasks` - Assign tasks to team members
- `canManageTasks` - Create/edit/delete tasks

---

## Step 2: Data Model Design

### 2.1 Create Entity Definitions

**File:** `design/project-management-data-model.md`

```yaml
Entities:
  Project:
    Fields:
      - name: String (required)
      - description: Text
      - startDate: Date
      - endDate: Date
      - status: Enum [PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD]
      - budget: Decimal
      - managerId: ForeignKey(User)
    
  Task:
    Fields:
      - title: String (required)
      - description: Text
      - projectId: ForeignKey(Project)
      - assigneeId: ForeignKey(User)
      - priority: Enum [LOW, MEDIUM, HIGH, CRITICAL]
      - status: Enum [TODO, IN_PROGRESS, REVIEW, DONE]
      - dueDate: Date
      - estimatedHours: Integer
      - actualHours: Integer
    
  ProjectMember:
    Fields:
      - projectId: ForeignKey(Project)
      - userId: ForeignKey(User)
      - role: Enum [MANAGER, DEVELOPER, DESIGNER, TESTER]
    
  TaskComment:
    Fields:
      - taskId: ForeignKey(Task)
      - userId: ForeignKey(User)
      - comment: Text
      - attachmentId: ForeignKey(File)
```

### 2.2 Database Table Design

**File:** `sql/project-management-tables.sql`

```sql
-- Project table
CREATE TABLE dynamic_project (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50),
  budget DECIMAL(12,2),
  manager_id BIGINT,
  created_on TIMESTAMP,
  created_by BIGINT,
  updated_on TIMESTAMP,
  updated_by BIGINT
);

-- Task table
CREATE TABLE dynamic_task (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_id BIGINT REFERENCES dynamic_project(id),
  assignee_id BIGINT,
  priority VARCHAR(50),
  status VARCHAR(50),
  due_date DATE,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  created_on TIMESTAMP,
  created_by BIGINT,
  updated_on TIMESTAMP,
  updated_by BIGINT
);

-- Indexes for performance
CREATE INDEX idx_task_project ON dynamic_task(project_id);
CREATE INDEX idx_task_assignee ON dynamic_task(assignee_id);
CREATE INDEX idx_project_status ON dynamic_project(status);
```

---

## Step 3: Configuration Development

### 3.1 Create Form Definitions

**File:** `components/form/project.yaml`

```yaml
!!com.openkoda.service.export.dto.FormConversionDto
name: "project"
tableName: "dynamic_project"
readPrivilege: "canViewProjects"
writePrivilege: "canManageProjects"
registerApiCrudController: true
registerHtmlCrudController: true
tableColumns: "name,status,startDate,endDate,manager.fullName"
filterColumns: "status,managerId"
showOnOrganizationDashboard: true
code: "code/form/project.js"
```

**File:** `code/form/project.js`

```javascript
a => a.text("name").required()
      .textarea("description")
      .date("startDate")
      .date("endDate")
      .datalist("projectStatuses", d => 
        d.toLinkedMap(["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]))
      .dropdown("status", "projectStatuses")
      .number("budget").min(0)
      .manyToOne("managerId", "user").referenceDescriptionSource("full_name")
      .files("projectDocuments", (f, r) => 
        r.getFileDtos(f.entity), "application/pdf,image/*")
```

**File:** `components/form/task.yaml`

```yaml
!!com.openkoda.service.export.dto.FormConversionDto
name: "task"
tableName: "dynamic_task"
readPrivilege: "canViewProjects"
writePrivilege: "canManageTasks"
registerApiCrudController: true
registerHtmlCrudController: true
tableColumns: "title,project.name,priority,status,dueDate,assignee.fullName"
code: "code/form/task.js"
```

**File:** `code/form/task.js`

```javascript
a => a.text("title").required()
      .textarea("description")
      .manyToOne("projectId", "project").referenceDescriptionSource("name")
      .manyToOne("assigneeId", "user").referenceDescriptionSource("full_name")
      .datalist("taskPriorities", d => 
        d.toLinkedMap(["LOW", "MEDIUM", "HIGH", "CRITICAL"]))
      .dropdown("priority", "taskPriorities")
      .datalist("taskStatuses", d => 
        d.toLinkedMap(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]))
      .dropdown("status", "taskStatuses")
      .date("dueDate")
      .number("estimatedHours").min(0)
      .number("actualHours").min(0)
      .files("taskAttachments")
```

### 3.2 Create Privilege Definitions

**File:** `components/privilege/project-management-privileges.yaml`

```yaml
!!com.openkoda.service.export.dto.DynamicPrivilegeConversionDto
name: "canManageProjects"
description: "Can create, edit, and delete projects"
module: "project-management"

---

!!com.openkoda.service.export.dto.DynamicPrivilegeConversionDto
name: "canViewProjects"
description: "Can view projects and tasks"
module: "project-management"

---

!!com.openkoda.service.export.dto.DynamicPrivilegeConversionDto
name: "canManageTasks"
description: "Can create, edit, and delete tasks"
module: "project-management"

---

!!com.openkoda.service.export.dto.DynamicPrivilegeConversionDto
name: "canAssignTasks"
description: "Can assign tasks to team members"
module: "project-management"
```

---

## Step 4: UI Development

### 4.1 Create Dashboard Component

**File:** `components/ui-component/organization/project-dashboard.yaml`

```yaml
!!com.openkoda.service.export.dto.FrontendResourceConversionDto
name: "project-dashboard"
requiredPrivilege: "canViewProjects"
type: "HTML"
resourceType: "RESOURCE"
content: "templates/ui-component/organization/project-dashboard.html"
```

**File:** `templates/ui-component/organization/project-dashboard.html`

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org" 
      layout:decorate="~{layouts/organization}">
<head>
    <title>Project Dashboard</title>
</head>
<body>
<div layout:fragment="content">
    <div class="container-fluid">
        <h1>Project Management Dashboard</h1>
        
        <div class="row">
            <!-- Project Statistics -->
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Active Projects</h5>
                        <p class="display-4" th:text="${stats.activeProjects}">0</p>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">My Tasks</h5>
                        <p class="display-4" th:text="${stats.myTasks}">0</p>
                    </div>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="col-md-12 mt-4">
                <div class="card">
                    <div class="card-header">
                        <h5>Quick Actions</h5>
                    </div>
                    <div class="card-body">
                        <a th:href="@{/html/project/new}" class="btn btn-primary">
                            <i class="fas fa-plus"></i> New Project
                        </a>
                        <a th:href="@{/html/task/new}" class="btn btn-success ml-2">
                            <i class="fas fa-tasks"></i> New Task
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Project List -->
            <div class="col-md-12 mt-4">
                <div class="card">
                    <div class="card-header">
                        <h5>Recent Projects</h5>
                    </div>
                    <div class="card-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr th:each="project : ${recentProjects}">
                                    <td th:text="${project.name}"></td>
                                    <td>
                                        <span class="badge" 
                                              th:classappend="${project.status == 'IN_PROGRESS'} ? 'badge-primary' :
                                                              ${project.status == 'COMPLETED'} ? 'badge-success' :
                                                              'badge-secondary'"
                                              th:text="${project.status}">
                                        </span>
                                    </td>
                                    <td th:text="${#dates.format(project.startDate, 'MMM dd, yyyy')}"></td>
                                    <td th:text="${#dates.format(project.endDate, 'MMM dd, yyyy')}"></td>
                                    <td>
                                        <a th:href="@{'/html/project/' + ${project.id}}" 
                                           class="btn btn-sm btn-info">View</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>
```

**File:** `code/ui-component/organization/project-dashboard-GET.js`

```javascript
flow.thenSet("stats", a => {
        let userId = a.services.user.getCurrentUserId();
        return {
            activeProjects: a.repositories.secure.project.countByStatus("IN_PROGRESS"),
            myTasks: a.repositories.secure.task.countByAssigneeId(userId),
            overdueTasks: a.repositories.secure.task.countOverdue()
        };
    })
    .thenSet("recentProjects", a => 
        a.repositories.secure.project.findRecent(10))
    .thenSet("urgentTasks", a => {
        let userId = a.services.user.getCurrentUserId();
        return a.repositories.secure.task.findUrgentByAssignee(userId, 5);
    });
```

### 4.2 Create Project Detail View

**File:** `components/ui-component/organization/project-detail.yaml`

```yaml
!!com.openkoda.service.export.dto.FrontendResourceConversionDto
name: "project-detail"
requiredPrivilege: "canViewProjects"
type: "HTML"
resourceType: "RESOURCE"
content: "templates/ui-component/organization/project-detail.html"
```

**File:** `code/ui-component/organization/project-detail-GET.js`

```javascript
flow.then(a => {
        let projectId = a.model.get("params").get("id");
        return a.repositories.secure.project.findById(projectId);
    })
    .thenSet("project", a => a.result)
    .thenSet("projectTasks", a => 
        a.repositories.secure.task.findByProjectId(a.model.get("project").id))
    .thenSet("projectMembers", a => 
        a.repositories.secure.projectMember.findByProjectId(a.model.get("project").id))
    .thenSet("canEdit", a => 
        a.services.security.hasPrivilege("canManageProjects"));
```

---

## Step 5: Business Logic Development

### 5.1 Create Project Service

**File:** `components/server-side/project-service.yaml`

```yaml
!!com.openkoda.service.export.dto.ServerJsConversionDto
name: "project-service"
code: "code/server-side/project-service.js"
```

**File:** `code/server-side/project-service.js`

```javascript
let projectService = {
    
    // Calculate project progress based on tasks
    calculateProjectProgress: function(projectId) {
        let tasks = a.repositories.secure.task.findByProjectId(projectId);
        
        if (tasks.length === 0) return 0;
        
        let completedTasks = tasks.filter(t => t.status === "DONE").length;
        return Math.round((completedTasks / tasks.length) * 100);
    },
    
    // Estimate project completion date
    estimateCompletionDate: function(projectId) {
        let project = a.repositories.secure.project.findById(projectId);
        let tasks = a.repositories.secure.task.findByProjectId(projectId);
        
        if (tasks.length === 0) return project.endDate;
        
        let totalRemainingHours = tasks
            .filter(t => t.status !== "DONE")
            .reduce((sum, task) => sum + (task.estimatedHours || 8), 0);
        
        // Assume 8 working hours per day
        let remainingDays = Math.ceil(totalRemainingHours / 8);
        let today = new Date();
        today.setDate(today.getDate() + remainingDays);
        
        return today;
    },
    
    // Assign task with notification
    assignTaskWithNotification: function(taskId, userId) {
        let task = a.repositories.secure.task.findById(taskId);
        let user = a.repositories.secure.user.findById(userId);
        
        // Update task
        task.assigneeId = userId;
        a.repositories.secure.task.save(task);
        
        // Send notification
        a.services.email.send({
            to: user.email,
            subject: `New Task Assignment: ${task.title}`,
            template: "task-assignment",
            data: {
                task: task,
                project: a.repositories.secure.project.findById(task.projectId)
            }
        });
        
        // Slack notification if configured
        if (a.services.integration.slack.isConfigured()) {
            a.services.integration.slack.sendMessage(
                `Task "${task.title}" assigned to ${user.fullName}`
            );
        }
        
        return task;
    },
    
    // Generate project report
    generateProjectReport: function(projectId) {
        let project = a.repositories.secure.project.findById(projectId);
        let tasks = a.repositories.secure.task.findByProjectId(projectId);
        let members = a.repositories.secure.projectMember.findByProjectId(projectId);
        
        let report = {
            project: project,
            summary: {
                totalTasks: tasks.length,
                completedTasks: tasks.filter(t => t.status === "DONE").length,
                inProgressTasks: tasks.filter(t => t.status === "IN_PROGRESS").length,
                totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
                totalActualHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
                teamSize: members.length
            },
            tasksByStatus: this.groupTasksByStatus(tasks),
            tasksByPriority: this.groupTasksByPriority(tasks),
            overdueTasks: tasks.filter(t => 
                t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE"
            )
        };
        
        return report;
    },
    
    groupTasksByStatus: function(tasks) {
        let groups = {};
        tasks.forEach(task => {
            if (!groups[task.status]) groups[task.status] = [];
            groups[task.status].push(task);
        });
        return groups;
    },
    
    groupTasksByPriority: function(tasks) {
        let groups = {};
        tasks.forEach(task => {
            if (!groups[task.priority]) groups[task.priority] = [];
            groups[task.priority].push(task);
        });
        return groups;
    }
};
```

### 5.2 Create Scheduled Tasks

**File:** `components/event/daily-project-reminders.yaml`

```yaml
!!com.openkoda.service.export.dto.EventListenerConversionDto
name: "daily-project-reminders"
eventExpression: "daily at 09:00"
code: "code/event/daily-project-reminders.js"
```

**File:** `code/event/daily-project-reminders.js`

```javascript
flow.then(a => {
        // Find tasks due today or overdue
        let tasks = a.repositories.secure.task.findDueTodayOrOverdue();
        
        // Group by assignee
        let tasksByUser = {};
        tasks.forEach(task => {
            if (task.assigneeId) {
                if (!tasksByUser[task.assigneeId]) {
                    tasksByUser[task.assigneeId] = [];
                }
                tasksByUser[task.assigneeId].push(task);
            }
        });
        
        // Send notifications
        Object.keys(tasksByUser).forEach(userId => {
            let user = a.repositories.secure.user.findById(parseInt(userId));
            let userTasks = tasksByUser[userId];
            
            if (user && user.email) {
                a.services.email.send({
                    to: user.email,
                    subject: `Daily Task Reminder: ${userTasks.length} task(s) due`,
                    template: "daily-task-reminder",
                    data: {
                        user: user,
                        tasks: userTasks,
                        count: userTasks.length
                    }
                });
            }
        });
        
        return tasks.length;
    })
    .thenSet("notificationsSent", a => a.result);
```

---

## Step 6: Database Migration & Setup

### 6.1 Create Migration Script

**File:** `migration/001-add-project-management-tables.sql`

```sql
-- Create project management tables
CREATE TABLE IF NOT EXISTS dynamic_project (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50),
  budget DECIMAL(12,2),
  manager_id BIGINT,
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT,
  updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT
);

CREATE TABLE IF NOT EXISTS dynamic_task (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_id BIGINT REFERENCES dynamic_project(id),
  assignee_id BIGINT,
  priority VARCHAR(50),
  status VARCHAR(50),
  due_date DATE,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT,
  updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT
);

CREATE TABLE IF NOT EXISTS dynamic_project_member (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT,
  project_id BIGINT REFERENCES dynamic_project(id),
  user_id BIGINT,
  role VARCHAR(50),
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dynamic_task_comment (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT,
  task_id BIGINT REFERENCES dynamic_task(id),
  user_id BIGINT,
  comment TEXT,
  attachment_id BIGINT,
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_org ON dynamic_project(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_status ON dynamic_project(status);
CREATE INDEX IF NOT EXISTS idx_task_project ON dynamic_task(project_id);
CREATE INDEX IF NOT EXISTS idx_task_assignee ON dynamic_task(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_status ON dynamic_task(status);
CREATE INDEX IF NOT EXISTS idx_task_due_date ON dynamic_task(due_date);
CREATE INDEX IF NOT EXISTS idx_project_member_project ON dynamic_project_member(project_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_task ON dynamic_task_comment(task_id);

-- Create views for reporting
CREATE OR REPLACE VIEW view_project_progress AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.status as project_status,
  COUNT(t.id) as total_tasks,
  SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as completed_tasks,
  ROUND(
    CASE 
      WHEN COUNT(t.id) = 0 THEN 0
      ELSE SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) * 100.0 / COUNT(t.id)
    END, 2
  ) as progress_percentage
FROM dynamic_project p
LEFT JOIN dynamic_task t ON p.id = t.project_id
GROUP BY p.id, p.name, p.status;

-- Insert default data if needed
INSERT INTO dynamic_privilege (name, description, module) VALUES
  ('canManageProjects', 'Can create, edit, and delete projects', 'project-management'),
  ('canViewProjects', 'Can view projects and tasks', 'project-management'),
  ('canManageTasks', 'Can create, edit, and delete tasks', 'project-management'),
  ('canAssignTasks', 'Can assign tasks to team members', 'project-management')
ON CONFLICT (name) DO NOTHING;
```

### 6.2 Create Initial Data Script

**File:** `migration/002-seed-project-management-data.sql`

```sql
-- Seed sample data for testing (optional)
INSERT INTO dynamic_project (name, description, start_date, end_date, status, budget)
SELECT 
  'Website Redesign',
  'Redesign company website with modern UI',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  'IN_PROGRESS',
  15000.00
WHERE NOT EXISTS (SELECT 1 FROM dynamic_project WHERE name = 'Website Redesign');

INSERT INTO dynamic_project (name, description, start_date, end_date, status, budget)
SELECT 
  'Mobile App Development',
  'Develop cross-platform mobile application',
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '60 days',
  'IN_PROGRESS',
  25000.00
WHERE NOT EXISTS (SELECT 1 FROM dynamic_project WHERE name = 'Mobile App Development');
```

---

## Step 7: Testing & Deployment

### 7.1 Create Test Configuration

**File:** `test/project-management-test-config.yaml`

```yaml
Test Configuration:
  Test Users:
    - username: project-manager
      password: test123
      privileges: [canManageProjects, canManageTasks, canAssignTasks]
    
    - username: team-member
      password: test123
      privileges: [canViewProjects]
  
  Test Data:
    Projects: 3
    Tasks per Project: 5-10
    Team Members per Project: 3-5
  
  Test Scenarios:
    1. Create new project
    2. Add tasks to project
    3. Assign tasks to team members
    4. Update task status
    5. Generate project report
    6. Daily reminder emails
```

### 7.2 Create Deployment Package

**File:** `package/project-management/manifest.yaml`

```yaml
Package:
  name: "project-management"
  version: "1.0.0"
  description: "Project management feature with projects, tasks, and team collaboration"
  dependencies: []
  
Components:
  Forms:
    - form/project.yaml
    - form/task.yaml
    - form/project-member.yaml
  
  UI Components:
    - ui-component/organization/project-dashboard.yaml
    - ui-component/organization/project-detail.yaml
    - ui-component/organization/task-board.yaml
  
  Server-Side:
    - server-side/project-service.yaml
    
  Events:
    - event/daily-project-reminders.yaml
    
  Privileges:
    - privilege/project-management-privileges.yaml
    
Database:
  migrations:
    - migration/001-add-project-management-tables.sql
    - migration/002-seed-project-management-data.sql
  
Templates:
  - templates/ui-component/organization/project-dashboard.html
  - templates/ui-component/organization/project-detail.html
  - templates/email/daily-task-reminder.html
```

### 7.3 Create Build Script

**File:** `scripts/build-project-management.sh`

```bash
#!/bin/bash

# Build script for project management feature

echo "Building Project Management Feature Package..."

# Create package directory
PACKAGE_DIR="build/project-management-1.0.0"
mkdir -p $PACKAGE_DIR

# Copy all components
cp -r components/form/project*.yaml $PACKAGE_DIR/components/form/
cp -r components/form/task*.yaml $PACKAGE_DIR/components/form/
cp -r components/ui-component/organization/project*.yaml $PACKAGE_DIR/components/ui-component/organization/
cp -r components/server-side/project-service.yaml $PACKAGE_DIR/components/server-side/
cp -r components/event/daily-project-reminders.yaml $PACKAGE_DIR/components/event/
cp -r components/privilege/project-management-privileges.yaml $PACKAGE_DIR/components/privilege/

# Copy code files
mkdir -p $PACKAGE_DIR/code
cp -r code/form/project.js $PACKAGE_DIR/code/form/
cp -r code/form/task.js $PACKAGE_DIR/code/form/
cp -r code/ui-component/organization/project*.js $PACKAGE_DIR/code/ui-component/organization/
cp -r code/server-side/project-service.js $PACKAGE_DIR/code/server-side/
cp -r code/event/daily-project-reminders.js $PACKAGE_DIR/code/event/

# Copy templates
mkdir -p $PACKAGE_DIR/templates
cp -r templates/ui-component/organization/project*.html $PACKAGE_DIR/templates/ui-component/organization/

# Copy migrations
mkdir -p $PACKAGE_DIR/migration
cp migration/001-add-project-management-tables.sql $PACKAGE_DIR/migration/
cp migration/002-seed-project-management-data.sql $PACKAGE_DIR/migration/

# Create manifest
cp package/project-management/manifest.yaml $PACKAGE_DIR/

# Create ZIP package
cd build
zip -r project-management-1.0.0.zip project-management-1.0.0/
cd ..

echo "Package created: build/project-management-1.0.0.zip"
echo "Ready for import into Openkoda!"
```

### 7.4 Import into Openkoda

```bash
# 1. Build the package
./scripts/build-project-management.sh

# 2. Import into Openkoda through Admin UI:
#    - Go to Configuration > Import/Export
#    - Upload project-management-1.0.0.zip
#    - Click "Import"

# OR import via API:
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@build/project-management-1.0.0.zip" \
  https://your-openkoda-instance.com/api/components/import
```

### 7.5 Test the Feature

```javascript
// Test script: test-project-management.js
flow.then(a => {
        // Test 1: Create a project
        let project = {
            name: "Test Project",
            description: "Test project creation",
            status: "PLANNING",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30*24*60*60*1000) // 30 days from now
        };
        
        return a.repositories.secure.project.save(project);
    })
    .thenSet("createdProject", a => a.result)
    .then(a => {
        // Test 2: Create a task
        let task = {
            title: "Test Task",
            projectId: a.model.get("createdProject").id,
            status: "TODO",
            priority: "MEDIUM"
        };
        
        return a.repositories.secure.task.save(task);
    })
    .thenSet("createdTask", a => a.result)
    .then(a => {
        // Test 3: Calculate project progress
        let progress = a.services.project.calculateProjectProgress(
            a.model.get("createdProject").id
        );
        
        console.log("Project progress:", progress + "%");
        return progress;
    });
```

---

## Complete Project Structure

```
project-management-feature/
├── design/
│   └── project-management-data-model.md
├── components/
│   ├── form/
│   │   ├── project.yaml
│   │   ├── task.yaml
│   │   └── project-member.yaml
│   ├── ui-component/
│   │   └── organization/
│   │       ├── project-dashboard.yaml
│   │       ├── project-detail.yaml
│   │       └── task-board.yaml
│   ├── server-side/
│   │   └── project-service.yaml
│   ├── event/
│   │   └── daily-project-reminders.yaml
│   └── privilege/
│       └── project-management-privileges.yaml
├── code/
│   ├── form/
│   │   ├── project.js
│   │   └── task.js
│   ├── ui-component/
│   │   └── organization/
│   │       ├── project-dashboard-GET.js
│   │       ├── project-detail-GET.js
│   │       └── task-board-GET.js
│   ├── server-side/
│   │   └── project-service.js
│   └── event/
│       └── daily-project-reminders.js
├── templates/
│   └── ui-component/
│       └── organization/
│           ├── project-dashboard.html
│           ├── project-detail.html
│           └── task-board.html
├── migration/
│   ├── 001-add-project-management-tables.sql
│   └── 002-seed-project-management-data.sql
├── test/
│   └── project-management-test-config.yaml
├── package/
│   └── project-management/
│       └── manifest.yaml
├── scripts/
│   └── build-project-management.sh
└── README.md
```

## Development Timeline

| Phase | Time Estimate | Deliverables |
|-------|--------------|--------------|
| **Design** | 1-2 days | Data model, user stories, privilege design |
| **Form Development** | 1 day | YAML + JS form definitions |
| **UI Development** | 2-3 days | HTML templates + JavaScript controllers |
| **Business Logic** | 2 days | Server-side JavaScript services |
| **Database** | 1 day | Migration scripts |
| **Testing** | 1-2 days | Test configuration + validation |
| **Packaging** | 0.5 day | Build script + manifest |
| **Total** | **8-11 days** | Complete feature ready for deployment |

## Key Success Factors

1. **Start with clear requirements** - Well-defined user stories prevent scope creep
2. **Design data model first** - Solid foundation for all other components
3. **Leverage existing patterns** - Copy from examples (insurance, timelog)
4. **Test incrementally** - Test each component as you build it
5. **Use the import/export system** - Package features for easy deployment
6. **Document everything** - Clear documentation for future maintenance
7. **Consider multi-tenancy** - Design features to work across organizations

## Common Pitfalls to Avoid

1. **Overcomplicating forms** - Start simple, add complexity later
2. **Ignoring security** - Always define proper privileges
3. **Forgetting indexes** - Database performance matters
4. **Hardcoding values** - Use datalists and dropdowns for flexibility
5. **Skipping error handling** - JavaScript services need robust error handling
6. **Neglecting mobile** - Test UI on different screen sizes
7. **Forgetting audit trails** - Enable audit logging for important entities

## Next Steps After Deployment

1. **Monitor usage** - Track feature adoption
2. **Collect feedback** - Gather user feedback for improvements
3. **Performance tuning** - Monitor and optimize database queries
4. **Add analytics** - Track key metrics (projects created, tasks completed)
5. **Plan enhancements** - Based on usage patterns and feedback

This complete guide shows you how to go from idea to deployed feature in Openkoda using its powerful configuration-driven architecture!