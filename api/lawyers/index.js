// api/lawyers/index.js  — GET /api/lawyers
const { getDb, cors } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const db = getDb();
  const { specialization, available, limit = 20, offset = 0 } = req.query;

  let sql = `
    SELECT u.id, u.name, lp.specialization, lp.experience_years, lp.bio,
      lp.consultation_fee, lp.rating, lp.review_count, lp.is_available, lp.languages
    FROM users u
    JOIN lawyer_profiles lp ON lp.user_id = u.id
    WHERE u.role = 'lawyer'
  `;
  const params = [];

  if (specialization) { sql += ` AND lp.specialization LIKE ?`; params.push(`%${specialization}%`); }
  if (available !== undefined) { sql += ` AND lp.is_available = ?`; params.push(available === 'true' || available === '1' ? 1 : 0); }
  sql += ` ORDER BY lp.rating DESC, lp.review_count DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  return res.json({ lawyers: db.prepare(sql).all(...params) });
};
