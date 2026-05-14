import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password: string;
  role: "owner" | "manager" | "employee";
  team: string;
  designation: string;
  avatar?: string;
  bio?: string;
  isActive: boolean;
  emailVerified: boolean;
  approvalStatus: "pending" | "approved" | "declined";
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  declinedAt?: Date;
  verificationOtpHash?: string;
  verificationOtpExpiresAt?: Date;
  verificationOtpLastSentAt?: Date;
  lastSeen: Date;
  notificationPrefs: {
    taskAssigned: boolean;
    deadlineReminder: boolean;
    projectUpdate: boolean;
    commentMention: boolean;
    fileUploaded: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ["owner", "manager", "employee"], default: "employee" },
    team: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 300 },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: true },
    approvalStatus: { type: String, enum: ["pending", "approved", "declined"], default: "approved", index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    declinedAt: { type: Date },
    verificationOtpHash: { type: String, default: "", select: false },
    verificationOtpExpiresAt: { type: Date, select: false },
    verificationOtpLastSentAt: { type: Date, select: false },
    lastSeen: { type: Date, default: Date.now },
    notificationPrefs: {
      taskAssigned: { type: Boolean, default: true },
      deadlineReminder: { type: Boolean, default: true },
      projectUpdate: { type: Boolean, default: true },
      commentMention: { type: Boolean, default: true },
      fileUploaded: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Indexes
UserSchema.index({ team: 1 }, { background: true });
UserSchema.index({ approvalStatus: 1, createdAt: -1 }, { background: true });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
