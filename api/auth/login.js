// api/auth/login.js
const bcrypt = require('bcryptjs');
const { getDb, signToken, cors } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password.' });

  const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
  return res.json({ accessToken: signToken(safe), user: safe });
};
