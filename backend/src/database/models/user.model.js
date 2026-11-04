import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name must be at most 80 characters"],
    },

    userName: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },

    role: {
      type: String,
      enum: {
        values: [
          "member",
          "company_admin",
          "platform_admin",
          "user",
          "admin",
          "superAdmin",
        ],
        message: "Invalid role value",
      },
      default: "member",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },

    sessionToken: {
      type: String,
      default: "",
    },

    lastLogin: {
      type: Date,
      default: Date.now,
    },

    lastLoginAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["inactive", "active", "suspended", "disabled"],
      default: "active",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Google OAuth ID (optional for local users)
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Authentication provider: local or Google
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    Photo: {
      type: String,
      default: "",
    },

    resetPasswordToken: {
      type: String,
    },

    resetpasswordExpiresAt: {
      type: Date,
    },

    verificationToken: {
      type: String,
    },

    verificationTokenExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Virtuals ─────────────────────────────────────────────────────────────────
userSchema.virtual("passwordHash")
  .get(function () {
    return this.password;
  })
  .set(function (val) {
    this.password = val;
  });

userSchema.virtual("photo")
  .get(function () {
    return this.Photo;
  })
  .set(function (val) {
    this.Photo = val;
  });

userSchema.virtual("resetPasswordExpiresAt")
  .get(function () {
    return this.resetpasswordExpiresAt;
  })
  .set(function (val) {
    this.resetpasswordExpiresAt = val;
  });

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ company: 1 });

// ── Hooks ────────────────────────────────────────────────────────────────────
userSchema.pre("validate", function (next) {
  if (!this.name && this.userName) {
    this.name = this.userName;
  }
  if (!this.userName && this.name) {
    const cleaned = this.name.replace(/\s+/g, "").toLowerCase();
    const randomNum = Math.floor(Math.random() * 10000);
    this.userName = `${cleaned}${randomNum}`;
  }
  if (this.status) {
    this.isActive = this.status === "active";
  } else if (this.isActive !== undefined) {
    this.status = this.isActive ? "active" : "disabled";
  }
  if (this.lastLogin && !this.lastLoginAt) {
    this.lastLoginAt = this.lastLogin;
  }
  if (this.lastLoginAt && !this.lastLogin) {
    this.lastLogin = this.lastLoginAt;
  }
  next();
});

// ── Methods ──────────────────────────────────────────────────────────────────
userSchema.methods.setPassword = async function (plainPassword) {
  this.password = await bcrypt.hash(plainPassword, 10);
};

userSchema.methods.verifyPassword = async function (plainPassword) {
  if (!this.password) return false;
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    name: this.name || this.userName,
    userName: this.userName || this.name,
    email: this.email,
    role: this.role,
    company: this.company ?? null,
    status: this.status,
    isActive: this.status === "active",
    lastLogin: this.lastLogin,
    lastLoginAt: this.lastLoginAt || this.lastLogin,
    provider: this.provider,
    Photo: this.Photo,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.models.User || mongoose.model("User", userSchema, "users");
export const Auth = User;
export default User;
