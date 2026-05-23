const express = require("express");
const router = express.Router();
const { getDashboardStats, generateReport, exportReportCSV } = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);

router.get("/dashboard", getDashboardStats);
router.get("/reports", authorize("Manager"), generateReport);
router.get("/reports/export", authorize("Manager"), exportReportCSV);

module.exports = router;
