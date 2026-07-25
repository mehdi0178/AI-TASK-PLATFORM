const express = require('express');
const Task = require('../models/Task');
const { OPERATION_TYPES } = require('../models/Task');
const { pushTask } = require('../config/redis');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Create + immediately enqueue a task
router.post('/', async (req, res, next) => {
  try {
    const { title, inputText, operation } = req.body;

    if (!title || !inputText || !operation) {
      return res.status(400).json({ message: 'title, inputText and operation are required' });
    }
    if (!OPERATION_TYPES.includes(operation)) {
      return res.status(400).json({ message: `operation must be one of: ${OPERATION_TYPES.join(', ')}` });
    }

    const task = await Task.create({
      user: req.user.id,
      title,
      inputText,
      operation,
      status: 'pending',
      logs: ['Task created and queued'],
    });

    await pushTask(task._id.toString());

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// List current user's tasks, most recent first, optional status filter
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user.id };
    if (status) filter.status = status;

    const tasks = await Task.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// Get a single task (status, logs, result)
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
