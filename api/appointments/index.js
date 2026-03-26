// api/appointments/index.js  — POST /api/appointments
const { v4: uuidv4 } = require('uuid');
const { getDb, getUser, cors } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  if (req.method === 'POST') {
    if (user.role !== 'client') return res.status(403).json({ error: 'Only clients can book appointments.' });

    const { lawyer_id, date, start_time, type = 'consultation', notes } = req.body;
    if (!lawyer_id || !date || !start_time) return res.status(400).json({ error: 'lawyer_id, date, and start_time are required.' });

    const db = getDb();
    const lawyer = db.prepare(`SELECT u.id, lp.consultation_fee FROM users u JOIN lawyer_profiles lp ON lp.user_id=u.id WHERE u.id=? AND u.role='lawyer' AND lp.is_available=1`).get(lawyer_id);
    if (!lawyer) return res.status(404).json({ error: 'Lawyer not found or not available.' });

    const conflict = db.prepare(`SELECT id FROM appointments WHERE lawyer_id=? AND date=? AND start_time=? AND status NOT IN ('cancelled')`).get(lawyer_id, date, start_time);
    if (conflict) return res.status(409).json({ error: 'This time slot is already booked.' });

    const id = uuidv4();
    const meetingLink = `https://meet.lawcare.app/room/${id.slice(0, 8)}`;
    db.prepare(`INSERT INTO appointments (id,client_id,lawyer_id,date,start_time,type,notes,status,fee,meeting_link) VALUES (?,?,?,?,?,?,?,'confirmed',?,?)`)
      .run(id, user.id, lawyer_id, date, start_time, type, notes || '', lawyer.consultation_fee, meetingLink);

    const appt = db.prepare(`SELECT a.*,u.name as lawyer_name,lp.specialization FROM appointments a JOIN users u ON u.id=a.lawyer_id JOIN lawyer_profiles lp ON lp.user_id=a.lawyer_id WHERE a.id=?`).get(id);
    return res.status(201).json({ appointment: appt });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
