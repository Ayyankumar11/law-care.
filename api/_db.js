// api/_db.js — Pure JS in-memory store (no native modules = Vercel compatible)
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// ── In-memory store ───────────────────────────────────────────
const store = { users: {}, lawyer_profiles: {}, appointments: {}, conversations: {}, messages: {}, reviews: {} };
let seeded = false;

function getDb() {
  if (!seeded) { seedData(); seeded = true; }
  return store;
}

function now() { return new Date().toISOString(); }

// ── Seed demo data ────────────────────────────────────────────
function seedData() {
  const hash = p => bcrypt.hashSync(p, 10);
  const clientId = uuidv4();
  const lids = Array.from({ length: 6 }, () => uuidv4());

  store.users[clientId] = { id: clientId, name: 'Demo Client', email: 'client@demo.com', password: hash('password123'), role: 'client', created_at: now() };

  const lawyers = [
    { id: lids[0], name: 'Adv. Riya Kapoor',  email: 'riya@demo.com',   spec: 'Criminal Law',   exp: 12, fee: 500,  rating: 4.9, reviews: 127, avail: true,  bio: 'Senior criminal defense attorney with 12+ years in High Court and Supreme Court.' },
    { id: lids[1], name: 'Adv. Aryan Mehta',  email: 'aryan@demo.com',  spec: 'Family Law',     exp: 8,  fee: 400,  rating: 4.8, reviews: 94,  avail: true,  bio: 'Compassionate family law specialist for divorce, custody, and alimony matters.' },
    { id: lids[2], name: 'Adv. Priya Nair',   email: 'priya@demo.com',  spec: 'Property Law',   exp: 15, fee: 600,  rating: 4.7, reviews: 88,  avail: false, bio: 'Expert in RERA disputes, real estate transactions, and property litigation.' },
    { id: lids[3], name: 'Adv. Karan Johari', email: 'karan@demo.com',  spec: 'Corporate Law',  exp: 10, fee: 800,  rating: 4.9, reviews: 156, avail: true,  bio: 'Startup and corporate law advisor. Expert in contracts, M&A, company registration.' },
    { id: lids[4], name: 'Adv. Meera Iyer',   email: 'meera@demo.com',  spec: 'Employment Law', exp: 7,  fee: 350,  rating: 4.6, reviews: 72,  avail: true,  bio: 'Labour law specialist for wrongful termination and workplace harassment cases.' },
    { id: lids[5], name: 'Adv. Rahul Singh',  email: 'rahul@demo.com',  spec: 'Consumer Law',   exp: 5,  fee: 300,  rating: 4.5, reviews: 63,  avail: true,  bio: 'Consumer rights advocate with 200+ wins before Consumer Disputes Redressal Commission.' },
  ];

  lawyers.forEach(l => {
    store.users[l.id] = { id: l.id, name: l.name, email: l.email, password: hash('password123'), role: 'lawyer', created_at: now() };
    store.lawyer_profiles[l.id] = { id: uuidv4(), user_id: l.id, specialization: l.spec, experience_years: l.exp, bio: l.bio, consultation_fee: l.fee, rating: l.rating, review_count: l.reviews, is_available: l.avail };
  });

  const apptId = uuidv4();
  const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 3);
  store.appointments[apptId] = { id: apptId, client_id: clientId, lawyer_id: lids[0], date: futureDate.toISOString().slice(0,10), start_time: '11:00', type: 'consultation', notes: 'Discuss property dispute', status: 'confirmed', fee: 500, meeting_link: 'https://meet.lawcare.app/demo', created_at: now() };

  const convId = uuidv4(), msgId = uuidv4();
  store.conversations[convId] = { id: convId, client_id: clientId, lawyer_id: lids[0], last_message: 'Hello! I need legal advice.', last_msg_at: now(), created_at: now() };
  store.messages[msgId] = { id: msgId, conversation_id: convId, sender_id: clientId, content: 'Hello! I need legal advice regarding my property dispute.', is_read: 0, created_at: now() };
}

// ── DB helpers ────────────────────────────────────────────────
const db = {
  userByEmail: (email) => Object.values(store.users).find(u => u.email === email.toLowerCase().trim()),
  userById:    (id)    => store.users[id],
  createUser:  (data)  => { store.users[data.id] = { ...data, created_at: now() }; return store.users[data.id]; },

  lawyerProfile:       (uid) => store.lawyer_profiles[uid],
  createLawyerProfile: (data) => { store.lawyer_profiles[data.user_id] = data; },
  updateLawyerProfile: (uid, upd) => { store.lawyer_profiles[uid] = { ...store.lawyer_profiles[uid], ...upd }; },

  allLawyers: (filters = {}) =>
    Object.values(store.users)
      .filter(u => u.role === 'lawyer')
      .map(u => { const lp = store.lawyer_profiles[u.id]; return lp ? { ...u, ...lp } : null; })
      .filter(Boolean)
      .filter(l => {
        if (filters.specialization && !l.specialization.toLowerCase().includes(filters.specialization.toLowerCase())) return false;
        if (filters.available !== undefined && l.is_available !== filters.available) return false;
        return true;
      })
      .sort((a, b) => b.rating - a.rating || b.review_count - a.review_count)
      .slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20)),

  lawyerById: (id) => {
    const u = store.users[id];
    if (!u || u.role !== 'lawyer') return null;
    const lp = store.lawyer_profiles[id];
    return lp ? { ...u, ...lp } : null;
  },

  createAppointment: (data) => { store.appointments[data.id] = { ...data, created_at: now() }; },
  appointmentById:   (id)   => store.appointments[id],
  appointmentsByUser: (uid, role) =>
    Object.values(store.appointments)
      .filter(a => role === 'lawyer' ? a.lawyer_id === uid : a.client_id === uid)
      .map(a => ({ ...a, lawyer_name: store.users[a.lawyer_id]?.name, specialization: store.lawyer_profiles[a.lawyer_id]?.specialization, client_name: store.users[a.client_id]?.name }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  slotTaken: (lid, date, time) => Object.values(store.appointments).some(a => a.lawyer_id === lid && a.date === date && a.start_time === time && a.status !== 'cancelled'),
  updateAppointment: (id, upd) => { store.appointments[id] = { ...store.appointments[id], ...upd }; },

  conversationById:   (id) => store.conversations[id],
  conversationByPair: (cid, lid) => Object.values(store.conversations).find(c => c.client_id === cid && c.lawyer_id === lid),
  createConversation: (data) => { store.conversations[data.id] = { ...data, created_at: now() }; return store.conversations[data.id]; },
  conversationsByUser: (uid, role) =>
    Object.values(store.conversations)
      .filter(c => role === 'lawyer' ? c.lawyer_id === uid : c.client_id === uid)
      .map(c => ({ ...c, lawyer_name: store.users[c.lawyer_id]?.name, client_name: store.users[c.client_id]?.name }))
      .sort((a, b) => (b.last_msg_at||b.created_at).localeCompare(a.last_msg_at||a.created_at)),
  updateConversation: (id, upd) => { store.conversations[id] = { ...store.conversations[id], ...upd }; },

  messagesByConv: (cid) =>
    Object.values(store.messages)
      .filter(m => m.conversation_id === cid)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(m => ({ ...m, sender_name: store.users[m.sender_id]?.name, sender_role: store.users[m.sender_id]?.role })),
  createMessage: (data) => { store.messages[data.id] = { ...data, is_read: 0, created_at: now() }; return store.messages[data.id]; },
  markRead: (cid, uid) => { Object.values(store.messages).filter(m => m.conversation_id === cid && m.sender_id !== uid).forEach(m => { m.is_read = 1; }); },

  reviewsByLawyer: (lid) =>
    Object.values(store.reviews).filter(r => r.lawyer_id === lid)
      .map(r => ({ ...r, client_name: store.users[r.client_id]?.name }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10),
  reviewByPair: (lid, cid) => Object.values(store.reviews).find(r => r.lawyer_id === lid && r.client_id === cid),
  upsertReview: (lid, cid, rating, comment) => {
    const ex = db.reviewByPair(lid, cid);
    if (ex) { ex.rating = rating; ex.comment = comment; }
    else { const id = uuidv4(); store.reviews[id] = { id, lawyer_id: lid, client_id: cid, rating, comment, created_at: now() }; }
    const all = Object.values(store.reviews).filter(r => r.lawyer_id === lid);
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    db.updateLawyerProfile(lid, { rating: Math.round(avg * 10) / 10, review_count: all.length });
  },

  lawyersBySpec: (spec) =>
    db.allLawyers({ specialization: spec, available: true, limit: 2 }),
};

// ── JWT ───────────────────────────────────────────────────────
const SECRET = process.env.JWT_SECRET || 'lawcare_dev_secret_2024';
const signToken  = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, SECRET, { expiresIn: '7d' });
const verifyToken = (t) => jwt.verify(t, SECRET);
const getUser = (req) => {
  const h = (req.headers.authorization || '');
  if (!h.startsWith('Bearer ')) return null;
  try { return verifyToken(h.slice(7)); } catch { return null; }
};

// ── CORS ──────────────────────────────────────────────────────
function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}

module.exports = { getDb, db, signToken, getUser, cors, uuidv4 };
