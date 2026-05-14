import bcrypt from "bcryptjs";
import { DEFAULT_DEPARTMENTS, normalizeDepartmentName, sortDepartmentNames } from "@/lib/departments";

type Role = "manager" | "employee";
type ApprovalStatus = "pending" | "approved" | "declined";
type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived";
type Priority = "low" | "medium" | "high" | "critical";
type TaskStatus = "todo" | "in_progress" | "review" | "done";
type ReplyPreview = {
  id: string;
  body: string;
  authorName: string;
};

export type DemoUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  team: string;
  designation: string;
  avatar: string;
  isActive: boolean;
  approvalStatus?: ApprovalStatus;
  approvedAt?: string;
  declinedAt?: string;
  emailVerified?: boolean;
  verificationOtp?: string;
  verificationOtpExpiresAt?: string;
  notificationPrefs: {
    taskAssigned: boolean;
    deadlineReminder: boolean;
    projectUpdate: boolean;
    commentMention: boolean;
    fileUploaded: boolean;
  };
};

export type PublicUser = Omit<DemoUser, "password" | "verificationOtp" | "verificationOtpExpiresAt">;

export type DemoProject = {
  _id: string;
  title: string;
  description: string;
  owner: Pick<PublicUser, "id" | "name" | "avatar" | "email" | "designation" | "team">;
  members: Array<Pick<PublicUser, "id" | "name" | "avatar" | "email" | "designation" | "team">>;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  deadline: string;
  progress: number;
  tags: string[];
  coverColor: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DemoTask = {
  _id: string;
  title: string;
  description: string;
  project?: Pick<DemoProject, "_id" | "title" | "coverColor">;
  createdBy: Pick<PublicUser, "id" | "name" | "avatar">;
  assignedTo: Array<Pick<PublicUser, "id" | "name" | "avatar" | "designation" | "team">>;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  completedAt?: string;
  subtasks: Array<{ _id: string; title: string; isCompleted: boolean }>;
  labels: string[];
  estimatedHours?: number;
  loggedHours: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DemoFile = {
  _id: string;
  project?: string;
  task?: string;
  uploadedBy: Pick<PublicUser, "id" | "name" | "avatar">;
  fileName: string;
  fileType: "image" | "document" | "archive" | "other";
  mimeType: string;
  size: number;
  dataUrl?: string;
  createdAt: string;
};

export type DemoComment = {
  _id: string;
  project?: string;
  task?: string;
  author: Pick<PublicUser, "id" | "name" | "avatar" | "designation">;
  body: string;
  mentions: string[];
  replyTo?: ReplyPreview;
  isEdited: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
};

type DemoNotification = {
  _id: string;
  recipient: string;
  sender?: Pick<PublicUser, "id" | "name" | "avatar">;
  type: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
};

type DemoActivity = {
  _id: string;
  project?: string;
  user: Pick<PublicUser, "id" | "name" | "avatar">;
  action: string;
  targetType: "project" | "task" | "file" | "comment" | "member";
  targetTitle: string;
  createdAt: string;
};

export type DemoMessage = {
  _id: string;
  sender: Pick<PublicUser, "id" | "name" | "avatar" | "email" | "designation" | "team" | "role">;
  recipient: Pick<PublicUser, "id" | "name" | "avatar" | "email" | "designation" | "team" | "role">;
  body: string;
  replyTo?: ReplyPreview;
  isRead: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  deletedFor?: string[];
  createdAt: string;
  updatedAt?: string;
};

const now = new Date();
const day = 24 * 60 * 60 * 1000;

const DEMO_PASSWORD = "password123";

function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyDemoPassword(storedPassword: string, candidate: string) {
  if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
    return bcrypt.compareSync(candidate, storedPassword);
  }

  // Compatibility for an already-running demo store created before hashing was added.
  return storedPassword === candidate;
}

const defaultPrefs = {
  taskAssigned: true,
  deadlineReminder: true,
  projectUpdate: true,
  commentMention: true,
  fileUploaded: false,
};

const seedUsers: DemoUser[] = [
  {
    id: "user-owner",
    name: "Demo Manager",
    username: "manager",
    email: "manager@metadeskglobal.com",
    password: hashPassword(DEMO_PASSWORD),
    role: "manager",
    team: "Operations",
    designation: "Workspace Manager",
    avatar: "",
    isActive: true,
    emailVerified: true,
    notificationPrefs: { ...defaultPrefs },
  },
  {
    id: "user-manager",
    name: "Sara Khan",
    username: "sara",
    email: "sara@metadeskglobal.com",
    password: hashPassword(DEMO_PASSWORD),
    role: "manager",
    team: "Firmware",
    designation: "Project Manager",
    avatar: "",
    isActive: true,
    emailVerified: true,
    notificationPrefs: { ...defaultPrefs, fileUploaded: true },
  },
  {
    id: "user-employee",
    name: "Ali Hassan",
    username: "ali",
    email: "ali@metadeskglobal.com",
    password: hashPassword(DEMO_PASSWORD),
    role: "employee",
    team: "Web Development",
    designation: "Frontend Developer",
    avatar: "",
    isActive: true,
    emailVerified: true,
    notificationPrefs: { ...defaultPrefs },
  },
  {
    id: "user-designer",
    name: "Maham Raza",
    username: "maham",
    email: "maham@metadeskglobal.com",
    password: hashPassword(DEMO_PASSWORD),
    role: "employee",
    team: "Graphic Design",
    designation: "Product Designer",
    avatar: "",
    isActive: true,
    emailVerified: true,
    notificationPrefs: { ...defaultPrefs },
  },
  {
    id: "user-ops",
    name: "Hamza Noor",
    username: "hamza",
    email: "hamza@metadeskglobal.com",
    password: hashPassword(DEMO_PASSWORD),
    role: "employee",
    team: "Operations",
    designation: "Operations Coordinator",
    avatar: "",
    isActive: true,
    emailVerified: true,
    notificationPrefs: { ...defaultPrefs },
  },
];

const owner = seedUsers[0];
const manager = seedUsers[1];
const employee = seedUsers[2];
const designer = seedUsers[3];
const ops = seedUsers[4];

const seedProjects: DemoProject[] = [
  {
    _id: "project-website",
    title: "Metadesk Website Refresh",
    description: "Refresh the public website with updated service pages, faster loading, and a cleaner lead flow.",
    owner: publicUser(manager),
    members: [publicUser(manager), publicUser(employee), publicUser(designer)],
    status: "active",
    priority: "high",
    startDate: new Date(now.getTime() - 14 * day).toISOString(),
    deadline: new Date(now.getTime() + 18 * day).toISOString(),
    progress: 0,
    tags: ["website", "marketing"],
    coverColor: "#2563eb",
    isDeleted: false,
    createdAt: new Date(now.getTime() - 14 * day).toISOString(),
    updatedAt: new Date(now.getTime() - 2 * day).toISOString(),
  },
  {
    _id: "project-mobile",
    title: "Client Portal MVP",
    description: "Build the first pass of the client portal for task visibility, approvals, and document sharing.",
    owner: publicUser(owner),
    members: [publicUser(owner), publicUser(manager), publicUser(employee), publicUser(designer)],
    status: "planning",
    priority: "critical",
    startDate: new Date(now.getTime() - 3 * day).toISOString(),
    deadline: new Date(now.getTime() + 2 * day).toISOString(),
    progress: 0,
    tags: ["portal", "mvp"],
    coverColor: "#00a8ff",
    isDeleted: false,
    createdAt: new Date(now.getTime() - 3 * day).toISOString(),
    updatedAt: new Date(now.getTime() - day).toISOString(),
  },
  {
    _id: "project-automation",
    title: "Operations Automation",
    description: "Internal workflows for weekly reporting, reminders, and handoff checklists.",
    owner: publicUser(manager),
    members: [publicUser(manager), publicUser(ops)],
    status: "completed",
    priority: "medium",
    startDate: new Date(now.getTime() - 60 * day).toISOString(),
    deadline: new Date(now.getTime() - 4 * day).toISOString(),
    progress: 0,
    tags: ["internal", "automation"],
    coverColor: "#00c389",
    isDeleted: false,
    createdAt: new Date(now.getTime() - 60 * day).toISOString(),
    updatedAt: new Date(now.getTime() - 4 * day).toISOString(),
  },
];

const seedTasks: DemoTask[] = [
  {
    _id: "task-wireframes",
    title: "Finalize dashboard wireframes",
    description: "Lock the dashboard structure before implementation.",
    project: pickProject(seedProjects[1]),
    createdBy: pickActor(manager),
    assignedTo: [pickAssignee(employee), pickAssignee(designer)],
    status: "review",
    priority: "high",
    dueDate: new Date(now.getTime() + 2 * day).toISOString(),
    subtasks: [
      { _id: "sub-wire-1", title: "Map dashboard states", isCompleted: true },
      { _id: "sub-wire-2", title: "Prepare manager view", isCompleted: false },
    ],
    labels: ["design", "dashboard"],
    estimatedHours: 6,
    loggedHours: 4,
    isDeleted: false,
    createdAt: new Date(now.getTime() - 2 * day).toISOString(),
    updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "task-auth",
    title: "Review authentication flow",
    description: "Check login, registration, roles, and protected routes.",
    project: pickProject(seedProjects[1]),
    createdBy: pickActor(owner),
    assignedTo: [pickAssignee(employee), pickAssignee(manager)],
    status: "in_progress",
    priority: "critical",
    dueDate: new Date(now.getTime() + day).toISOString(),
    subtasks: [
      { _id: "sub-auth-1", title: "Check role redirects", isCompleted: true },
      { _id: "sub-auth-2", title: "Verify inactive users cannot sign in", isCompleted: false },
    ],
    labels: ["auth"],
    estimatedHours: 8,
    loggedHours: 3,
    isDeleted: false,
    createdAt: new Date(now.getTime() - day).toISOString(),
    updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "task-content",
    title: "Prepare services page copy",
    description: "Write concise content for embedded, AI, web, and support services.",
    project: pickProject(seedProjects[0]),
    createdBy: pickActor(manager),
    assignedTo: [pickAssignee(employee)],
    status: "todo",
    priority: "medium",
    dueDate: new Date(now.getTime() + 7 * day).toISOString(),
    subtasks: [],
    labels: ["content"],
    estimatedHours: 5,
    loggedHours: 0,
    isDeleted: false,
    createdAt: new Date(now.getTime() - 5 * day).toISOString(),
    updatedAt: new Date(now.getTime() - 5 * day).toISOString(),
  },
  {
    _id: "task-reporting",
    title: "Ship weekly reporting automation",
    description: "Finish the operations summary workflow.",
    project: pickProject(seedProjects[2]),
    createdBy: pickActor(manager),
    assignedTo: [pickAssignee(ops)],
    status: "done",
    priority: "low",
    dueDate: new Date(now.getTime() - 5 * day).toISOString(),
    completedAt: new Date(now.getTime() - 4 * day).toISOString(),
    subtasks: [{ _id: "sub-report-1", title: "QA generated report", isCompleted: true }],
    labels: ["ops"],
    estimatedHours: 4,
    loggedHours: 4,
    isDeleted: false,
    createdAt: new Date(now.getTime() - 12 * day).toISOString(),
    updatedAt: new Date(now.getTime() - 4 * day).toISOString(),
  },
];

const seedFiles: DemoFile[] = [
  {
    _id: "file-wireframe",
    project: "project-mobile",
    uploadedBy: pickActor(designer),
    fileName: "portal-wireframes.pdf",
    fileType: "document",
    mimeType: "application/pdf",
    size: 2400000,
    createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "file-brief",
    project: "project-website",
    uploadedBy: pickActor(manager),
    fileName: "website-refresh-brief.docx",
    fileType: "document",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 520000,
    createdAt: new Date(now.getTime() - 2 * day).toISOString(),
  },
];

const seedComments: DemoComment[] = [
  {
    _id: "comment-project-mobile",
    project: "project-mobile",
    author: publicCommentUser(manager),
    body: "Please review the latest wireframes and flag any missing portal states.",
    mentions: ["user-employee", "user-designer"],
    isEdited: false,
    createdAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "comment-task-auth",
    task: "task-auth",
    author: publicCommentUser(employee),
    body: "Role redirects are working in demo mode. Inactive-user check is next.",
    mentions: ["user-manager"],
    isEdited: false,
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

const seedNotifications: DemoNotification[] = [
  {
    _id: "notif-task",
    recipient: "user-employee",
    sender: pickActor(manager),
    type: "task_assigned",
    message: 'You were assigned "Review authentication flow"',
    link: "/tasks/task-auth",
    isRead: false,
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "notif-project",
    recipient: "user-employee",
    sender: pickActor(owner),
    type: "project_assigned",
    message: 'You were added to project "Client Portal MVP"',
    link: "/projects/project-mobile",
    isRead: false,
    createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

const seedMessages: DemoMessage[] = [
  {
    _id: "message-1",
    sender: publicMessageUser(manager),
    recipient: publicMessageUser(employee),
    body: "Please send me a quick update on the auth checks when you get a chance.",
    isRead: false,
    createdAt: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
  },
  {
    _id: "message-2",
    sender: publicMessageUser(employee),
    recipient: publicMessageUser(manager),
    body: "Sure. Redirects are done, and I am checking inactive user access now.",
    isRead: true,
    createdAt: new Date(now.getTime() - 65 * 60 * 1000).toISOString(),
  },
  {
    _id: "message-3",
    sender: publicMessageUser(designer),
    recipient: publicMessageUser(manager),
    body: "I uploaded the portal wireframes. Please review the manager dashboard state.",
    isRead: false,
    createdAt: new Date(now.getTime() - 28 * 60 * 1000).toISOString(),
  },
];

const seedActivity: DemoActivity[] = [
  {
    _id: "activity-1",
    project: "project-mobile",
    user: pickActor(owner),
    action: "created",
    targetType: "project",
    targetTitle: "Client Portal MVP",
    createdAt: new Date(now.getTime() - 3 * day).toISOString(),
  },
  {
    _id: "activity-2",
    project: "project-mobile",
    user: pickActor(designer),
    action: "uploaded",
    targetType: "file",
    targetTitle: "portal-wireframes.pdf",
    createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "activity-3",
    project: "project-mobile",
    user: pickActor(employee),
    action: "commented",
    targetType: "comment",
    targetTitle: "Review authentication flow",
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

type DemoStoreState = {
  users: DemoUser[];
  projects: DemoProject[];
  tasks: DemoTask[];
  files: DemoFile[];
  comments: DemoComment[];
  notifications: DemoNotification[];
  messages: DemoMessage[];
  activity: DemoActivity[];
  avatarData: Record<string, string>;
  departments: string[];
};

declare global {
  var metadeskDemoStore: DemoStoreState | undefined;
}

const demoStore =
  globalThis.metadeskDemoStore ||
  (globalThis.metadeskDemoStore = {
    users: seedUsers,
    projects: seedProjects,
    tasks: seedTasks,
    files: seedFiles,
    comments: seedComments,
    notifications: seedNotifications,
    messages: seedMessages,
    activity: seedActivity,
    avatarData: {},
    departments: [...DEFAULT_DEPARTMENTS],
  });

const users = demoStore.users;
const projects = demoStore.projects;
const tasks = demoStore.tasks;
const files = demoStore.files;
const comments = demoStore.comments;
const notifications = demoStore.notifications;
const messages = demoStore.messages;
const activity = demoStore.activity;
const avatarData = demoStore.avatarData || (demoStore.avatarData = {});
const departments = demoStore.departments || (demoStore.departments = [...DEFAULT_DEPARTMENTS]);

function avatarUrl(id: string) {
  return `/api/users/${id}/avatar?v=${Date.now()}`;
}

function publicUser(user: DemoUser): PublicUser {
  const { password, verificationOtp, verificationOtpExpiresAt, ...safeUser } = user;
  return { ...safeUser, approvalStatus: safeUser.approvalStatus || "approved" };
}

function isApprovedDemoUser(user: DemoUser) {
  return user.isActive && user.approvalStatus !== "pending" && user.approvalStatus !== "declined";
}

function pickActor(user: DemoUser) {
  return { id: user.id, name: user.name, avatar: user.avatar };
}

function pickAssignee(user: DemoUser) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    designation: user.designation,
    team: user.team,
  };
}

function publicCommentUser(user: DemoUser) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    designation: user.designation,
  };
}

function publicMessageUser(user: DemoUser) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    email: user.email,
    designation: user.designation,
    team: user.team,
    role: user.role,
  };
}

function pickProject(project: DemoProject) {
  return {
    _id: project._id,
    title: project.title,
    coverColor: project.coverColor,
  };
}

function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

function withProgress(project: DemoProject) {
  const projectTasks = tasks.filter((task) => task.project?._id === project._id && !task.isDeleted);
  const progress =
    projectTasks.length === 0
      ? project.progress
      : Math.round((projectTasks.filter((task) => task.status === "done").length / projectTasks.length) * 100);
  return { ...project, progress };
}

function canSeeProject(project: DemoProject, userId: string, role: Role) {
  return role === "manager" || project.owner.id === userId || project.members.some((m) => m.id === userId);
}

function notify(recipients: string[], senderId: string, type: string, message: string, link: string) {
  const sender = users.find((user) => user.id === senderId) || owner;
  Array.from(new Set(recipients))
    .filter((id) => id !== senderId && users.some((user) => user.id === id && user.isActive))
    .forEach((recipient) => {
      notifications.unshift({
          _id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          recipient,
          sender: pickActor(sender),
          type,
          message,
          link,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
    });
}

function taskStatusRecipients(task: DemoTask) {
  const recipients = new Set<string>();
  task.assignedTo.forEach((user) => recipients.add(user.id));
  if (task.createdBy?.id) recipients.add(task.createdBy.id);

  const project = task.project ? projects.find((item) => item._id === task.project?._id && !item.isDeleted) : undefined;
  if (project) {
    recipients.add(project.owner.id);
    project.members.forEach((member) => {
      const fullUser = users.find((user) => user.id === member.id);
      if (fullUser?.role === "manager") recipients.add(member.id);
    });
  }

  return Array.from(recipients);
}

function addActivity(project: string | undefined, userId: string, action: string, targetType: DemoActivity["targetType"], targetTitle: string) {
  const user = users.find((item) => item.id === userId) || owner;
  activity.unshift({
      _id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      project,
      user: pickActor(user),
      action,
      targetType,
      targetTitle,
      createdAt: new Date().toISOString(),
    });
}

export function findDemoUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  const loginEmail = normalizedEmail === "owner@metadeskglobal.com" ? "manager@metadeskglobal.com" : normalizedEmail;
  return users.find((user) => user.email.toLowerCase() === loginEmail);
}

export function listDemoUsers() {
  return users.map((user) => {
    const assignedProjects = projects.filter(
      (project) =>
        !project.isDeleted &&
        (project.owner.id === user.id || project.members.some((member) => member.id === user.id))
    );
    const assignedTasks = tasks.filter((task) => !task.isDeleted && task.assignedTo.some((member) => member.id === user.id));

    return {
      ...publicUser(user),
      projectCount: assignedProjects.length,
      taskCount: assignedTasks.length,
      openTaskCount: assignedTasks.filter((task) => task.status !== "done").length,
      standaloneTaskCount: assignedTasks.filter((task) => !task.project).length,
    };
  });
}

export function listDemoDepartments() {
  return sortDepartmentNames([...DEFAULT_DEPARTMENTS, ...departments, ...users.map((user) => user.team)]);
}

export function deactivateDemoUser(id: string, active: boolean) {
  const user = users.find((item) => item.id === id);
  if (!user) return null;
  user.isActive = active;
  return publicUser(user);
}

export function deleteDemoUser(id: string, managerId: string) {
  if (id === managerId) return false;
  const userIndex = users.findIndex((item) => item.id === id);
  const replacement = users.find((item) => item.id === managerId && item.role === "manager" && item.isActive);
  if (userIndex === -1 || !replacement) return false;

  projects.forEach((project) => {
    if (project.owner.id === id) project.owner = publicUser(replacement);
    project.members = project.members.filter((member) => member.id !== id);
    if (!project.members.some((member) => member.id === project.owner.id)) {
      project.members.unshift(publicUser(replacement));
    }
  });

  tasks.forEach((task) => {
    task.assignedTo = task.assignedTo.filter((member) => member.id !== id);
  });

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender.id === id || messages[i].recipient.id === id) messages.splice(i, 1);
  }

  for (let i = notifications.length - 1; i >= 0; i--) {
    if (notifications[i].recipient === id || notifications[i].sender?.id === id) notifications.splice(i, 1);
  }

  delete avatarData[id];
  users.splice(userIndex, 1);
  return true;
}

export function deletePendingDemoUserByEmail(email: string) {
  const userIndex = users.findIndex(
    (user) => user.email.toLowerCase() === email.toLowerCase() && (user.emailVerified === false || user.approvalStatus === "pending")
  );
  if (userIndex === -1) return false;
  users.splice(userIndex, 1);
  return true;
}

export function updateDemoUserRole(id: string, role: Role) {
  const user = users.find((item) => item.id === id);
  if (!user) return null;
  user.role = role;
  return publicUser(user);
}

export function updateDemoUserTeam(id: string, team: string) {
  const user = users.find((item) => item.id === id);
  const normalized = normalizeDepartmentName(team);
  if (!user || !normalized) return null;
  createDemoDepartment(normalized);
  user.team = normalized;
  return publicUser(user);
}

export function createDemoDepartment(name: string) {
  const normalized = normalizeDepartmentName(name);
  if (!normalized) return null;
  if (!departments.some((department) => department.toLowerCase() === normalized.toLowerCase())) {
    departments.push(normalized);
  }
  return { name: normalized };
}

export function updateDemoUserAvatar(id: string, avatar: string) {
  const user = users.find((item) => item.id === id);
  if (!user) return null;

  avatarData[id] = avatar;
  const nextAvatar = avatarUrl(id);
  user.avatar = nextAvatar;

  projects.forEach((project) => {
    if (project.owner.id === id) project.owner.avatar = nextAvatar;
    project.members.forEach((member) => {
      if (member.id === id) member.avatar = nextAvatar;
    });
  });

  tasks.forEach((task) => {
    if (task.createdBy.id === id) task.createdBy.avatar = nextAvatar;
    task.assignedTo.forEach((assignee) => {
      if (assignee.id === id) assignee.avatar = nextAvatar;
    });
  });

  files.forEach((file) => {
    if (file.uploadedBy.id === id) file.uploadedBy.avatar = nextAvatar;
  });

  comments.forEach((comment) => {
    if (comment.author.id === id) comment.author.avatar = nextAvatar;
  });

  notifications.forEach((notification) => {
    if (notification.sender?.id === id) notification.sender.avatar = nextAvatar;
  });

  messages.forEach((message) => {
    if (message.sender.id === id) message.sender.avatar = nextAvatar;
    if (message.recipient.id === id) message.recipient.avatar = nextAvatar;
  });

  activity.forEach((item) => {
    if (item.user.id === id) item.user.avatar = nextAvatar;
  });

  return publicUser(user);
}

export function getDemoUserAvatarData(id: string) {
  return avatarData[id] || null;
}

export function updateDemoUserPassword(id: string, currentPassword: string, nextPassword: string) {
  const user = users.find((item) => item.id === id);
  if (!user) return { user: null, error: "User not found" };
  if (!verifyDemoPassword(user.password, currentPassword)) return { user: null, error: "Current password is incorrect" };

  user.password = hashPassword(nextPassword);
  return { user: publicUser(user), error: null };
}

export function createDemoUser(data: Omit<DemoUser, "id" | "avatar" | "isActive" | "notificationPrefs">) {
  const exists = users.find(
    (user) =>
      user.email.toLowerCase() === data.email.toLowerCase() ||
      user.username.toLowerCase() === data.username.toLowerCase()
  );

  if (exists) {
    return { user: null, error: exists.email === data.email ? "Email" : "Username" };
  }

  const user: DemoUser = {
    ...data,
    password: hashPassword(data.password),
    id: `user-${Date.now()}`,
    avatar: "",
    isActive: true,
    approvalStatus: users.length === 0 ? "approved" : data.approvalStatus || "pending",
    emailVerified: true,
    approvedAt: users.length === 0 ? new Date().toISOString() : undefined,
    notificationPrefs: { ...defaultPrefs },
  };
  users.push(user);
  return { user, error: null };
}

export function updateDemoUserApproval(id: string, status: ApprovalStatus) {
  const user = users.find((item) => item.id === id);
  if (!user) return null;
  user.approvalStatus = status;
  user.emailVerified = true;
  if (status === "approved") {
    user.isActive = true;
    user.approvedAt = new Date().toISOString();
    user.declinedAt = undefined;
  }
  if (status === "declined") {
    user.isActive = false;
    user.declinedAt = new Date().toISOString();
  }
  return publicUser(user);
}

export function issueDemoUserVerificationOtp(email: string, verificationOtp: string) {
  const user = findDemoUserByEmail(email);
  if (!user) return { user: null, error: "Account not found" };
  if (user.emailVerified !== false) return { user: publicUser(user), error: "Account is already verified" };

  user.verificationOtp = verificationOtp;
  user.verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  return { user: publicUser(user), error: null };
}

export function verifyDemoUserEmailOtp(email: string, verificationOtp: string) {
  const user = findDemoUserByEmail(email);
  if (!user) return { user: null, error: "Invalid verification code" };
  if (user.emailVerified !== false) return { user: publicUser(user), error: null };
  if (!user.verificationOtp || !user.verificationOtpExpiresAt || new Date(user.verificationOtpExpiresAt).getTime() < Date.now()) {
    return { user: null, error: "Verification code expired. Please resend a new code." };
  }
  if (user.verificationOtp !== verificationOtp) {
    return { user: null, error: "Invalid verification code" };
  }

  user.emailVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpiresAt = undefined;
  return { user: publicUser(user), error: null };
}

export function listDemoProjects({
  status,
  page,
  limit,
  userId = owner.id,
  role = "manager",
}: {
  status?: string | null;
  page: number;
  limit: number;
  userId?: string;
  role?: Role;
}) {
  const filtered = projects
    .filter((project) => !project.isDeleted)
    .filter((project) => canSeeProject(project, userId, role))
    .filter((project) => !status || project.status === status)
    .map(withProgress);

  return {
    projects: paginate(filtered, page, limit),
    total: filtered.length,
    page,
    pages: Math.ceil(filtered.length / limit),
  };
}

export function getDemoProject(id: string, userId = owner.id, role: Role = "manager") {
  const project = projects.find((item) => item._id === id && !item.isDeleted);
  if (!project || !canSeeProject(project, userId, role)) return null;

  return {
    project: withProgress(project),
    activity: activity.filter((item) => item.project === id).slice(0, 20),
    tasks: tasks.filter((task) => task.project?._id === id && !task.isDeleted),
    files: files.filter((file) => file.project === id),
    comments: comments.filter((comment) => comment.project === id),
  };
}

export function createDemoProject(data: {
  title: string;
  description: string;
  ownerId?: string;
  memberIds?: string[];
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  deadline: string;
  tags: string[];
  coverColor: string;
}) {
  const projectOwner = users.find((user) => user.id === data.ownerId) || owner;
  const selectedMembers = users.filter((user) => data.memberIds?.includes(user.id));
  const members = selectedMembers.length > 0 ? selectedMembers : [projectOwner];
  const uniqueMembers = Array.from(new Map([projectOwner, ...members].map((user) => [user.id, user])).values());

  const project: DemoProject = {
    _id: `project-${Date.now()}`,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    startDate: data.startDate,
    deadline: data.deadline,
    tags: data.tags,
    coverColor: data.coverColor,
    owner: publicUser(projectOwner),
    members: uniqueMembers.map(publicUser),
    progress: 0,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.unshift(project);
  addActivity(project._id, projectOwner.id, "created", "project", project.title);
  notify(project.members.map((member) => member.id), projectOwner.id, "project_assigned", `You were added to project "${project.title}"`, `/projects/${project._id}`);
  return project;
}

export function updateDemoProject(
  id: string,
  updates: Partial<Pick<DemoProject, "title" | "description" | "status" | "priority" | "deadline" | "coverColor">> & { memberIds?: string[] },
  userId: string
) {
  const project = projects.find((item) => item._id === id && !item.isDeleted);
  if (!project) return null;
  const { memberIds, ...projectUpdates } = updates;

  if (memberIds) {
    const selectedMembers = users.filter((user) => memberIds.includes(user.id) && user.isActive);
    project.members = selectedMembers.map(publicUser);
  }

  Object.assign(project, projectUpdates, { updatedAt: new Date().toISOString() });
  addActivity(project._id, userId, "updated", "project", project.title);
  notify(project.members.map((member) => member.id), userId, "project_update", `Project "${project.title}" was updated`, `/projects/${project._id}`);
  return withProgress(project);
}

export function deleteDemoProject(id: string, userId: string) {
  const project = projects.find((item) => item._id === id && !item.isDeleted);
  if (!project) return false;
  project.isDeleted = true;
  tasks
    .filter((task) => task.project?._id === id)
    .forEach((task) => {
      task.isDeleted = true;
      task.updatedAt = new Date().toISOString();
    });
  addActivity(project._id, userId, "deleted", "project", project.title);
  return true;
}

export function listDemoTasks({
  project,
  assignedTo,
  status,
  page,
  limit,
  userId = owner.id,
  role = "manager",
}: {
  project?: string | null;
  assignedTo?: string | null;
  status?: string | null;
  page: number;
  limit: number;
  userId?: string;
  role?: Role;
}) {
  let filtered = tasks.filter((task) => {
    if (task.isDeleted) return false;
    if (!task.project) return true;
    return projects.some((project) => project._id === task.project?._id && !project.isDeleted);
  });

  if (role === "employee") filtered = filtered.filter((task) => task.assignedTo.some((user) => user.id === userId));
  if (project) {
    const activeProject = projects.find((item) => item._id === project && !item.isDeleted);
    if (!activeProject) filtered = [];
    else filtered = filtered.filter((task) => task.project?._id === project);
  }
  if (assignedTo) filtered = filtered.filter((task) => task.assignedTo.some((user) => user.id === assignedTo));
  if (status) filtered = filtered.filter((task) => task.status === status);

  return {
    tasks: paginate(filtered, page, limit),
    total: filtered.length,
    page,
    pages: Math.ceil(filtered.length / limit),
  };
}

export function getDemoTask(id: string, userId = owner.id, role: Role = "manager") {
  const task = tasks.find((item) => item._id === id && !item.isDeleted);
  if (!task) return null;
  if (task.project && !projects.some((project) => project._id === task.project?._id && !project.isDeleted)) return null;
  if (role === "employee" && !task.assignedTo.some((user) => user.id === userId)) return null;
  return {
    task,
    comments: comments.filter((comment) => comment.task === id),
    files: files.filter((file) => file.task === id),
  };
}

export function createDemoTask(data: {
  title: string;
  description: string;
  project?: string;
  assignedTo: string[];
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  labels: string[];
  estimatedHours?: number;
  subtasks?: string[];
  createdBy?: string;
}) {
  const project = data.project ? projects.find((item) => item._id === data.project) : undefined;
  const creator = users.find((user) => user.id === data.createdBy) || owner;
  const assignees = users.filter((user) => data.assignedTo.includes(user.id));
  const task: DemoTask = {
    _id: `task-${Date.now()}`,
    title: data.title,
    description: data.description,
    project: project ? pickProject(project) : undefined,
    createdBy: pickActor(creator),
    assignedTo: assignees.map(pickAssignee),
    status: data.status,
    priority: data.priority,
    dueDate: data.dueDate,
    completedAt: data.status === "done" ? new Date().toISOString() : undefined,
    subtasks: (data.subtasks || []).map((title, index) => ({ _id: `sub-${Date.now()}-${index}`, title, isCompleted: false })),
    labels: data.labels,
    estimatedHours: data.estimatedHours,
    loggedHours: 0,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  addActivity(project?._id, creator.id, "created", "task", task.title);
  notify(assignees.map((user) => user.id), creator.id, "task_assigned", `You were assigned "${task.title}"`, `/tasks/${task._id}`);
  return task;
}

export function updateDemoTask(
  id: string,
  updates: Partial<Pick<DemoTask, "title" | "description" | "status" | "priority" | "loggedHours" | "labels">> & {
    dueDate?: string | null;
    estimatedHours?: number | null;
    project?: string | null;
    assignedTo?: string[];
    subtasks?: string[];
  },
  userId: string
) {
  const task = tasks.find((item) => item._id === id && !item.isDeleted);
  if (!task) return null;
  const previousStatus = task.status;
  const { project, assignedTo, subtasks, ...taskUpdates } = updates;

  if (Object.prototype.hasOwnProperty.call(updates, "project")) {
    const selectedProject = project ? projects.find((item) => item._id === project && !item.isDeleted) : undefined;
    task.project = selectedProject ? pickProject(selectedProject) : undefined;
  }

  if (assignedTo) {
    const previousAssigneeIds = new Set(task.assignedTo.map((user) => user.id));
    const assignees = users.filter((user) => assignedTo.includes(user.id) && user.isActive);
    task.assignedTo = assignees.map(pickAssignee);

    const newAssigneeIds = assignees.map((user) => user.id).filter((id) => !previousAssigneeIds.has(id));
    if (newAssigneeIds.length > 0) {
      notify(newAssigneeIds, userId, "task_assigned", `You were assigned "${task.title}"`, `/tasks/${task._id}`);
    }
  }

  if (subtasks) {
    task.subtasks = subtasks.map((title, index) => ({
      _id: `sub-${Date.now()}-${index}`,
      title,
      isCompleted: false,
    }));
  }

  if (taskUpdates.dueDate === null) taskUpdates.dueDate = undefined;
  if (taskUpdates.estimatedHours === null) taskUpdates.estimatedHours = undefined;

  Object.assign(task, taskUpdates, { updatedAt: new Date().toISOString() });
  if (updates.status === "done" && previousStatus !== "done") task.completedAt = new Date().toISOString();
  if (updates.status && updates.status !== "done") task.completedAt = undefined;
  addActivity(task.project?._id, userId, "updated", "task", task.title);
  if (updates.status && updates.status !== previousStatus) {
    const statusLabel = updates.status.replace("_", " ");
    const completed = updates.status === "done";
    notify(
      taskStatusRecipients(task),
      userId,
      completed ? "task_completed" : "task_status_changed",
      completed ? `"${task.title}" was completed` : `"${task.title}" moved to ${statusLabel}`,
      `/tasks/${task._id}`
    );
  }
  return task;
}

export function deleteDemoTask(id: string, userId: string) {
  const task = tasks.find((item) => item._id === id && !item.isDeleted);
  if (!task) return false;
  task.isDeleted = true;
  task.updatedAt = new Date().toISOString();
  addActivity(task.project?._id, userId, "deleted", "task", task.title);
  return true;
}

export function toggleDemoSubtask(taskId: string, subtaskId: string) {
  const task = tasks.find((item) => item._id === taskId && !item.isDeleted);
  const subtask = task?.subtasks.find((item) => item._id === subtaskId);
  if (!task || !subtask) return null;
  subtask.isCompleted = !subtask.isCompleted;
  task.updatedAt = new Date().toISOString();
  return task;
}

export function listDemoFiles(project?: string | null, task?: string | null) {
  return files.filter((file) => (!project || file.project === project) && (!task || file.task === task));
}

export function getDemoFileById(id: string) {
  return files.find((file) => file._id === id);
}

export function createDemoFile(data: { project?: string; task?: string; fileName: string; mimeType: string; size: number; uploadedBy: string; dataUrl?: string }) {
  const uploader = users.find((user) => user.id === data.uploadedBy) || owner;
  const fileType = data.mimeType.startsWith("image/")
    ? "image"
    : data.mimeType.includes("zip") || data.mimeType.includes("archive")
    ? "archive"
    : data.mimeType.includes("pdf") || data.mimeType.includes("document") || data.mimeType.includes("text")
    ? "document"
    : "other";

  const file: DemoFile = {
    _id: `file-${Date.now()}`,
    project: data.project,
    task: data.task,
    uploadedBy: pickActor(uploader),
    fileName: data.fileName,
    fileType,
    mimeType: data.mimeType,
    size: data.size,
    dataUrl: data.dataUrl,
    createdAt: new Date().toISOString(),
  };
  files.unshift(file);
  addActivity(data.project, uploader.id, "uploaded", "file", file.fileName);

  if (data.project) {
    const project = projects.find((item) => item._id === data.project);
    if (project) {
      notify(
        project.members.map((member) => member.id),
        uploader.id,
        "file_uploaded",
        `${uploader.name} uploaded "${file.fileName}" in project "${project.title}"`,
        `/projects/${project._id}`
      );
    }
  }

  if (data.task) {
    const task = tasks.find((item) => item._id === data.task && !item.isDeleted);
    if (task) {
      notify(
        [...task.assignedTo.map((member) => member.id), task.createdBy.id],
        uploader.id,
        "file_uploaded",
        `${uploader.name} uploaded "${file.fileName}" on task "${task.title}"`,
        `/tasks/${task._id}`
      );
    }
  }

  return file;
}

export function listDemoComments(project?: string | null, task?: string | null) {
  return comments.filter((comment) => !comment.isDeleted && (!project || comment.project === project) && (!task || comment.task === task));
}

function replyPreviewFromComment(id?: string) {
  if (!id) return undefined;
  const original = comments.find((comment) => comment._id === id);
  if (!original) return undefined;

  return {
    id: original._id,
    body: original.body,
    authorName: original.author.name,
  };
}

function replyPreviewFromMessage(id?: string, userId?: string, contactId?: string) {
  if (!id || !userId || !contactId) return undefined;
  const original = messages.find((message) => message._id === id && isMessageBetween(message, userId, contactId));
  if (!original) return undefined;

  return {
    id: original._id,
    body: original.body,
    authorName: original.sender.name,
  };
}

function extractMentionIds(body: string, explicitMentions: string[] = []) {
  const bodyLower = body.toLowerCase();
  const ids = new Set(explicitMentions.filter((id) => users.some((user) => user.id === id)));
  const handles = Array.from(body.matchAll(/@([a-z0-9._-]+)/gi)).map((match) => match[1].toLowerCase());

  users.forEach((user) => {
    const firstName = user.name.split(/\s+/)[0]?.toLowerCase();
    const aliases = [
      user.username,
      user.email.split("@")[0],
      user.name,
      firstName,
    ]
      .filter((alias): alias is string => Boolean(alias))
      .map((alias) => alias.toLowerCase());

    const matchedByHandle = handles.some((handle) => aliases.includes(handle));
    const matchedByFullName = aliases.some((alias) => alias.includes(" ") && bodyLower.includes(`@${alias}`));

    if (matchedByHandle || matchedByFullName) ids.add(user.id);
  });

  return Array.from(ids);
}

export function createDemoComment(data: { project?: string; task?: string; authorId: string; body: string; mentions?: string[]; replyTo?: string }) {
  const author = users.find((user) => user.id === data.authorId) || owner;
  const replyTo = replyPreviewFromComment(data.replyTo);
  const taskContext = data.task ? tasks.find((item) => item._id === data.task && !item.isDeleted) : undefined;
  const projectContext = data.project ? projects.find((item) => item._id === data.project && !item.isDeleted) : undefined;
  let mentionIds = extractMentionIds(data.body, data.mentions);
  if (projectContext) {
    const projectMemberIds = new Set(projectContext.members.map((member) => member.id));
    mentionIds = mentionIds.filter((id) => projectMemberIds.has(id));
  }
  const contextLabel = taskContext
    ? `task "${taskContext.title}"`
    : projectContext
    ? `project "${projectContext.title}"`
    : "this item";
  const comment: DemoComment = {
    _id: `comment-${Date.now()}`,
    project: data.project,
    task: data.task,
    author: publicCommentUser(author),
    body: data.body,
    mentions: mentionIds,
    replyTo,
    isEdited: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  comments.unshift(comment);
  addActivity(data.project, author.id, "commented", "comment", data.task || data.project || "Comment");

  const recipients = new Set<string>(mentionIds);

  if (data.project) {
    projectContext?.members.forEach((member) => recipients.add(member.id));
  }

  if (data.task) {
    taskContext?.assignedTo.forEach((member) => recipients.add(member.id));
    if (taskContext?.createdBy?.id) recipients.add(taskContext.createdBy.id);
  }

  const original = data.replyTo ? comments.find((item) => item._id === data.replyTo) : undefined;
  if (original?.author.id) recipients.add(original.author.id);

  notify(
    Array.from(recipients),
    author.id,
    replyTo ? "comment_reply" : "comment_added",
    replyTo ? `${author.name} replied on ${contextLabel}` : `${author.name} commented on ${contextLabel}`,
    data.task ? `/tasks/${data.task}` : `/projects/${data.project}`
  );
  return comment;
}

export function updateDemoComment(id: string, data: { body: string; mentions?: string[] }, userId: string, role: Role = "employee") {
  const comment = comments.find((item) => item._id === id && !item.isDeleted);
  if (!comment) return { comment: null, error: "Comment not found" };
  if (comment.author.id !== userId) return { comment: null, error: "You can only edit your own comments" };

  const projectContext = comment.project ? projects.find((item) => item._id === comment.project && !item.isDeleted) : undefined;
  let mentionIds = extractMentionIds(data.body, data.mentions);
  if (projectContext) {
    const projectMemberIds = new Set(projectContext.members.map((member) => member.id));
    mentionIds = mentionIds.filter((mentionId) => projectMemberIds.has(mentionId));
  }

  comment.body = data.body;
  comment.mentions = mentionIds;
  comment.isEdited = true;
  comment.updatedAt = new Date().toISOString();
  return { comment, error: null };
}

export function deleteDemoComment(id: string, userId: string, role: Role = "employee") {
  const comment = comments.find((item) => item._id === id && !item.isDeleted);
  if (!comment) return { deleted: false, error: "Comment not found" };
  if (comment.author.id !== userId && role !== "manager") return { deleted: false, error: "Not authorized to delete this comment" };

  comment.isDeleted = true;
  comment.updatedAt = new Date().toISOString();
  return { deleted: true, error: null };
}

function isMessageBetween(message: DemoMessage, userId: string, contactId: string) {
  return (
    !message.isDeleted &&
    !message.deletedFor?.includes(userId) &&
    ((message.sender.id === userId && message.recipient.id === contactId) ||
      (message.sender.id === contactId && message.recipient.id === userId))
  );
}

export function listDemoMessageContacts(userId: string) {
  return users
    .filter((user) => user.id !== userId && isApprovedDemoUser(user))
    .map((user) => {
      const thread = messages
        .filter((message) => isMessageBetween(message, userId, user.id))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      const lastMessage = thread[0];
      const unreadCount = thread.filter((message) => message.recipient.id === userId && !message.isRead).length;

      return {
        ...publicMessageUser(user),
        unreadCount,
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.sender.id,
            }
          : null,
      };
    })
    .sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      const aTime = a.lastMessage ? +new Date(a.lastMessage.createdAt) : 0;
      const bTime = b.lastMessage ? +new Date(b.lastMessage.createdAt) : 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });
}

export function listDemoDirectMessages(userId: string, contactId?: string | null) {
  if (!contactId || !users.some((user) => user.id === contactId && isApprovedDemoUser(user))) return [];

  const thread = messages
    .filter((message) => isMessageBetween(message, userId, contactId))
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

  thread.forEach((message) => {
    if (message.recipient.id === userId) message.isRead = true;
  });

  return thread;
}

export function createDemoDirectMessage(data: { senderId: string; recipientId: string; body: string; replyTo?: string }) {
  const sender = users.find((user) => user.id === data.senderId && isApprovedDemoUser(user));
  const recipient = users.find((user) => user.id === data.recipientId && isApprovedDemoUser(user));

  if (!sender || !recipient || sender.id === recipient.id) return null;
  const replyTo = replyPreviewFromMessage(data.replyTo, sender.id, recipient.id);

  const message: DemoMessage = {
    _id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender: publicMessageUser(sender),
    recipient: publicMessageUser(recipient),
    body: data.body,
    replyTo,
    isRead: false,
    isEdited: false,
    isDeleted: false,
    deletedFor: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  messages.push(message);
  notify([recipient.id], sender.id, "direct_message", replyTo ? `${sender.name} replied to your message` : `${sender.name} sent you a message`, "/messages");
  return message;
}

export function updateDemoDirectMessage(id: string, body: string, userId: string) {
  const message = messages.find((item) => item._id === id && !item.isDeleted);
  if (!message) return { message: null, error: "Message not found" };
  if (message.sender.id !== userId) return { message: null, error: "You can only edit your own messages" };

  message.body = body;
  message.isEdited = true;
  message.updatedAt = new Date().toISOString();
  return { message, error: null };
}

export function deleteDemoDirectMessage(id: string, userId: string, role: Role = "employee") {
  const message = messages.find((item) => item._id === id && !item.isDeleted);
  if (!message) return { deleted: false, error: "Message not found" };
  if (message.sender.id !== userId && role !== "manager") return { deleted: false, error: "Not authorized to delete this message" };

  message.isDeleted = true;
  message.updatedAt = new Date().toISOString();
  return { deleted: true, error: null };
}

export function deleteDemoDirectMessageThread(userId: string, contactId?: string | null) {
  if (!contactId || !users.some((user) => user.id === contactId && isApprovedDemoUser(user))) return { deleted: false, error: "Contact not found" };

  messages.forEach((message) => {
    if (isMessageBetween(message, userId, contactId)) {
      message.deletedFor = Array.from(new Set([...(message.deletedFor || []), userId]));
      if (message.deletedFor.includes(message.sender.id) && message.deletedFor.includes(message.recipient.id)) {
        message.isDeleted = true;
      }
      message.updatedAt = new Date().toISOString();
    }
  });

  return { deleted: true, error: null };
}

export function listDemoNotifications(userId: string) {
  const userNotifications = notifications
    .filter((notification) => notification.recipient === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return {
    notifications: userNotifications,
    unreadCount: userNotifications.filter((notification) => !notification.isRead).length,
  };
}

export function markDemoNotificationsRead(userId: string, id?: string) {
  notifications.forEach((notification) => {
    const shouldMark = notification.recipient === userId && (!id || notification._id === id);
    if (shouldMark) notification.isRead = true;
  });

  return id ? notifications.find((notification) => notification._id === id) : null;
}

export function markDemoNotificationsReadByLink(userId: string, link: string) {
  notifications.forEach((notification) => {
    if (notification.recipient === userId && notification.link === link) {
      notification.isRead = true;
    }
  });
}

export function getDemoStats(userId = employee.id, role: Role = "employee") {
  const visibleProjects = listDemoProjects({ page: 1, limit: 100, userId, role }).projects;
  const visibleTasks = listDemoTasks({ page: 1, limit: 100, userId, role }).tasks;
  const openTasks = visibleTasks.filter((task) => task.status !== "done");
  const projectTasks = openTasks.filter((task) => task.project);
  const standaloneTasks = openTasks.filter((task) => !task.project);

  return {
    totalProjects: visibleProjects.length,
    activeProjects: visibleProjects.filter((project) => project.status === "active").length,
    myTasks: openTasks.length,
    projectTasks: projectTasks.length,
    standaloneTaskTotal: standaloneTasks.length,
    overdueTasks: visibleTasks.filter(
      (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done"
    ).length,
    recentProjects: visibleProjects.slice(0, 4),
    standaloneTasks: standaloneTasks.slice(0, 5),
    upcomingTasks: visibleTasks
      .filter((task) => task.dueDate && task.status !== "done")
      .sort((a, b) => +new Date(a.dueDate || 0) - +new Date(b.dueDate || 0))
      .slice(0, 5),
    activity: activity.slice(0, 8),
  };
}

export function getDemoManagementStats() {
  return {
    users: users.length,
    managers: users.filter((user) => user.role === "manager").length,
    employees: users.filter((user) => user.role === "employee").length,
    projects: projects.filter((project) => !project.isDeleted).length,
    activeProjects: projects.filter((project) => project.status === "active" && !project.isDeleted).length,
    openTasks: tasks.filter((task) => task.status !== "done" && !task.isDeleted).length,
    completedTasks: tasks.filter((task) => task.status === "done" && !task.isDeleted).length,
  };
}
