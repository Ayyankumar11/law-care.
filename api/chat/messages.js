const { getDb, db, getUser, cors, uuidv4 } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  getDb();

  if (req.method === 'GET') {
    const convId = req.query.conversation_id;
    if (!convId) return res.status(400).json({ error: 'conversation_id is required.' });
    const conv = db.conversationById(convId);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
    if (conv.client_id !== user.id && conv.lawyer_id !== user.id) return res.status(403).json({ error: 'Access denied.' });
    db.markRead(convId, user.id);
    return res.json({ messages: db.messagesByConv(convId) });
  }

  if (req.method === 'POST') {
    const { conversation_id, content } = req.body;
    if (!conversation_id || !content?.trim()) return res.status(400).json({ error: 'conversation_id and content are required.' });
    const conv = db.conversationById(conversation_id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
    if (conv.client_id !== user.id && conv.lawyer_id !== user.id) return res.status(403).json({ error: 'Access denied.' });

    const msg = db.createMessage({ id: uuidv4(), conversation_id, sender_id: user.id, content: content.trim() });
    db.updateConversation(conversation_id, { last_message: content.trim(), last_msg_at: new Date().toISOString() });
    return res.status(201).json({ message: { ...msg, sender_name: user.name } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
