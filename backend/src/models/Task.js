const mongoose = require('mongoose');

const OPERATION_TYPES = ['uppercase', 'lowercase', 'reverse', 'word_count'];
const STATUS_TYPES = ['pending', 'running', 'success', 'failed'];

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    inputText: {
      type: String,
      required: true,
    },
    operation: {
      type: String,
      enum: OPERATION_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: STATUS_TYPES,
      default: 'pending',
    },
    result: {
      type: String,
      default: null,
    },
    logs: {
      type: [String],
      default: [],
    },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

// Compound index: the dashboard's primary query is "a user's tasks, most
// recent first, optionally filtered by status" -- this index covers that
// without a separate collection scan per user.
taskSchema.index({ user: 1, createdAt: -1 });
taskSchema.index({ user: 1, status: 1 });
// Supports the worker/ops-side query "find stuck pending tasks older than X"
taskSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Task', taskSchema);
module.exports.OPERATION_TYPES = OPERATION_TYPES;
module.exports.STATUS_TYPES = STATUS_TYPES;
