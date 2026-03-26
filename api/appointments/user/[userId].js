// api/appointments/user/[userId].js
const { getDb, getUser, cors } = require('../../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { userId } = req.query;
  if (user.id !== userId) return res.status(403).json({ error: 'Access denied.' });

  const db    = getDb();
  const field = user.role === 'lawyer' ? 'a.lawyer_id' : 'a.client_id';

  const appointments = db.prepare(`
    SELECT a.*, lu.name as lawyer_name, lp.specialization, cu.name as client_name
    FROM appointments a
    JOIN users lu ON lu.id=a.lawyer_id
    JOIN lawyer_profiles lp ON lp.user_id=a.lawyer_id
    JOIN users cu ON cu.id=a.client_id
    WHERE ${field}=?
    ORDER BY a.date DESC, a.start_time DESC
  `).all(userId);

  return res.json({ appointments });
};
