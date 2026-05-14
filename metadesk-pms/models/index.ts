import mongoose, { Schema, Document, Model } from "mongoose";

// ─────────────────────────────────────────────────────────────
// FILE MODEL
// ─────────────────────────────────────────────────────────────
export interface IFile extends Document {
  project?: mongoose.Types.ObjectId;
  task?: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  fileName: string;
  originalName?: string;
  fileUrl?: string;
  publicId?: string; // Cloudinary public_id for deletion
  fileType: string;
  mimeType: string;
  size: number; // bytes
  dataUrl?: string;
  isDeleted: boolean;
  createdAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    publicId: { type: String, default: "" },
    fileType: { type: String, required: true }, // "image" | "document" | "archive" | "other"
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    dataUrl: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FileSchema.index({ project: 1 }, { background: true });
FileSchema.index({ uploadedBy: 1 }, { background: true });

export const File: Model<IFile> =
  mongoose.models.File || mongoose.model<IFile>("File", FileSchema);

// ─────────────────────────────────────────────────────────────
// COMMENT MODEL
// ─────────────────────────────────────────────────────────────
export interface IComment extends Document {
  project?: mongoose.Types.ObjectId;
  task?: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  body: string;
  mentions: mongoose.Types.ObjectId[];
  replyTo?: {
    id: string;
    body: string;
    authorName: string;
  };
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, maxlength: 5000 },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    replyTo: {
      id: String,
      body: String,
      authorName: String,
    },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CommentSchema.index({ project: 1 }, { background: true });
CommentSchema.index({ task: 1 }, { background: true });
CommentSchema.index({ author: 1 }, { background: true });

export const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

// ─────────────────────────────────────────────────────────────
// NOTIFICATION MODEL
// ─────────────────────────────────────────────────────────────
export type NotificationType =
  | "task_assigned"
  | "task_deadline"
  | "project_update"
  | "comment_added"
  | "comment_reply"
  | "comment_mention"
  | "file_uploaded"
  | "project_assigned"
  | "task_completed"
  | "task_status_changed"
  | "direct_message"
  | "account_request";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  link: string; // Frontend URL to navigate to
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_deadline",
        "project_update",
        "comment_added",
        "comment_reply",
        "comment_mention",
        "file_uploaded",
        "project_assigned",
        "task_completed",
        "task_status_changed",
        "direct_message",
        "account_request",
      ],
      required: true,
    },
    message: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1 }, { background: true });
NotificationSchema.index({ createdAt: -1 }, { background: true });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

// ─────────────────────────────────────────────────────────────
// ACTIVITY LOG MODEL
// ─────────────────────────────────────────────────────────────
export interface IActivityLog extends Document {
  project?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  action: string; // e.g. "created", "updated", "deleted", "uploaded", "commented"
  targetType: "project" | "task" | "file" | "comment" | "member";
  targetId: mongoose.Types.ObjectId;
  targetTitle: string; // Human-readable name of the target
  meta?: Record<string, unknown>; // Extra context like { from: "todo", to: "done" }
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["project", "task", "file", "comment", "member"],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetTitle: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ project: 1 }, { background: true });
ActivityLogSchema.index({ user: 1 }, { background: true });
ActivityLogSchema.index({ createdAt: -1 }, { background: true });

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

// DIRECT MESSAGE MODEL
export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  body: string;
  replyTo?: {
    id: string;
    body: string;
    authorName: string;
  };
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  deletedFor: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, maxlength: 3000 },
    replyTo: {
      id: String,
      body: String,
      authorName: String,
    },
    isRead: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 }, { background: true });
MessageSchema.index({ recipient: 1, isRead: 1 }, { background: true });
MessageSchema.index({ isDeleted: 1 }, { background: true });
MessageSchema.index({ deletedFor: 1 }, { background: true });

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

// DEPARTMENT MODEL
export interface IDepartment extends Document {
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

export const Department: Model<IDepartment> =
  mongoose.models.Department || mongoose.model<IDepartment>("Department", DepartmentSchema);
