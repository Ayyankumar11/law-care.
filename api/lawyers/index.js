const { getDb, db, cors } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  getDb();
  const { specialization, available, limit = 20, offset = 0 } = req.query;

  const lawyers = db.allLawyers({
    specialization,
    available: available !== undefined ? (available === 'true' || available === '1') : undefined,
    limit: Number(limit),
    offset: Number(offset),
  });

  return res.json({ lawyers });
};
