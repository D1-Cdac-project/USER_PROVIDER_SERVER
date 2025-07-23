const express = require("express");
const {
  logoutAdmin,
  loginAdmin,
  getAllUsers,
  addProvider,
  addUser,
  registerAdmin,
  getPendingApprovalRequests,
  handleApprovalRequest,
  getAdminNotifications,
  markNotificationAsRead,
  getAllProviders,
  searchUsers,
  searchProviders,
} = require("../controllers/adminControllers");
const { isAdmin } = require("../middlewares/verifyAdmin");

const router = express.Router();

// Admin authentication routes
router.post("/signup", registerAdmin);
router.post("/login", (req, res) => loginAdmin(req, res, req.io));
router.post("/logout", logoutAdmin);

// Admin user/provider management routes
router.post("/add-user", isAdmin, (req, res) => addUser(req, res, req.io));
router.post("/add-provider", isAdmin, (req, res) =>
  addProvider(req, res, req.io)
);

// Approval request routes
router.get("/approval-requests", isAdmin, getPendingApprovalRequests);
router.post("/approve-request", isAdmin, (req, res) =>
  handleApprovalRequest(req, res, req.io)
);

// Notification routes
router.get("/notifications", isAdmin, getAdminNotifications);
router.post("/notifications/mark-read", isAdmin, markNotificationAsRead);

// User/provider listing routes
router.get("/users", isAdmin, getAllUsers);
router.get("/providers", isAdmin, getAllProviders);

// Search routes
router.get("/search-users", isAdmin, searchUsers);
router.get("/search-providers", isAdmin, searchProviders);

module.exports = router;
