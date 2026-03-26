// api/lawyers/[id].js  — GET /api/lawyers/:id
const { getDb, cors } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const { id } = req.query;
  const db = getDb();

  const lawyer = db.prepare(`
    SELECT u.id, u.name, u.email, lp.specialization, lp.experience_years, lp.bio,
      lp.consultation_fee, lp.rating, lp.review_count, lp.is_available, lp.languages
    FROM users u JOIN lawyer_profiles lp ON lp.user_id = u.id
    WHERE u.id=? AND u.role='lawyer'
  `).get(id);

  if (!lawyer) return res.status(404).json({ error: 'Lawyer not found.' });

  const reviews = db.prepare(`
    SELECT r.rating, r.comment, r.created_at, u.name as client_name
    FROM reviews r JOIN users u ON u.id=r.client_id
    WHERE r.lawyer_id=? ORDER BY r.created_at DESC LIMIT 10
  `).all(id);

  return res.json({ lawyer, reviews });
};
