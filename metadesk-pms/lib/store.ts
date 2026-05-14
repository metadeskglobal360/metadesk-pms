import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";
import { ActivityLog, Comment, Department, File, Message, Notification } from "@/models";
import connectDB from "@/lib/db";
import { DEFAULT_DEPARTMENTS, normalizeDepartmentName, slugifyDepartment, sortDepartmentNames } from "@/lib/departments";
import * as demo from "@/lib/demo-store";

type Role = "manager" | "employee";
type ApprovalStatus = "pending" | "approved" | "declined";
type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived";
type Priority = "low" | "medium" | "high" | "critical";
type TaskStatus = "todo" | "in_progress" | "review" | "done";

const day = 24 * 60 * 60 * 1000;
const DEMO_PASSWORD = "password123";
const OTP_TTL_MS = 10 * 60 * 1000;

function shouldUseMongo() {
  return process.env.METADESK_STORE !== "demo";
}

function objectId(id?: string | null) {
  return id && mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function docId(doc: any) {
  return String(doc?._id || doc?.id || doc || "");
}

function iso(value?: Date | string | null) {
  return value ? new Date(value).toISOString() : undefined;
}

function normalizeRole(role: unknown): Role {
  return role === "manager" || role === "owner" ? "manager" : "employee";
}

function approvalStatus(user: any): ApprovalStatus {
  if (user?.approvalStatus === "pending" || user?.approvalStatus === "declined") return user.approvalStatus;
  return "approved";
}

function approvedUserQuery(extra: Record<string, unknown> = {}) {
  return {
    ...extra,
    isActive: true,
    $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }],
  };
}

function publicUser(user: any) {
  if (!user) return null;
  return {
    id: docId(user),
    name: user.name,
    username: user.username,
    email: user.email,
    role: normalizeRole(user.role),
    team: user.team,
    designation: user.designation,
    avatar: user.avatar || "",
    isActive: user.isActive !== false,
    emailVerified: user.emailVerified !== false,
    approvalStatus: approvalStatus(user),
    approvedAt: iso(user.approvedAt),
    declinedAt: iso(user.declinedAt),
    notificationPrefs: user.notificationPrefs,
    createdAt: iso(user.createdAt),
    updatedAt: iso(user.updatedAt),
  };
}

function actor(user: any) {
  return {
    id: docId(user),
    name: user?.name || "Unknown user",
    avatar: user?.avatar || "",
  };
}

function assignee(user: any) {
  return {
    id: docId(user),
    name: user?.name || "Unknown user",
    avatar: user?.avatar || "",
    designation: user?.designation || "",
    team: user?.team || "",
  };
}

function commentUser(user: any) {
  return {
    id: docId(user),
    name: user?.name || "Unknown user",
    avatar: user?.avatar || "",
    designation: user?.designation || "",
  };
}

function messageUser(user: any) {
  return {
    id: docId(user),
    name: user?.name || "Unknown user",
    avatar: user?.avatar || "",
    email: user?.email || "",
    designation: user?.designation || "",
    team: user?.team || "",
    role: normalizeRole(user?.role),
  };
}

function mapProject(project: any, progress = project?.progress || 0) {
  return {
    _id: docId(project),
    title: project.title,
    description: project.description || "",
    owner: publicUser(project.owner),
    members: (project.members || []).map(publicUser).filter(Boolean),
    status: project.status,
    priority: project.priority,
    startDate: iso(project.startDate),
    deadline: iso(project.deadline),
    completedAt: iso(project.completedAt),
    progress,
    tags: project.tags || [],
    coverColor: project.coverColor || "#3c78f0",
    isDeleted: Boolean(project.isDeleted),
    createdAt: iso(project.createdAt),
    updatedAt: iso(project.updatedAt),
  };
}

function mapProjectPreview(project: any) {
  if (!project) return undefined;
  return {
    _id: docId(project),
    title: project.title,
    coverColor: project.coverColor || "#3c78f0",
  };
}

function mapTask(task: any) {
  return {
    _id: docId(task),
    title: task.title,
    description: task.description || "",
    project: mapProjectPreview(task.project),
    createdBy: actor(task.createdBy),
    assignedTo: (task.assignedTo || []).map(assignee),
    status: task.status,
    priority: task.priority,
    dueDate: iso(task.dueDate),
    completedAt: iso(task.completedAt),
    subtasks: (task.subtasks || []).map((subtask: any) => ({
      _id: docId(subtask),
      title: subtask.title,
      isCompleted: Boolean(subtask.isCompleted),
    })),
    labels: task.labels || [],
    estimatedHours: task.estimatedHours,
    loggedHours: task.loggedHours || 0,
    isDeleted: Boolean(task.isDeleted),
    createdAt: iso(task.createdAt),
    updatedAt: iso(task.updatedAt),
  };
}

function mapFile(file: any) {
  return {
    _id: docId(file),
    project: file.project ? docId(file.project) : undefined,
    task: file.task ? docId(file.task) : undefined,
    uploadedBy: actor(file.uploadedBy),
    fileName: file.fileName,
    fileType: file.fileType,
    mimeType: file.mimeType,
    size: file.size,
    dataUrl: file.dataUrl,
    createdAt: iso(file.createdAt),
  };
}

function mapComment(comment: any) {
  return {
    _id: docId(comment),
    project: comment.project ? docId(comment.project) : undefined,
    task: comment.task ? docId(comment.task) : undefined,
    author: commentUser(comment.author),
    body: comment.body,
    mentions: (comment.mentions || []).map(docId),
    replyTo: comment.replyTo,
    isEdited: Boolean(comment.isEdited),
    isDeleted: Boolean(comment.isDeleted),
    createdAt: iso(comment.createdAt),
    updatedAt: iso(comment.updatedAt),
  };
}

function mapNotification(notification: any) {
  return {
    _id: docId(notification),
    recipient: docId(notification.recipient),
    sender: notification.sender ? actor(notification.sender) : undefined,
    type: notification.type,
    message: notification.message,
    link: notification.link,
    isRead: Boolean(notification.isRead),
    createdAt: iso(notification.createdAt),
  };
}

function mapMessage(message: any) {
  return {
    _id: docId(message),
    sender: messageUser(message.sender),
    recipient: messageUser(message.recipient),
    body: message.body,
    replyTo: message.replyTo,
    isRead: Boolean(message.isRead),
    isEdited: Boolean(message.isEdited),
    isDeleted: Boolean(message.isDeleted),
    createdAt: iso(message.createdAt),
    updatedAt: iso(message.updatedAt),
  };
}

function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

async function projectProgress(projectId: string, fallback = 0) {
  const total = await Task.countDocuments({ project: projectId, isDeleted: { $ne: true } });
  if (!total) return fallback;
  const done = await Task.countDocuments({ project: projectId, status: "done", isDeleted: { $ne: true } });
  return Math.round((done / total) * 100);
}

async function populateProject(project: any) {
  return Project.findById(docId(project)).populate("owner members").lean();
}

async function populateTask(task: any) {
  return Task.findById(docId(task)).populate("project createdBy assignedTo").lean();
}

async function notifyMongo(recipients: string[], senderId: string, type: string, message: string, link: string) {
  const sender = objectId(senderId);
  const uniqueRecipients = Array.from(new Set(recipients))
    .filter((id) => id !== senderId)
    .map(objectId)
    .filter(Boolean) as mongoose.Types.ObjectId[];

  if (uniqueRecipients.length === 0) return;

  const activeUsers = await User.find(approvedUserQuery({ _id: { $in: uniqueRecipients } })).select("_id").lean();
  const docs = activeUsers.map((user: any) => ({
    recipient: user._id,
    sender,
    type,
    message,
    link,
    isRead: false,
  }));

  if (docs.length) await Notification.insertMany(docs);
}

async function addActivityMongo(project: string | undefined, userId: string, action: string, targetType: string, targetTitle: string, targetId?: string) {
  const userObjectId = objectId(userId);
  if (!userObjectId) return;

  await ActivityLog.create({
    project: objectId(project),
    user: userObjectId,
    action,
    targetType,
    targetId: objectId(targetId) || new mongoose.Types.ObjectId(),
    targetTitle,
  });
}

async function taskStatusRecipientsMongo(task: any) {
  const recipients = new Set<string>();
  (task.assignedTo || []).forEach((user: any) => recipients.add(docId(user)));
  if (task.createdBy) recipients.add(docId(task.createdBy));

  if (task.project) {
    const project = await Project.findById(docId(task.project)).populate("owner members").lean();
    if (project) {
      recipients.add(docId((project as any).owner));
      ((project as any).members || []).forEach((member: any) => {
        if (normalizeRole(member.role) === "manager") recipients.add(docId(member));
      });
    }
  }

  return Array.from(recipients);
}

async function ensureDefaultDepartments() {
  await connectDB();
  await Department.bulkWrite(
    DEFAULT_DEPARTMENTS.map((name) => ({
      updateOne: {
        filter: { slug: slugifyDepartment(name) },
        update: { $setOnInsert: { name, slug: slugifyDepartment(name) } },
        upsert: true,
      },
    })),
    { ordered: false }
  ).catch(() => null);
}

let seedPromise: Promise<void> | null = null;

async function ensureMongoSeed() {
  if (!shouldUseMongo()) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    await connectDB();
    if (process.env.NODE_ENV === "production") return;
    if (process.env.METADESK_SEED_DEMO !== "true") return;

    const existing = await User.countDocuments();
    if (existing > 0) return;

    const now = new Date();
    const users = await User.create([
      { name: "Demo Manager", username: "manager", email: "manager@metadeskglobal.com", password: DEMO_PASSWORD, role: "manager", team: "Management", designation: "Workspace Manager" },
      { name: "Sara Khan", username: "sara", email: "sara@metadeskglobal.com", password: DEMO_PASSWORD, role: "manager", team: "Engineering", designation: "Project Manager" },
      { name: "Ali Hassan", username: "ali", email: "ali@metadeskglobal.com", password: DEMO_PASSWORD, role: "employee", team: "Engineering", designation: "Frontend Developer" },
      { name: "Maham Raza", username: "maham", email: "maham@metadeskglobal.com", password: DEMO_PASSWORD, role: "employee", team: "Design", designation: "Product Designer" },
      { name: "Hamza Noor", username: "hamza", email: "hamza@metadeskglobal.com", password: DEMO_PASSWORD, role: "employee", team: "Operations", designation: "Operations Coordinator" },
    ]);

    const [managerOwner, sara, ali, maham, hamza] = users;
    const projects = await Project.create([
      {
        title: "Metadesk Website Refresh",
        description: "Refresh the public website with updated service pages, faster loading, and a cleaner lead flow.",
        owner: sara._id,
        members: [sara._id, ali._id, maham._id],
        status: "active",
        priority: "high",
        startDate: new Date(now.getTime() - 14 * day),
        deadline: new Date(now.getTime() + 18 * day),
        tags: ["website", "marketing"],
        coverColor: "#2563eb",
      },
      {
        title: "Client Portal MVP",
        description: "Build the first pass of the client portal for task visibility, approvals, and document sharing.",
        owner: managerOwner._id,
        members: [managerOwner._id, sara._id, ali._id, maham._id],
        status: "planning",
        priority: "critical",
        startDate: new Date(now.getTime() - 3 * day),
        deadline: new Date(now.getTime() + 2 * day),
        tags: ["portal", "mvp"],
        coverColor: "#00a8ff",
      },
      {
        title: "Operations Automation",
        description: "Internal workflows for weekly reporting, reminders, and handoff checklists.",
        owner: sara._id,
        members: [sara._id, hamza._id],
        status: "completed",
        priority: "medium",
        startDate: new Date(now.getTime() - 60 * day),
        deadline: new Date(now.getTime() - 4 * day),
        tags: ["internal", "automation"],
        coverColor: "#00c389",
      },
    ]);

    await Task.create([
      {
        title: "Finalize dashboard wireframes",
        description: "Lock the dashboard structure before implementation.",
        project: projects[1]._id,
        createdBy: sara._id,
        assignedTo: [ali._id, maham._id],
        status: "review",
        priority: "high",
        dueDate: new Date(now.getTime() + 2 * day),
        subtasks: [{ title: "Map dashboard states", isCompleted: true }, { title: "Prepare manager view", isCompleted: false }],
        labels: ["design", "dashboard"],
        estimatedHours: 6,
        loggedHours: 4,
      },
      {
        title: "Review authentication flow",
        description: "Check login, registration, roles, and protected routes.",
        project: projects[1]._id,
        createdBy: managerOwner._id,
        assignedTo: [ali._id, sara._id],
        status: "in_progress",
        priority: "critical",
        dueDate: new Date(now.getTime() + day),
        subtasks: [{ title: "Check role redirects", isCompleted: true }, { title: "Verify inactive users cannot sign in", isCompleted: false }],
        labels: ["auth"],
        estimatedHours: 8,
        loggedHours: 3,
      },
      {
        title: "Prepare services page copy",
        description: "Write concise content for embedded, AI, web, and support services.",
        project: projects[0]._id,
        createdBy: sara._id,
        assignedTo: [ali._id],
        status: "todo",
        priority: "medium",
        dueDate: new Date(now.getTime() + 7 * day),
        labels: ["content"],
        estimatedHours: 5,
      },
      {
        title: "Ship weekly reporting automation",
        description: "Finish the operations summary workflow.",
        project: projects[2]._id,
        createdBy: sara._id,
        assignedTo: [hamza._id],
        status: "done",
        priority: "low",
        dueDate: new Date(now.getTime() - 5 * day),
        completedAt: new Date(now.getTime() - 4 * day),
        subtasks: [{ title: "QA generated report", isCompleted: true }],
        labels: ["ops"],
        estimatedHours: 4,
        loggedHours: 4,
      },
    ]);

    await Message.create([
      {
        sender: sara._id,
        recipient: ali._id,
        body: "Please send me a quick update on the auth checks when you get a chance.",
        isRead: false,
        createdAt: new Date(now.getTime() - 90 * 60 * 1000),
      },
      {
        sender: ali._id,
        recipient: sara._id,
        body: "Sure. Redirects are done, and I am checking inactive user access now.",
        isRead: true,
        createdAt: new Date(now.getTime() - 65 * 60 * 1000),
      },
    ]);
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });

  return seedPromise;
}

export async function authenticateUser(email: string, password: string) {
  if (!shouldUseMongo()) {
    const user = demo.findDemoUserByEmail(email);
    if (!user || !user.isActive || user.emailVerified === false || user.approvalStatus === "pending" || user.approvalStatus === "declined" || !demo.verifyDemoPassword(user.password, password)) return null;
    return publicUser(user);
  }

  await ensureMongoSeed();
  const normalizedEmail = email.toLowerCase() === "owner@metadeskglobal.com" ? "manager@metadeskglobal.com" : email.toLowerCase();
  const user = await User.findOne({
    email: normalizedEmail,
    isActive: true,
    emailVerified: { $ne: false },
    $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }],
  }).select("+password");
  if (!user) return null;
  const valid = await user.comparePassword(password);
  return valid ? publicUser(user) : null;
}

export async function findUserByEmail(email: string) {
  if (!shouldUseMongo()) return demo.findDemoUserByEmail(email);
  await ensureMongoSeed();
  const normalizedEmail = email.toLowerCase() === "owner@metadeskglobal.com" ? "manager@metadeskglobal.com" : email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  return user ? publicUser(user) : null;
}

export async function listUsers() {
  if (!shouldUseMongo()) return demo.listDemoUsers();
  await ensureMongoSeed();
  const users = await User.find().sort({ team: 1, name: 1 }).lean();
  const projects = await Project.find({}).lean();
  const activeProjectIds = new Set(projects.map((project: any) => docId(project)));
  const tasks = (await Task.find({ isDeleted: { $ne: true } }).lean()).filter(
    (task: any) => !task.project || activeProjectIds.has(docId(task.project))
  );

  return users.map((user: any) => {
    const id = docId(user);
    const assignedProjects = projects.filter((project: any) => docId(project.owner) === id || (project.members || []).some((member: any) => docId(member) === id));
    const assignedTasks = tasks.filter((task: any) => (task.assignedTo || []).some((member: any) => docId(member) === id));
    return {
      ...publicUser(user),
      projectCount: assignedProjects.length,
      taskCount: assignedTasks.length,
      openTaskCount: assignedTasks.filter((task: any) => task.status !== "done").length,
      standaloneTaskCount: assignedTasks.filter((task: any) => !task.project).length,
    };
  });
}

export async function listDepartments() {
  if (!shouldUseMongo()) return demo.listDemoDepartments();
  await ensureMongoSeed();
  await ensureDefaultDepartments();
  const [departments, userTeams] = await Promise.all([
    Department.find().select("name").lean(),
    User.distinct("team"),
  ]);
  return sortDepartmentNames([
    ...DEFAULT_DEPARTMENTS,
    ...departments.map((department: any) => department.name),
    ...userTeams.filter(Boolean),
  ]);
}

export async function deactivateUser(id: string, active: boolean) {
  if (!shouldUseMongo()) return demo.deactivateDemoUser(id, active);
  await ensureMongoSeed();
  const user = await User.findByIdAndUpdate(id, { isActive: active }, { new: true }).lean();
  return user ? publicUser(user) : null;
}

export async function updateUserApproval(id: string, status: ApprovalStatus, managerId?: string) {
  if (!shouldUseMongo()) return demo.updateDemoUserApproval(id, status);
  await ensureMongoSeed();

  const updates: any = {
    approvalStatus: status,
    emailVerified: true,
  };

  if (status === "approved") {
    updates.isActive = true;
    updates.approvedAt = new Date();
    updates.declinedAt = undefined;
    if (objectId(managerId)) updates.approvedBy = objectId(managerId);
  }

  if (status === "declined") {
    updates.isActive = false;
    updates.declinedAt = new Date();
  }

  const user = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
  return user ? publicUser(user) : null;
}

export async function deleteUser(id: string, managerId: string) {
  if (!shouldUseMongo()) return demo.deleteDemoUser(id, managerId);
  await ensureMongoSeed();
  const userId = objectId(id);
  const replacementId = objectId(managerId);
  if (!userId || !replacementId || id === managerId) return false;

  const [user, replacement] = await Promise.all([
    User.findById(userId).lean(),
    User.findOne({ _id: replacementId, role: "manager", isActive: true }).lean(),
  ]);
  if (!user || !replacement) return false;

  await Promise.all([
    Project.updateMany({ members: userId }, { $pull: { members: userId } }),
    Project.updateMany({ owner: userId }, { $set: { owner: replacementId }, $addToSet: { members: replacementId } }),
    Task.updateMany({ assignedTo: userId }, { $pull: { assignedTo: userId } }),
    Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),
    Notification.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),
    User.deleteOne({ _id: userId }),
  ]);

  return true;
}

export async function deletePendingUserByEmail(email: string) {
  if (!shouldUseMongo()) return demo.deletePendingDemoUserByEmail(email);
  await ensureMongoSeed();
  const result = await User.deleteOne({
    email: email.toLowerCase(),
    $or: [{ emailVerified: false }, { approvalStatus: "pending" }],
  });
  return result.deletedCount > 0;
}

export async function updateUserRole(id: string, role: Role) {
  if (!shouldUseMongo()) return demo.updateDemoUserRole(id, role);
  await ensureMongoSeed();
  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).lean();
  return user ? publicUser(user) : null;
}

export async function updateUserTeam(id: string, team: string) {
  if (!shouldUseMongo()) return demo.updateDemoUserTeam(id, team);
  await ensureMongoSeed();
  const name = normalizeDepartmentName(team);
  if (!name) return null;
  await createDepartment(name);
  const user = await User.findByIdAndUpdate(id, { team: name }, { new: true }).lean();
  return user ? publicUser(user) : null;
}

export async function createDepartment(name: string) {
  if (!shouldUseMongo()) return demo.createDemoDepartment(name);
  await ensureMongoSeed();
  const normalized = normalizeDepartmentName(name);
  const slug = slugifyDepartment(normalized);
  if (!normalized || !slug) return null;
  const department = await Department.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name: normalized, slug } },
    { upsert: true, new: true }
  ).lean();
  return department ? { name: (department as any).name } : null;
}

export async function updateUserAvatar(id: string, avatar: string) {
  if (!shouldUseMongo()) return demo.updateDemoUserAvatar(id, avatar);
  await ensureMongoSeed();
  const user = await User.findByIdAndUpdate(id, { avatar }, { new: true }).lean();
  return user ? publicUser(user) : null;
}

export async function getUserAvatarData(id: string) {
  if (!shouldUseMongo()) return demo.getDemoUserAvatarData(id);
  await ensureMongoSeed();
  const user = await User.findById(id).select("avatar").lean();
  return typeof user?.avatar === "string" && user.avatar.startsWith("data:") ? user.avatar : null;
}

export async function updateUserPassword(id: string, currentPassword: string, nextPassword: string) {
  if (!shouldUseMongo()) return demo.updateDemoUserPassword(id, currentPassword, nextPassword);
  await ensureMongoSeed();
  const user = await User.findById(id).select("+password");
  if (!user) return { user: null, error: "User not found" };
  const valid = await user.comparePassword(currentPassword);
  if (!valid) return { user: null, error: "Current password is incorrect" };
  user.password = nextPassword;
  await user.save();
  return { user: publicUser(user), error: null };
}

export async function createUser(data: any) {
  if (!shouldUseMongo()) return demo.createDemoUser(data);
  await ensureMongoSeed();
  const exists = await User.findOne({
    $or: [{ email: data.email.toLowerCase() }, { username: data.username.toLowerCase() }],
  }).lean();
  if (exists) return { user: null, error: (exists as any).email === data.email.toLowerCase() ? "Email" : "Username" };
  const hasUsers = await User.exists({});
  const isFirstUser = !hasUsers;
  const { verificationOtp, ...userData } = data;
  const otpHash = verificationOtp ? await bcrypt.hash(String(verificationOtp), 10) : "";
  const now = new Date();
  const user = await User.create({
    ...userData,
    role: isFirstUser ? "manager" : data.role || "employee",
    approvalStatus: isFirstUser ? "approved" : data.approvalStatus || "pending",
    approvedAt: isFirstUser ? now : undefined,
    emailVerified: true,
    verificationOtpHash: otpHash,
    verificationOtpExpiresAt: verificationOtp ? new Date(now.getTime() + OTP_TTL_MS) : undefined,
    verificationOtpLastSentAt: verificationOtp ? now : undefined,
  });

  if (!isFirstUser && approvalStatus(user) === "pending") {
    const managers = await User.find(approvedUserQuery({ role: "manager" })).select("_id").lean();
    if (managers.length > 0) {
      await Notification.create(
        managers.map((manager: any) => ({
          recipient: manager._id,
          type: "account_request",
          message: `${user.name} requested access to Metadesk PMS`,
          link: "/team",
          isRead: false,
        }))
      );
    }
  }

  return { user: publicUser(user), error: null };
}

export async function issueUserVerificationOtp(email: string, verificationOtp: string) {
  if (!shouldUseMongo()) return demo.issueDemoUserVerificationOtp(email, verificationOtp);
  await ensureMongoSeed();
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+verificationOtpHash +verificationOtpExpiresAt +verificationOtpLastSentAt");
  if (!user) return { user: null, error: "Account not found" };
  if (user.emailVerified !== false) return { user: publicUser(user), error: "Account is already verified" };

  const now = new Date();
  const otpHash = await bcrypt.hash(String(verificationOtp), 10);
  user.verificationOtpHash = otpHash;
  user.verificationOtpExpiresAt = new Date(now.getTime() + OTP_TTL_MS);
  user.verificationOtpLastSentAt = now;
  await user.save();

  return { user: publicUser(user), error: null };
}

export async function verifyUserEmailOtp(email: string, verificationOtp: string) {
  if (!shouldUseMongo()) return demo.verifyDemoUserEmailOtp(email, verificationOtp);
  await ensureMongoSeed();
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+verificationOtpHash +verificationOtpExpiresAt");
  if (!user) return { user: null, error: "Invalid verification code" };
  if (user.emailVerified !== false) return { user: publicUser(user), error: null };
  if (!user.verificationOtpHash || !user.verificationOtpExpiresAt) {
    return { user: null, error: "Verification code expired. Please resend a new code." };
  }
  if (user.verificationOtpExpiresAt.getTime() < Date.now()) {
    return { user: null, error: "Verification code expired. Please resend a new code." };
  }

  const valid = await bcrypt.compare(String(verificationOtp), user.verificationOtpHash);
  if (!valid) return { user: null, error: "Invalid verification code" };

  user.emailVerified = true;
  user.verificationOtpHash = "";
  user.verificationOtpExpiresAt = undefined;
  user.verificationOtpLastSentAt = undefined;
  await user.save();

  return { user: publicUser(user), error: null };
}

export async function listProjects({ status, page, limit, userId, role = "manager" }: any) {
  if (!shouldUseMongo()) return demo.listDemoProjects({ status, page, limit, userId, role });
  await ensureMongoSeed();
  const query: any = {};
  if (status) query.status = status;
  if (normalizeRole(role) === "employee") {
    const id = objectId(userId);
    if (!id) return { projects: [], total: 0, page, pages: 0 };
    query.$or = [{ owner: id }, { members: id }];
  }
  const rows = await Project.find(query).populate("owner members").sort({ updatedAt: -1 }).lean();
  const mapped = await Promise.all(rows.map(async (project: any) => mapProject(project, await projectProgress(docId(project), project.progress || 0))));
  return { projects: paginate(mapped, page, limit), total: mapped.length, page, pages: Math.ceil(mapped.length / limit) };
}

export async function getProject(id: string, userId?: string, role: Role = "manager") {
  if (!shouldUseMongo()) return demo.getDemoProject(id, userId, role);
  await ensureMongoSeed();
  if (!objectId(id)) return null;
  const project = await Project.findById(id).populate("owner members").lean();
  if (!project) return null;
  const mappedProject = mapProject(project, await projectProgress(id, (project as any).progress || 0));
  const canSee = role === "manager" || mappedProject.owner?.id === userId || mappedProject.members.some((member: any) => member.id === userId);
  if (!canSee) return null;
  const [tasks, files, comments, activity] = await Promise.all([
    Task.find({ project: id, isDeleted: { $ne: true } }).populate("project createdBy assignedTo").sort({ createdAt: -1 }).lean(),
    File.find({ project: id, isDeleted: { $ne: true } }).populate("uploadedBy").sort({ createdAt: -1 }).lean(),
    Comment.find({ project: id, isDeleted: { $ne: true } }).populate("author").sort({ createdAt: -1 }).lean(),
    ActivityLog.find({ project: id }).populate("user").sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  return {
    project: mappedProject,
    tasks: tasks.map(mapTask),
    files: files.map(mapFile),
    comments: comments.map(mapComment),
    activity: activity.map((item: any) => ({ _id: docId(item), project: docId(item.project), user: actor(item.user), action: item.action, targetType: item.targetType, targetTitle: item.targetTitle, createdAt: iso(item.createdAt) })),
  };
}

export async function createProject(data: any) {
  if (!shouldUseMongo()) return demo.createDemoProject(data);
  await ensureMongoSeed();
  const ownerId = objectId(data.ownerId);
  const projectOwner = ownerId ? await User.findById(ownerId) : await User.findOne({ role: "manager" });
  if (!projectOwner) return null;
  const memberObjectIds = (data.memberIds || []).map(objectId).filter(Boolean);
  const uniqueMembers = Array.from(new Set([docId(projectOwner), ...memberObjectIds.map(String)])).map((id) => new mongoose.Types.ObjectId(id));
  const project = await Project.create({ ...data, owner: projectOwner._id, members: uniqueMembers, startDate: new Date(data.startDate), deadline: new Date(data.deadline) });
  await addActivityMongo(docId(project), docId(projectOwner), "created", "project", project.title, docId(project));
  await notifyMongo(uniqueMembers.map(String), docId(projectOwner), "project_assigned", `You were added to project "${project.title}"`, `/projects/${docId(project)}`);
  return mapProject(await populateProject(project));
}

export async function updateProject(id: string, updates: any, userId: string) {
  if (!shouldUseMongo()) return demo.updateDemoProject(id, updates, userId);
  await ensureMongoSeed();
  const project = await Project.findById(id);
  if (!project) return null;
  const { memberIds, ...rest } = updates;
  Object.assign(project, rest);
  if (updates.deadline) project.deadline = new Date(updates.deadline);
  if (memberIds) project.members = memberIds.map(objectId).filter(Boolean);
  await project.save();
  await addActivityMongo(id, userId, "updated", "project", project.title, id);
  await notifyMongo(project.members.map(String), userId, "project_update", `Project "${project.title}" was updated`, `/projects/${id}`);
  const populated = await populateProject(project);
  return mapProject(populated, await projectProgress(id, project.progress));
}

export async function deleteProject(id: string, userId: string) {
  if (!shouldUseMongo()) return demo.deleteDemoProject(id, userId);
  await ensureMongoSeed();
  const projectId = objectId(id);
  if (!projectId) return false;

  const project = await Project.findById(projectId).lean();
  if (!project) return false;

  const taskIds = (await Task.find({ project: projectId }).select("_id").lean()).map((task: any) => task._id);
  const taskLinks = taskIds.map((taskId: any) => `/tasks/${docId(taskId)}`);

  await Promise.all([
    Project.deleteOne({ _id: projectId }),
    Task.deleteMany({ project: projectId }),
    File.deleteMany({ $or: [{ project: projectId }, { task: { $in: taskIds } }] }),
    Comment.deleteMany({ $or: [{ project: projectId }, { task: { $in: taskIds } }] }),
    Notification.deleteMany({ link: { $in: [`/projects/${id}`, ...taskLinks] } }),
    ActivityLog.deleteMany({ $or: [{ project: projectId }, { targetId: projectId }, { targetId: { $in: taskIds } }] }),
  ]);
  return true;
}

export async function listTasks({ project, assignedTo, status, page, limit, userId, role = "manager" }: any) {
  if (!shouldUseMongo()) return demo.listDemoTasks({ project, assignedTo, status, page, limit, userId, role });
  await ensureMongoSeed();
  const query: any = { isDeleted: { $ne: true } };
  if (project) {
    const projectId = objectId(project);
    if (!projectId) return { tasks: [], total: 0, page, pages: 0 };
    const activeProject = await Project.findById(projectId).select("_id").lean();
    if (!activeProject) return { tasks: [], total: 0, page, pages: 0 };
    query.project = projectId;
  } else {
    const activeProjectIds = (await Project.find().select("_id").lean()).map((item: any) => item._id);
    query.$or = [{ project: { $exists: false } }, { project: null }, { project: { $in: activeProjectIds } }];
  }
  if (assignedTo) query.assignedTo = objectId(assignedTo);
  if (status) query.status = status;
  if (normalizeRole(role) === "employee") {
    const id = objectId(userId);
    if (!id) return { tasks: [], total: 0, page, pages: 0 };
    query.assignedTo = id;
  }
  const rows = await Task.find(query).populate("project createdBy assignedTo").sort({ dueDate: 1, createdAt: -1 }).lean();
  const mapped = rows.map(mapTask);
  return { tasks: paginate(mapped, page, limit), total: mapped.length, page, pages: Math.ceil(mapped.length / limit) };
}

export async function getTask(id: string, userId?: string, role: Role = "manager") {
  if (!shouldUseMongo()) return demo.getDemoTask(id, userId, role);
  await ensureMongoSeed();
  if (!objectId(id)) return null;
  const rawTask = await Task.findById(id).select("project isDeleted").lean();
  if (!rawTask || (rawTask as any).isDeleted) return null;
  if ((rawTask as any).project) {
    const activeProject = await Project.findById((rawTask as any).project).select("_id").lean();
    if (!activeProject) return null;
  }
  const task = await Task.findById(id).populate("project createdBy assignedTo").lean();
  if (!task || (task as any).isDeleted) return null;
  const mappedTask = mapTask(task);
  if (role === "employee" && !mappedTask.assignedTo.some((user: any) => user.id === userId)) return null;
  const [comments, files] = await Promise.all([
    Comment.find({ task: id, isDeleted: { $ne: true } }).populate("author").sort({ createdAt: -1 }).lean(),
    File.find({ task: id, isDeleted: { $ne: true } }).populate("uploadedBy").sort({ createdAt: -1 }).lean(),
  ]);
  return { task: mappedTask, comments: comments.map(mapComment), files: files.map(mapFile) };
}

export async function createTask(data: any) {
  if (!shouldUseMongo()) return demo.createDemoTask(data);
  await ensureMongoSeed();
  const creator = objectId(data.createdBy) ? await User.findById(data.createdBy) : await User.findOne({ role: "manager" });
  if (!creator) return null;
  const task = await Task.create({
    ...data,
    project: objectId(data.project),
    createdBy: creator._id,
    assignedTo: (data.assignedTo || []).map(objectId).filter(Boolean),
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    subtasks: (data.subtasks || []).map((title: string) => ({ title, isCompleted: false })),
  });
  await addActivityMongo(data.project, docId(creator), "created", "task", task.title, docId(task));
  await notifyMongo((task.assignedTo || []).map(String), docId(creator), "task_assigned", `You were assigned "${task.title}"`, `/tasks/${docId(task)}`);
  return mapTask(await populateTask(task));
}

export async function updateTask(id: string, updates: any, userId: string) {
  if (!shouldUseMongo()) return demo.updateDemoTask(id, updates, userId);
  await ensureMongoSeed();
  const task = await Task.findById(id).populate("project createdBy assignedTo");
  if (!task || task.isDeleted) return null;
  const previousStatus = task.status;
  const previousAssigneeIds = new Set((task.assignedTo || []).map((user: any) => docId(user)));
  const { project, assignedTo, subtasks, ...rest } = updates;
  Object.assign(task, rest);
  if (Object.prototype.hasOwnProperty.call(updates, "project")) task.project = objectId(project) as any;
  if (assignedTo) task.assignedTo = assignedTo.map(objectId).filter(Boolean) as any;
  if (subtasks) task.subtasks = subtasks.map((title: string) => ({ title, isCompleted: false })) as any;
  if (updates.dueDate === null) task.dueDate = undefined;
  if (updates.dueDate) task.dueDate = new Date(updates.dueDate);
  if (updates.estimatedHours === null) task.estimatedHours = undefined;
  await task.save();
  const populated = await populateTask(task);
  await addActivityMongo(populated?.project ? docId((populated as any).project) : undefined, userId, "updated", "task", task.title, id);
  if (assignedTo && populated) {
    const newAssigneeIds = assignedTo.filter((assigneeId: string) => objectId(assigneeId) && !previousAssigneeIds.has(assigneeId));
    await notifyMongo(newAssigneeIds, userId, "task_assigned", `You were assigned "${task.title}"`, `/tasks/${id}`);
  }
  if (updates.status && updates.status !== previousStatus && populated) {
    const completed = updates.status === "done";
    await notifyMongo(
      await taskStatusRecipientsMongo(populated),
      userId,
      completed ? "task_completed" : "task_status_changed",
      completed ? `"${task.title}" was completed` : `"${task.title}" moved to ${String(updates.status).replace("_", " ")}`,
      `/tasks/${id}`
    );
  }
  return mapTask(populated);
}

export async function deleteTask(id: string, userId: string) {
  if (!shouldUseMongo()) return demo.deleteDemoTask(id, userId);
  await ensureMongoSeed();
  const taskId = objectId(id);
  if (!taskId) return false;

  const task = await Task.findById(taskId);
  if (!task || task.isDeleted) return false;

  await Promise.all([
    Task.deleteOne({ _id: taskId }),
    File.deleteMany({ task: taskId }),
    Comment.deleteMany({ task: taskId }),
    Notification.deleteMany({ link: `/tasks/${id}` }),
    ActivityLog.deleteMany({ targetId: taskId }),
  ]);
  return true;
}

export async function toggleSubtask(taskId: string, subtaskId: string) {
  if (!shouldUseMongo()) return demo.toggleDemoSubtask(taskId, subtaskId);
  await ensureMongoSeed();
  const task = await Task.findById(taskId);
  const subtask = task?.subtasks.find((item: any) => docId(item) === subtaskId);
  if (!task || !subtask) return null;
  subtask.isCompleted = !subtask.isCompleted;
  await task.save();
  return mapTask(await populateTask(task));
}

export async function listFiles(project?: string | null, task?: string | null) {
  if (!shouldUseMongo()) return demo.listDemoFiles(project, task);
  await ensureMongoSeed();
  const query: any = { isDeleted: { $ne: true } };
  if (project) query.project = objectId(project);
  if (task) query.task = objectId(task);
  const files = await File.find(query).populate("uploadedBy").sort({ createdAt: -1 }).lean();
  return files.map(mapFile);
}

export async function getFileById(id: string) {
  if (!shouldUseMongo()) return demo.getDemoFileById(id);
  await ensureMongoSeed();
  const file = await File.findById(id).populate("uploadedBy").lean();
  return file ? mapFile(file) : null;
}

export async function createFile(data: any) {
  if (!shouldUseMongo()) return demo.createDemoFile(data);
  await ensureMongoSeed();
  const uploader = await User.findById(data.uploadedBy);
  if (!uploader) return null;
  const fileType = data.mimeType.startsWith("image/")
    ? "image"
    : data.mimeType.includes("zip") || data.mimeType.includes("archive")
    ? "archive"
    : data.mimeType.includes("pdf") || data.mimeType.includes("document") || data.mimeType.includes("text")
    ? "document"
    : "other";
  const file = await File.create({
    project: objectId(data.project),
    task: objectId(data.task),
    uploadedBy: uploader._id,
    fileName: data.fileName,
    originalName: data.fileName,
    fileType,
    mimeType: data.mimeType,
    size: data.size,
    dataUrl: data.dataUrl,
  });
  await addActivityMongo(data.project, docId(uploader), "uploaded", "file", file.fileName, docId(file));
  if (data.project) {
    const project = await Project.findById(data.project).lean();
    if (project) await notifyMongo(((project as any).members || []).map(docId), docId(uploader), "file_uploaded", `${uploader.name} uploaded "${file.fileName}" in project "${(project as any).title}"`, `/projects/${docId(project)}`);
  }
  if (data.task) {
    const task = await Task.findById(data.task).lean();
    if (task) await notifyMongo([...(task.assignedTo || []).map(docId), docId(task.createdBy)], docId(uploader), "file_uploaded", `${uploader.name} uploaded "${file.fileName}" on task "${task.title}"`, `/tasks/${docId(task)}`);
  }
  const populated = await File.findById(file._id).populate("uploadedBy").lean();
  return mapFile(populated);
}

export async function listComments(project?: string | null, task?: string | null) {
  if (!shouldUseMongo()) return demo.listDemoComments(project, task);
  await ensureMongoSeed();
  const query: any = { isDeleted: { $ne: true } };
  if (project) query.project = objectId(project);
  if (task) query.task = objectId(task);
  const rows = await Comment.find(query).populate("author").sort({ createdAt: -1 }).lean();
  return rows.map(mapComment);
}

async function replyPreviewFromComment(id?: string) {
  if (!id || !objectId(id)) return undefined;
  const original = await Comment.findById(id).populate("author").lean();
  if (!original) return undefined;
  return { id: docId(original), body: (original as any).body, authorName: (original as any).author?.name || "Unknown user" };
}

async function extractMentionIds(body: string, explicitMentions: string[] = []) {
  const bodyLower = body.toLowerCase();
  const ids = new Set(explicitMentions.filter((id) => objectId(id)));
  const handles = Array.from(body.matchAll(/@([a-z0-9._-]+)/gi)).map((match) => match[1].toLowerCase());
  const users = await User.find({ isActive: true }).lean();

  users.forEach((user: any) => {
    const firstName = user.name.split(/\s+/)[0]?.toLowerCase();
    const aliases = [user.username, user.email.split("@")[0], user.name, firstName]
      .filter(Boolean)
      .map((alias: string) => alias.toLowerCase());
    const matchedByHandle = handles.some((handle) => aliases.includes(handle));
    const matchedByFullName = aliases.some((alias: string) => alias.includes(" ") && bodyLower.includes(`@${alias}`));
    if (matchedByHandle || matchedByFullName) ids.add(docId(user));
  });

  return Array.from(ids);
}

export async function createComment(data: any) {
  if (!shouldUseMongo()) return demo.createDemoComment(data);
  await ensureMongoSeed();
  const author = await User.findById(data.authorId);
  if (!author) return null;
  const replyTo = await replyPreviewFromComment(data.replyTo);
  const projectContext = data.project ? await Project.findById(data.project).populate("members").lean() : null;
  const taskContext = data.task ? await Task.findById(data.task).populate("assignedTo createdBy").lean() : null;
  let mentionIds = await extractMentionIds(data.body, data.mentions || []);
  if (projectContext) {
    const memberIds = new Set(((projectContext as any).members || []).map(docId));
    mentionIds = mentionIds.filter((id) => memberIds.has(id));
  }
  const comment = await Comment.create({
    project: objectId(data.project),
    task: objectId(data.task),
    author: author._id,
    body: data.body,
    mentions: mentionIds.map(objectId).filter(Boolean),
    replyTo,
  });
  await addActivityMongo(data.project, docId(author), "commented", "comment", data.task || data.project || "Comment", docId(comment));
  const recipients = new Set<string>(mentionIds);
  if (projectContext) ((projectContext as any).members || []).forEach((member: any) => recipients.add(docId(member)));
  if (taskContext) {
    ((taskContext as any).assignedTo || []).forEach((member: any) => recipients.add(docId(member)));
    if ((taskContext as any).createdBy) recipients.add(docId((taskContext as any).createdBy));
  }
  if (replyTo?.id) {
    const original = await Comment.findById(replyTo.id).lean();
    if (original?.author) recipients.add(docId(original.author));
  }
  const contextLabel = taskContext ? `task "${(taskContext as any).title}"` : projectContext ? `project "${(projectContext as any).title}"` : "this item";
  await notifyMongo(Array.from(recipients), docId(author), replyTo ? "comment_reply" : "comment_added", replyTo ? `${author.name} replied on ${contextLabel}` : `${author.name} commented on ${contextLabel}`, data.task ? `/tasks/${data.task}` : `/projects/${data.project}`);
  const populated = await Comment.findById(comment._id).populate("author").lean();
  return mapComment(populated);
}

export async function updateComment(id: string, data: { body: string; mentions?: string[] }, userId: string, role: Role = "employee") {
  if (!shouldUseMongo()) return demo.updateDemoComment(id, data, userId, role);
  await ensureMongoSeed();
  const comment = await Comment.findById(id);
  if (!comment || comment.isDeleted) return { comment: null, error: "Comment not found" };
  if (docId(comment.author) !== userId) return { comment: null, error: "You can only edit your own comments" };

  const projectContext = comment.project ? await Project.findById(comment.project).populate("members").lean() : null;
  let mentionIds = await extractMentionIds(data.body, data.mentions || []);
  if (projectContext) {
    const memberIds = new Set(((projectContext as any).members || []).map(docId));
    mentionIds = mentionIds.filter((mentionId) => memberIds.has(mentionId));
  }

  comment.body = data.body;
  comment.mentions = mentionIds.map(objectId).filter(Boolean) as any;
  comment.isEdited = true;
  await comment.save();

  const populated = await Comment.findById(comment._id).populate("author").lean();
  return { comment: mapComment(populated), error: null };
}

export async function deleteComment(id: string, userId: string, role: Role = "employee") {
  if (!shouldUseMongo()) return demo.deleteDemoComment(id, userId, role);
  await ensureMongoSeed();
  const comment = await Comment.findById(id);
  if (!comment || comment.isDeleted) return { deleted: false, error: "Comment not found" };

  const canDelete = docId(comment.author) === userId || normalizeRole(role) === "manager";
  if (!canDelete) return { deleted: false, error: "Not authorized to delete this comment" };

  await Promise.all([
    Comment.deleteOne({ _id: comment._id }),
    ActivityLog.deleteMany({ targetId: comment._id }),
  ]);
  return { deleted: true, error: null };
}

export async function listMessageContacts(userId: string) {
  if (!shouldUseMongo()) return demo.listDemoMessageContacts(userId);
  await ensureMongoSeed();
  const userObjectId = objectId(userId);
  const users = await User.find(approvedUserQuery({ _id: { $ne: userObjectId } })).lean();
  const contacts = await Promise.all(users.map(async (user: any) => {
    const threadQuery = {
      isDeleted: { $ne: true },
      deletedFor: { $ne: userObjectId },
      $or: [
        { sender: userObjectId, recipient: user._id },
        { sender: user._id, recipient: userObjectId },
      ],
    };
    const [lastMessage, unreadCount] = await Promise.all([
      Message.findOne(threadQuery).sort({ createdAt: -1 }).lean(),
      Message.countDocuments({ sender: user._id, recipient: userObjectId, isRead: false, isDeleted: { $ne: true }, deletedFor: { $ne: userObjectId } }),
    ]);
    return {
      ...messageUser(user),
      unreadCount,
      lastMessage: lastMessage ? { body: lastMessage.body, createdAt: iso(lastMessage.createdAt), senderId: docId(lastMessage.sender) } : null,
    };
  }));
  return contacts.sort((a: any, b: any) => {
    if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
    const aTime = a.lastMessage ? +new Date(a.lastMessage.createdAt) : 0;
    const bTime = b.lastMessage ? +new Date(b.lastMessage.createdAt) : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.name.localeCompare(b.name);
  });
}

export async function listDirectMessages(userId: string, contactId?: string | null) {
  if (!shouldUseMongo()) return demo.listDemoDirectMessages(userId, contactId);
  await ensureMongoSeed();
  const userObjectId = objectId(userId);
  const contactObjectId = objectId(contactId);
  if (!userObjectId || !contactObjectId) return [];
  const contact = await User.findOne(approvedUserQuery({ _id: contactId })).lean();
  if (!contact) return [];
  await Message.updateMany({ sender: contactObjectId, recipient: userObjectId, isRead: false, deletedFor: { $ne: userObjectId } }, { isRead: true });
  const rows = await Message.find({
    isDeleted: { $ne: true },
    deletedFor: { $ne: userObjectId },
    $or: [
      { sender: userObjectId, recipient: contactObjectId },
      { sender: contactObjectId, recipient: userObjectId },
    ],
  }).populate("sender recipient").sort({ createdAt: 1 }).lean();
  return rows.map(mapMessage);
}

async function replyPreviewFromMessage(id?: string, userId?: string, contactId?: string) {
  if (!id || !objectId(id) || !objectId(userId) || !objectId(contactId)) return undefined;
  const original = await Message.findOne({
    _id: id,
    isDeleted: { $ne: true },
    deletedFor: { $ne: objectId(userId) },
    $or: [
      { sender: userId, recipient: contactId },
      { sender: contactId, recipient: userId },
    ],
  }).populate("sender").lean();
  if (!original) return undefined;
  return { id: docId(original), body: original.body, authorName: (original as any).sender?.name || "Unknown user" };
}

export async function createDirectMessage(data: any) {
  if (!shouldUseMongo()) return demo.createDemoDirectMessage(data);
  await ensureMongoSeed();
  const sender = await User.findOne(approvedUserQuery({ _id: data.senderId }));
  const recipient = await User.findOne(approvedUserQuery({ _id: data.recipientId }));
  if (!sender || !recipient || docId(sender) === docId(recipient)) return null;
  const replyTo = await replyPreviewFromMessage(data.replyTo, docId(sender), docId(recipient));
  const message = await Message.create({ sender: sender._id, recipient: recipient._id, body: data.body, replyTo, isRead: false });
  await notifyMongo([docId(recipient)], docId(sender), "direct_message", replyTo ? `${sender.name} replied to your message` : `${sender.name} sent you a message`, "/messages");
  const populated = await Message.findById(message._id).populate("sender recipient").lean();
  return mapMessage(populated);
}

export async function updateDirectMessage(id: string, body: string, userId: string) {
  if (!shouldUseMongo()) return demo.updateDemoDirectMessage(id, body, userId);
  await ensureMongoSeed();
  const message = await Message.findById(id);
  if (!message || message.isDeleted) return { message: null, error: "Message not found" };
  if (docId(message.sender) !== userId) return { message: null, error: "You can only edit your own messages" };

  message.body = body;
  message.isEdited = true;
  await message.save();

  const populated = await Message.findById(message._id).populate("sender recipient").lean();
  return { message: mapMessage(populated), error: null };
}

export async function deleteDirectMessage(id: string, userId: string, role: Role = "employee") {
  if (!shouldUseMongo()) return demo.deleteDemoDirectMessage(id, userId, role);
  await ensureMongoSeed();
  const message = await Message.findById(id);
  if (!message || message.isDeleted) return { deleted: false, error: "Message not found" };

  const canDelete = docId(message.sender) === userId || normalizeRole(role) === "manager";
  if (!canDelete) return { deleted: false, error: "Not authorized to delete this message" };

  await Message.deleteOne({ _id: message._id });
  return { deleted: true, error: null };
}

export async function deleteDirectMessageThread(userId: string, contactId?: string | null) {
  if (!shouldUseMongo()) return demo.deleteDemoDirectMessageThread(userId, contactId);
  await ensureMongoSeed();
  const userObjectId = objectId(userId);
  const contactObjectId = objectId(contactId);
  if (!userObjectId || !contactObjectId) return { deleted: false, error: "Contact not found" };

  const contact = await User.findOne(approvedUserQuery({ _id: contactId })).lean();
  if (!contact) return { deleted: false, error: "Contact not found" };

  const threadQuery = {
    isDeleted: { $ne: true },
    $or: [
      { sender: userObjectId, recipient: contactObjectId },
      { sender: contactObjectId, recipient: userObjectId },
    ],
  };

  await Message.updateMany(threadQuery, { $addToSet: { deletedFor: userObjectId } });
  await Message.deleteMany({
    ...threadQuery,
    deletedFor: { $all: [userObjectId, contactObjectId] },
  });

  return { deleted: true, error: null };
}

export async function listNotifications(userId: string) {
  if (!shouldUseMongo()) return demo.listDemoNotifications(userId);
  await ensureMongoSeed();
  const rows = await Notification.find({ recipient: objectId(userId) }).populate("sender").sort({ createdAt: -1 }).lean();
  return { notifications: rows.map(mapNotification), unreadCount: rows.filter((item: any) => !item.isRead).length };
}

export async function markNotificationsRead(userId: string, id?: string) {
  if (!shouldUseMongo()) return demo.markDemoNotificationsRead(userId, id);
  await ensureMongoSeed();
  const query: any = { recipient: objectId(userId) };
  if (id) query._id = objectId(id);
  await Notification.updateMany(query, { isRead: true });
  if (!id) return null;
  const notification = await Notification.findById(id).populate("sender").lean();
  return notification ? mapNotification(notification) : null;
}

export async function markNotificationsReadByLink(userId: string, link: string) {
  if (!shouldUseMongo()) return demo.markDemoNotificationsReadByLink(userId, link);
  await ensureMongoSeed();
  await Notification.updateMany({ recipient: objectId(userId), link }, { isRead: true });
}

export async function getStats(userId: string, role: Role = "employee") {
  if (!shouldUseMongo()) return demo.getDemoStats(userId, role);
  const visibleProjects = (await listProjects({ page: 1, limit: 100, userId, role })).projects;
  const visibleTasks = (await listTasks({ page: 1, limit: 100, userId, role })).tasks;
  const openTasks = visibleTasks.filter((task: any) => task.status !== "done");
  const projectTasks = openTasks.filter((task: any) => task.project);
  const standaloneTasks = openTasks.filter((task: any) => !task.project);
  return {
    totalProjects: visibleProjects.length,
    activeProjects: visibleProjects.filter((project: any) => project.status === "active").length,
    myTasks: openTasks.length,
    projectTasks: projectTasks.length,
    standaloneTaskTotal: standaloneTasks.length,
    overdueTasks: visibleTasks.filter((task: any) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done").length,
    recentProjects: visibleProjects.slice(0, 4),
    standaloneTasks: standaloneTasks.slice(0, 5),
    upcomingTasks: visibleTasks
      .filter((task: any) => task.dueDate && task.status !== "done")
      .sort((a: any, b: any) => +new Date(a.dueDate || 0) - +new Date(b.dueDate || 0))
      .slice(0, 5),
    activity: [],
  };
}

export async function getManagementStats() {
  if (!shouldUseMongo()) return demo.getDemoManagementStats();
  await ensureMongoSeed();
  return {
    users: await User.countDocuments(),
    managers: await User.countDocuments({ role: "manager" }),
    employees: await User.countDocuments({ role: "employee" }),
    projects: await Project.countDocuments({ isDeleted: { $ne: true } }),
    activeProjects: await Project.countDocuments({ status: "active", isDeleted: { $ne: true } }),
    openTasks: await Task.countDocuments({ status: { $ne: "done" }, isDeleted: { $ne: true } }),
    completedTasks: await Task.countDocuments({ status: "done", isDeleted: { $ne: true } }),
  };
}
