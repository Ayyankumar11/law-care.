const { getDb, db, getUser, cors } = require('../../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  getDb();
  const conv = db.conversationById(req.query.conversationId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
  if (conv.client_id !== user.id && conv.lawyer_id !== user.id) return res.status(403).json({ error: 'Access denied.' });

  db.markRead(conv.id, user.id);
  return res.json({ messages: db.messagesByConv(conv.id) });
};
