import mongoose, { Schema, Document, Model } from "mongoose";

interface ISubtask {
  _id: mongoose.Types.ObjectId;
  title: string;
  isCompleted: boolean;
}

export interface ITask extends Document {
  title: string;
  description: string;
  project?: mongoose.Types.ObjectId; // Optional — task can exist without a project
  createdBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId[];
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "critical";
  dueDate?: Date;
  completedAt?: Date;
  subtasks: ISubtask[];
  labels: string[];
  estimatedHours?: number;
  loggedHours: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubtaskSchema = new Schema({
  title: { type: String, required: true, trim: true },
  isCompleted: { type: Boolean, default: false },
});

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", maxlength: 5000 },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    subtasks: [SubtaskSchema],
    labels: [{ type: String, trim: true }],
    estimatedHours: { type: Number, min: 0 },
    loggedHours: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-set completedAt when status becomes "done"
TaskSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "done" && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (this.isModified("status") && this.status !== "done") {
    this.completedAt = undefined;
  }
  next();
});

// Indexes
TaskSchema.index({ project: 1 }, { background: true });
TaskSchema.index({ assignedTo: 1 }, { background: true });
TaskSchema.index({ status: 1 }, { background: true });
TaskSchema.index({ dueDate: 1 }, { background: true });
TaskSchema.index({ createdBy: 1 }, { background: true });

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);

export default Task;
