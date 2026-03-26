const bcrypt = require('bcryptjs');
const { db, signToken, cors, uuidv4 } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, password, role = 'client', specialization, experience_years, bio, consultation_fee } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!['client','lawyer'].includes(role)) return res.status(400).json({ error: 'Role must be client or lawyer.' });
  if (role === 'lawyer' && !specialization) return res.status(400).json({ error: 'Specialization is required for lawyers.' });

  // init store
  const { getDb } = require('../_db'); getDb();

  if (db.userByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists.' });

  const id = uuidv4();
  const user = db.createUser({ id, name: name.trim(), email: email.toLowerCase().trim(), password: bcrypt.hashSync(password, 10), role });

  if (role === 'lawyer') {
    db.createLawyerProfile({ id: uuidv4(), user_id: id, specialization, experience_years: experience_years || 0, bio: bio || '', consultation_fee: consultation_fee || 500, rating: 0, review_count: 0, is_available: true });
  }

  const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
  return res.status(201).json({ accessToken: signToken(safe), user: safe });
};
