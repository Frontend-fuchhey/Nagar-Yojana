require("dotenv").config();
const express = require("express");
const cors = require("cors");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN }));
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
app.get("/api/projects", (req, res) => {
  try {
    const rawWard = req.query.ward ? String(req.query.ward).trim() : "";
    const rawStatus = req.query.status ? String(req.query.status).trim() : "";
    const rawSector = req.query.sector ? String(req.query.sector).trim() : "";
    const rawQ = req.query.q ? String(req.query.q).trim() : "";

    let filtered = [...projects];

    if (rawWard && rawWard.toLowerCase() !== "all") {
      filtered = filtered.filter(
        (p) => p.ward && p.ward.toLowerCase() === rawWard.toLowerCase()
      );
    }

    if (rawStatus && rawStatus.toLowerCase() !== "all") {
      filtered = filtered.filter(
        (p) => p.status.toUpperCase() === rawStatus.toUpperCase()
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
          p.title.toLowerCase().includes(query) ||
          p.contractor.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query) ||
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

// Mount API routers
app.use("/api/admin", adminRoutes);

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
