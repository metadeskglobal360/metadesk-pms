import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProject extends Document {
  title: string;
  description: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  status: "planning" | "active" | "on_hold" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "critical";
  startDate: Date;
  deadline: Date;
  completedAt?: Date;
  progress: number; // 0-100, auto-calculated from tasks
  tags: string[];
  coverColor: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", maxlength: 2000 },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "archived"],
      default: "planning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    startDate: { type: Date, required: true },
    deadline: { type: Date, required: true },
    completedAt: { type: Date },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    tags: [{ type: String, trim: true }],
    coverColor: { type: String, default: "#3c78f0" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Only return non-deleted projects by default
ProjectSchema.pre(/^find/, function (next) {
  (this as any).find({ isDeleted: { $ne: true } });
  next();
});

// Indexes
ProjectSchema.index({ owner: 1 }, { background: true });
ProjectSchema.index({ members: 1 }, { background: true });
ProjectSchema.index({ status: 1 }, { background: true });
ProjectSchema.index({ deadline: 1 }, { background: true });

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
