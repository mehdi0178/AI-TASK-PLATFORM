const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Liveness: process is up and can serve requests at all.
// Kept cheap and dependency-free so k8s doesn't restart the pod
// just because a downstream dependency is briefly unavailable.
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: safe to receive traffic -- checks the DB connection so
// k8s stops routing to this pod during a Mongo outage/reconnect.
router.get('/ready', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  if (!mongoReady) {
    return res.status(503).json({ status: 'not_ready', mongo: mongoose.connection.readyState });
  }
  res.status(200).json({ status: 'ready' });
});

module.exports = router;
