const { getDb, db, getUser, cors, uuidv4 } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  getDb();

  if (req.method === 'GET') {
    return res.json({ conversations: db.conversationsByUser(user.id, user.role) });
  }

  if (req.method === 'POST') {
    const { lawyer_id } = req.body;
    if (!lawyer_id) return res.status(400).json({ error: 'lawyer_id is required.' });

    const clientId = user.role === 'client' ? user.id : lawyer_id;
    const lawyerId = user.role === 'client' ? lawyer_id : user.id;

    const existing = db.conversationByPair(clientId, lawyerId);
    if (existing) return res.json({ conversation: existing });

    const conv = db.createConversation({ id: uuidv4(), client_id: clientId, lawyer_id: lawyerId, last_message: null, last_msg_at: null });
    return res.status(201).json({ conversation: conv });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
