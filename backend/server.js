require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const executiveRoutes = require("./routes/executiveRoutes");
const { verifyToken, requireWardExec, requireWardExecOrContractor } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const allowedOrigins = CORS_ORIGIN
  ? CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000", "*"];

// Security middleware: set secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS policy
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json());

// Verified civic infrastructure project dataset for Biratnagar Metropolitan City
const projects = [
  {
    id: 1,
    title: "Ward 04 Drainage Upgrade",
    status: "ACTIVE",
    location: "Chundevi Marg, Ward 4",
    contractor: "Pragati Upabhokta Samiti",
    description:
      "Upgradation of existing drainage system to improve water flow and reduce flooding in the area.",
    budget: "1,25,00,000",
    progress: 65,
    sector: "Roads & Drainage",
    ward: "Ward 04",
    featured: true,
    date: "2081-11-15 (B.S.)",
    dateLabel: "Started",
    imageUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPVMH6dHGMIv-ZDQlBOplG_QdnaGymOA5idJdIrIlku8-TlEhAGIppPpj_&s=10",
  },
  {
    id: 2,
    title: "Ward 04 Deep Tube-Well & Distribution Network",
    status: "COMPLETED",
    location: "Maharajgunj, Ward 4",
    contractor: "Himalayan Water Infra Ltd.",
    description:
      "Construction of deep tube-well and distribution network for clean and safe drinking water.",
    budget: "95,00,000",
    progress: 100,
    sector: "Water & Sanitation",
    ward: "Ward 04",
    featured: false,
    date: "2081-10-30 (B.S.)",
    dateLabel: "Completed On",
    imageUrl:
      "https://images.unsplash.com/photo-1584467735871-8e85353a8413?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "Ward 03 Ranibari Community Urban Park & Solar Lighting",
    status: "COMPLETED",
    location: "Ranibari Marg, Ward 3",
    contractor: "Green Valley Infrastructure",
    description:
      "Development of green recreational urban park with solar street lighting and public amenities.",
    budget: "85,50,000",
    progress: 100,
    sector: "Public Facilities",
    ward: "Ward 03",
    featured: false,
    date: "2081-08-20 (B.S.)",
    dateLabel: "Completed On",
    imageUrl:
      "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?q=80&w=800&auto=format&fit=crop",
  },
];

// GET /api/projects - Returns list of civic infrastructure projects with filter support
app.get("/api/projects", async (req, res) => {
  try {
    const rawWard = req.query.ward ? String(req.query.ward).trim() : "";
    const rawStatus = req.query.status ? String(req.query.status).trim() : "";
    const rawSector = req.query.sector ? String(req.query.sector).trim() : "";
    const rawQ = req.query.q ? String(req.query.q).trim() : "";

    let combined = [...projects];

    // Merge real-time Firestore projects if available
    try {
      const { adminDb } = require("./firebaseAdmin");
      const firestoreSnap = await adminDb.collection("projects").get();
      if (!firestoreSnap.empty) {
        const firestoreList = [];
        firestoreSnap.forEach((doc) => {
          firestoreList.push(doc.data());
        });
        const firestoreIds = new Set(firestoreList.map((p) => String(p.id)));
        combined = [
          ...firestoreList,
          ...projects.filter((p) => !firestoreIds.has(String(p.id))),
        ];
      }
    } catch (dbErr) {
      // Fallback to in-memory dataset
    }

    let filtered = combined;

    if (rawWard && rawWard.toLowerCase() !== "all") {
      filtered = filtered.filter(
        (p) => p.ward && p.ward.toLowerCase() === rawWard.toLowerCase()
      );
    }

    if (rawStatus && rawStatus.toLowerCase() !== "all") {
      filtered = filtered.filter(
        (p) => p.status && p.status.toUpperCase() === rawStatus.toUpperCase()
      );
    }

    if (rawSector && rawSector.toLowerCase() !== "all") {
      filtered = filtered.filter(
        (p) => p.sector && p.sector.toLowerCase() === rawSector.toLowerCase()
      );
    }

    if (rawQ) {
      const query = rawQ.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(query)) ||
          (p.contractor && p.contractor.toLowerCase().includes(query)) ||
          (p.location && p.location.toLowerCase().includes(query)) ||
          (p.description && p.description.toLowerCase().includes(query)) ||
          (p.ward && p.ward.toLowerCase().includes(query)) ||
          (p.sector && p.sector.toLowerCase().includes(query))
      );
    }

    res.json(filtered);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error while retrieving projects." });
  }
});

// In-memory grievances store for Biratnagar Wards
let grievances = [
  {
    id: "GRV-101",
    projectId: 1,
    projectTitle: "Ward 04 Drainage Upgrade",
    ward: "Ward 04",
    wardNumber: 4,
    name: "Santosh Karki",
    phone: "9842012345",
    issueType: "Construction Delay",
    description: "Drain excavation left open without gravel backfill near Chundevi Chowk for 2 weeks.",
    status: "OPEN",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "GRV-102",
    projectId: 1,
    projectTitle: "Ward 04 Drainage Upgrade",
    ward: "Ward 04",
    wardNumber: 4,
    name: "Anita Pokharel",
    phone: "9812345678",
    issueType: "Quality of Materials",
    description: "Pipes delivered appear damaged on edges before pipe-laying.",
    status: "INVESTIGATING",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// PUT /api/projects/:id - Update project progress and status (Staff / Ward Exec / Contractor / Admin)
app.put("/api/projects/:id", verifyToken, requireWardExecOrContractor, async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, status, remarks } = req.body;
    const project = projects.find((p) => String(p.id) === String(id));

    // Also check Firestore
    let fsProject = null;
    const { adminDb } = require("./firebaseAdmin");
    const docRef = adminDb.collection("projects").doc(String(id));
    try {
      const snap = await docRef.get();
      if (snap.exists) fsProject = snap.data();
    } catch (e) {}

    const targetProject = fsProject || project;
    if (!targetProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Role check: Contractor can only update their assigned project
    if (req.user.role === "CONTRACTOR") {
      const isAssigned = (targetProject.contractorId && targetProject.contractorId === req.user.uid) ||
                         (targetProject.contractorEmail && targetProject.contractorEmail === req.user.email);
      if (!isAssigned) {
        return res.status(403).json({ error: "Forbidden: You are not assigned to this project." });
      }
    }

    const updates = { updatedAt: new Date().toISOString() };
    if (progress !== undefined) {
      const numProg = Math.min(100, Math.max(0, Number(progress)));
      updates.progress = numProg;
      if (project) project.progress = numProg;
    }
    if (status) {
      const upperStatus = String(status).toUpperCase();
      updates.status = upperStatus;
      if (project) project.status = upperStatus;
    }
    if (remarks !== undefined) {
      updates.contractorRemarks = String(remarks);
      if (project) project.contractorRemarks = String(remarks);
    }

    try {
      await docRef.set(updates, { merge: true });
    } catch (dbErr) {
      console.warn("Firestore project update warning:", dbErr.message);
    }

    res.json({ message: "Project updated successfully", project: { ...targetProject, ...updates } });
  } catch (err) {
    res.status(500).json({ error: "Failed to update project" });
  }
});

// GET /api/grievances - Retrieve grievances (Staff / Ward Exec / Admin only)
app.get("/api/grievances", verifyToken, requireWardExec, (req, res) => {
  try {
    const wardNumber = req.query.wardNumber ? Number(req.query.wardNumber) : null;
    let list = [...grievances];
    if (wardNumber) {
      list = list.filter((g) => g.wardNumber === wardNumber);
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch grievances" });
  }
});

// POST /api/grievances - Submit new citizen grievance
app.post("/api/grievances", (req, res) => {
  try {
    const { projectId, projectTitle, ward, wardNumber, name, phone, issueType, description } = req.body;
    const newGrievance = {
      id: `GRV-${Date.now().toString().slice(-4)}`,
      projectId: Number(projectId) || null,
      projectTitle: projectTitle || "Civic Project",
      ward: ward || `Ward ${wardNumber || "04"}`,
      wardNumber: Number(wardNumber) || 4,
      name: name || "Anonymous Citizen",
      phone: phone || "N/A",
      issueType: issueType || "General Issue",
      description: description || "",
      status: "OPEN",
      createdAt: new Date().toISOString()
    };
    grievances.unshift(newGrievance);
    res.status(201).json(newGrievance);
  } catch (err) {
    res.status(500).json({ error: "Failed to register grievance" });
  }
});

// PATCH /api/grievances/:id/status - Update grievance status (Staff / Ward Exec / Admin only)
app.patch("/api/grievances/:id/status", verifyToken, requireWardExec, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const grv = grievances.find((g) => g.id === id);
    if (!grv) {
      return res.status(404).json({ error: "Grievance not found" });
    }
    if (status) {
      grv.status = String(status).toUpperCase();
    }
    res.json({ message: "Grievance status updated", grievance: grv });
  } catch (err) {
    res.status(500).json({ error: "Failed to update grievance status" });
  }
});

// Mount API routers
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/executive", executiveRoutes);

// Root health check route for UptimeRobot / monitoring
app.get("/", (req, res) => {
  res.status(200).send("NagarYojana API is awake and running!");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Nagarयोजना API (Biratnagar)" });
});

// 404 Catch-All Middleware
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(PORT, () => {
  console.log(`Nagarयोजना Backend API running on http://localhost:${PORT}`);
});