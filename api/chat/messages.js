// api/chat/messages.js  — GET + POST /api/chat/messages
const { v4: uuidv4 } = require('uuid');
const { getDb, getUser, cors } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const db = getDb();

  // GET /api/chat/messages?conversation_id=xxx
  if (req.method === 'GET') {
    const convId = req.query.conversation_id;
    if (!convId) return res.status(400).json({ error: 'conversation_id is required.' });

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
  }

  // POST /api/chat/messages
  if (req.method === 'POST') {
    const { conversation_id, content } = req.body;
    if (!conversation_id || !content?.trim()) return res.status(400).json({ error: 'conversation_id and content are required.' });

    const conv = db.prepare('SELECT * FROM conversations WHERE id=?').get(conversation_id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
    if (conv.client_id !== user.id && conv.lawyer_id !== user.id) return res.status(403).json({ error: 'Access denied.' });

    const id = uuidv4();
    db.prepare('INSERT INTO messages (id,conversation_id,sender_id,content) VALUES (?,?,?,?)').run(id, conversation_id, user.id, content.trim());
    db.prepare(`UPDATE conversations SET last_message=?, last_msg_at=datetime('now') WHERE id=?`).run(content.trim(), conversation_id);

    const message = db.prepare(`SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?`).get(id);
    return res.status(201).json({ message });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
