// api/chat/messages/[conversationId].js  — GET /api/chat/messages/:id
const { getDb, getUser, cors } = require('../../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const db     = getDb();
  const convId = req.query.conversationId;

  const conv = db.prepare('SELECT * FROM conversations WHERE id=?').get(convId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
  if (conv.client_id !== user.id && conv.lawyer_id !== user.id) return res.status(403).json({ error: 'Access denied.' });

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m JOIN users u ON u.id=m.sender_id
    WHERE m.conversation_id=? ORDER BY m.created_at ASC
  `).all(convId);

  db.prepare(`UPDATE messages SET is_read=1 WHERE conversation_id=? AND sender_id!=?`).run(convId, user.id);
  return res.json({ messages });
};
