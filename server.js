import express from "express";
import multer from "multer";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 4173);

const DATA_DIR = join(__dirname, "data");
const UPLOADS_DIR = join(__dirname, "uploads");
[DATA_DIR, UPLOADS_DIR].forEach((d) => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

// ── File-based JSON DB ─────────────────────────────────────────────────────────

function readDB(file, fallback = {}) {
  const p = join(DATA_DIR, file);
  if (!existsSync(p)) return typeof fallback === "function" ? fallback() : fallback;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return typeof fallback === "function" ? fallback() : fallback; }
}

function writeDB(file, data) {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf8");
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

const sessions = new Map(Object.entries(readDB("sessions.json", {})));

function saveSessionsDB() {
  writeDB("sessions.json", Object.fromEntries(sessions));
}

function createToken(userId, role) {
  const token = crypto.randomUUID() + "." + crypto.randomBytes(8).toString("hex");
  sessions.set(token, { userId, role, createdAt: new Date().toISOString() });
  saveSessionsDB();
  return token;
}

function getSession(token) {
  return sessions.get(token || "") || null;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((res, rej) =>
    crypto.scrypt(password, salt, 64, (err, key) =>
      err ? rej(err) : res(`${salt}:${key.toString("hex")}`)
    )
  );
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return true;
  const [salt, hash] = stored.split(":");
  return new Promise((res, rej) =>
    crypto.scrypt(password, salt, 64, (err, key) =>
      err ? rej(err) : res(key.toString("hex") === hash)
    )
  );
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  const session = getSession(token);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  req.session = session;
  next();
}

// ── File upload ────────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".pptx", ".xlsx"];
    cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
  }
});

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── Auth routes ────────────────────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name, company, role } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email is required" });
    const users = readDB("users.json", {});
    const key = (email || "").toLowerCase().trim();
    if (users[key]) return res.status(409).json({ error: "Email already registered. Sign in instead." });
    const id = "u_" + crypto.randomUUID().slice(0, 8);
    const hashed = password ? await hashPassword(password) : null;
    const user = { id, email: key, name: name || "", company: company || "", role: role || "candidate", password: hashed, verified: false, createdAt: new Date().toISOString() };
    users[key] = user;
    writeDB("users.json", users);
    const token = createToken(id, user.role);
    res.json({ token, user: { ...user, password: undefined } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const users = readDB("users.json", {});
    const key = (email || "").toLowerCase().trim();
    const user = users[key];
    if (!user) return res.status(401).json({ error: "No account found with that email address." });
    const valid = await verifyPassword(password || "", user.password || "");
    if (!valid) return res.status(401).json({ error: "Incorrect password. Try again." });
    const token = createToken(user.id, user.role);
    res.json({ token, user: { ...user, password: undefined } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  sessions.delete(token);
  saveSessionsDB();
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const users = readDB("users.json", {});
  const user = Object.values(users).find((u) => u.id === req.session.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ ...user, password: undefined });
});

// ── State sync ─────────────────────────────────────────────────────────────────

app.get("/api/state", requireAuth, (_, res) => {
  const state = readDB("state.json", null);
  if (!state) return res.status(404).json({ error: "No state found" });
  res.json(state);
});

app.put("/api/state", requireAuth, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") return res.status(400).json({ error: "Invalid state" });
  writeDB("state.json", body);
  res.json({ ok: true });
});

// ── File upload ────────────────────────────────────────────────────────────────

app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded or file type not allowed" });
  const meta = {
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype,
    uploadedAt: new Date().toISOString()
  };
  const idx = readDB("uploads.json", []);
  idx.push({ ...meta, uploadedBy: req.session.userId });
  writeDB("uploads.json", idx);
  res.json(meta);
});

// ── Referral routes ────────────────────────────────────────────────────────────

app.get("/api/referrals", requireAuth, (_, res) => {
  res.json(readDB("referrals.json", []));
});

app.post("/api/referrals", requireAuth, (req, res) => {
  const { referredEmail, type } = req.body || {};
  if (!referredEmail) return res.status(400).json({ error: "referredEmail required" });
  const referrals = readDB("referrals.json", []);
  const entry = {
    id: "ref_" + crypto.randomUUID().slice(0, 8),
    referrerId: req.session.userId,
    referredEmail: referredEmail.toLowerCase().trim(),
    type: type || "company",
    status: "pending",
    createdAt: new Date().toISOString()
  };
  referrals.push(entry);
  writeDB("referrals.json", referrals);
  res.json(entry);
});

// ── Serve uploaded files + static frontend ─────────────────────────────────────

app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(__dirname));
app.get("/{*path}", (_, res) => res.sendFile(join(__dirname, "index.html")));

// ── Start ──────────────────────────────────────────────────────────────────────

function startServer(port) {
  const server = app.listen(port, "127.0.0.1", () => {
    console.log(`\nBridgeX is live at http://127.0.0.1:${port}`);
    console.log(`API: /api/auth/login  /api/state  /api/upload`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") startServer(port + 1);
    else throw err;
  });
}

startServer(PORT);
