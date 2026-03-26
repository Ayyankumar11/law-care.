const { getDb, db, cors } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  getDb();
  const { id } = req.query;
  const lawyer = db.lawyerById(id);
  if (!lawyer) return res.status(404).json({ error: 'Lawyer not found.' });

  const reviews = db.reviewsByLawyer(id);
  return res.json({ lawyer, reviews });
};
