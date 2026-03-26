const { getDb, db, getUser, cors } = require('../../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  if (user.id !== req.query.userId) return res.status(403).json({ error: 'Access denied.' });

  getDb();
  const appointments = db.appointmentsByUser(user.id, user.role);
  return res.json({ appointments });
};
