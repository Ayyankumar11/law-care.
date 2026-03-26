// api/auth/register.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, signToken, cors } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, password, role = 'client', specialization, experience_years, bio, consultation_fee } = req.body;

  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!['client', 'lawyer'].includes(role)) return res.status(400).json({ error: 'Role must be client or lawyer.' });
  if (role === 'lawyer' && !specialization) return res.status(400).json({ error: 'Specialization is required for lawyers.' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const userId = uuidv4();
  db.prepare('INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)')
    .run(userId, name.trim(), email.toLowerCase().trim(), bcrypt.hashSync(password, 10), role);

  if (role === 'lawyer') {
    db.prepare('INSERT INTO lawyer_profiles (id,user_id,specialization,experience_years,bio,consultation_fee) VALUES (?,?,?,?,?,?)')
      .run(uuidv4(), userId, specialization, experience_years || 0, bio || '', consultation_fee || 500);
  }

  const user = db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(userId);
  return res.status(201).json({ accessToken: signToken(user), user });
};
