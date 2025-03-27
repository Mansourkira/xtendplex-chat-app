const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth");
const usersRoutes = require("./users");
const groupsRoutes = require("./groups");
const messagesRoutes = require("./messages");
const attachmentsRoutes = require("./attachments");

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/groups", groupsRoutes);
router.use("/messages", messagesRoutes);
router.use("/attachments", attachmentsRoutes);

module.exports = router;
