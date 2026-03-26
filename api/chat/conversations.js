// api/chat/conversations.js  — GET + POST /api/chat/conversations
const { v4: uuidv4 } = require('uuid');
const { getDb, getUser, cors } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const db = getDb();

  if (req.method === 'GET') {
    const field = user.role === 'lawyer' ? 'c.lawyer_id' : 'c.client_id';
    const convs = db.prepare(`
      SELECT c.*, lu.name as lawyer_name, cu.name as client_name
      FROM conversations c
      JOIN users lu ON lu.id=c.lawyer_id
      JOIN users cu ON cu.id=c.client_id
      WHERE ${field}=?
      ORDER BY c.last_msg_at DESC, c.created_at DESC
    `).all(user.id);
    return res.json({ conversations: convs });
  }

  if (req.method === 'POST') {
    const { lawyer_id } = req.body;
    if (!lawyer_id) return res.status(400).json({ error: 'lawyer_id is required.' });

    const clientId = user.role === 'client' ? user.id : lawyer_id;
    const lawyerId = user.role === 'client' ? lawyer_id : user.id;

    const existing = db.prepare('SELECT * FROM conversations WHERE client_id=? AND lawyer_id=?').get(clientId, lawyerId);
    if (existing) return res.json({ conversation: existing });

    const id = uuidv4();
    db.prepare('INSERT INTO conversations (id,client_id,lawyer_id) VALUES (?,?,?)').run(id, clientId, lawyerId);
    return res.status(201).json({ conversation: db.prepare('SELECT * FROM conversations WHERE id=?').get(id) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
