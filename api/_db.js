// api/_db.js  — shared SQLite helper for all serverless functions
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const os   = require('os');

// Vercel serverless: /tmp is the only writable directory
const DB_PATH = path.join(os.tmpdir(), 'lawcare.db');

let _db = null;

function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  seedIfEmpty(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'client',
      phone TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS lawyer_profiles (
      id TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      specialization TEXT NOT NULL, experience_years INTEGER DEFAULT 0,
      bio TEXT, consultation_fee REAL DEFAULT 500,
      rating REAL DEFAULT 0, review_count INTEGER DEFAULT 0,
      is_available INTEGER DEFAULT 1, languages TEXT DEFAULT 'English'
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES users(id),
      lawyer_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL, start_time TEXT NOT NULL,
      type TEXT DEFAULT 'consultation', notes TEXT,
      status TEXT DEFAULT 'pending', fee REAL DEFAULT 0,
      meeting_link TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES users(id),
      lawyer_id TEXT NOT NULL REFERENCES users(id),
      last_message TEXT, last_msg_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL, is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY, lawyer_id TEXT NOT NULL REFERENCES users(id),
      client_id TEXT NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedIfEmpty(db) {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (c > 0) return;

  const hash = p => bcrypt.hashSync(p, 10);
  const clientId  = uuidv4();
  const lids      = Array.from({ length: 6 }, () => uuidv4());

  const ins = db.prepare('INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)');
  ins.run(clientId, 'Demo Client', 'client@demo.com', hash('password123'), 'client');

  const lawyers = [
    [lids[0],'Adv. Riya Kapoor','riya@demo.com',  'Criminal Law',   12,500,4.9,127,1],
    [lids[1],'Adv. Aryan Mehta','aryan@demo.com', 'Family Law',     8, 400,4.8,94, 1],
    [lids[2],'Adv. Priya Nair', 'priya@demo.com', 'Property Law',   15,600,4.7,88, 0],
    [lids[3],'Adv. Karan Johari','karan@demo.com','Corporate Law',  10,800,4.9,156,1],
    [lids[4],'Adv. Meera Iyer', 'meera@demo.com', 'Employment Law', 7, 350,4.6,72, 1],
    [lids[5],'Adv. Rahul Singh','rahul@demo.com', 'Consumer Law',   5, 300,4.5,63, 1],
  ];
  const bios = [
    'Senior criminal defense attorney with 12+ years in High Court and Supreme Court.',
    'Compassionate family law specialist for divorce, custody, and alimony matters.',
    'Expert in RERA disputes, real estate transactions, and property litigation.',
    'Startup and corporate law advisor. Expert in contracts, M&A, company registration.',
    'Labour law specialist for wrongful termination and workplace harassment cases.',
    'Consumer rights advocate with 200+ wins before Consumer Disputes Redressal Commission.',
  ];
  const ip = db.prepare('INSERT INTO lawyer_profiles (id,user_id,specialization,experience_years,bio,consultation_fee,rating,review_count,is_available) VALUES (?,?,?,?,?,?,?,?,?)');
  lawyers.forEach(([id,name,email,spec,exp,fee,rating,reviews,avail], i) => {
    ins.run(id, name, email, hash('password123'), 'lawyer');
    ip.run(uuidv4(), id, spec, exp, bios[i], fee, rating, reviews, avail);
  });

  // Demo appointment
  db.prepare(`INSERT INTO appointments (id,client_id,lawyer_id,date,start_time,type,notes,status,fee,meeting_link)
    VALUES (?,?,?,date('now','+3 days'),'11:00','consultation','Discuss property dispute','confirmed',500,?)`)
    .run(uuidv4(), clientId, lids[0], 'https://meet.lawcare.app/demo');

  // Demo conversation + message
  const convId = uuidv4(), msgId = uuidv4();
  db.prepare('INSERT INTO conversations (id,client_id,lawyer_id,last_message,last_msg_at) VALUES (?,?,?,?,datetime("now","-1 hour"))')
    .run(convId, clientId, lids[0], 'Hello! I need legal advice.');
  db.prepare('INSERT INTO messages (id,conversation_id,sender_id,content) VALUES (?,?,?,?)')
    .run(msgId, convId, clientId, 'Hello! I need legal advice regarding my property dispute.');
}

// ── JWT helpers ───────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'lawcare_dev_secret_key_2024';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function getUser(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return verifyToken(h.slice(7)); } catch { return null; }
}

// ── CORS helper ───────────────────────────────────────────────
function cors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}

module.exports = { getDb, signToken, verifyToken, getUser, cors };
