import mongoose from "mongoose";

const { Schema } = mongoose;

const companyRuleSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: ["security", "bug", "quality", "performance", "custom"],
      default: "custom",
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    ruleText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "medium",
      required: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
  }
);

companyRuleSchema.index({ company: 1, category: 1 });
companyRuleSchema.index({ company: 1, enabled: 1 });
companyRuleSchema.index({ company: 1, createdAt: -1 });

export const CompanyRule =
  mongoose.models.CompanyRule ||
  mongoose.model("CompanyRule", companyRuleSchema);
