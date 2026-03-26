const { getDb, db, getUser, cors, uuidv4 } = require('../_db');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  getDb();

  if (req.method === 'POST') {
    if (user.role !== 'client') return res.status(403).json({ error: 'Only clients can book appointments.' });
    const { lawyer_id, date, start_time, type = 'consultation', notes } = req.body;
    if (!lawyer_id || !date || !start_time) return res.status(400).json({ error: 'lawyer_id, date, and start_time are required.' });

    const lawyer = db.lawyerById(lawyer_id);
    if (!lawyer || !lawyer.is_available) return res.status(404).json({ error: 'Lawyer not found or not available.' });
    if (db.slotTaken(lawyer_id, date, start_time)) return res.status(409).json({ error: 'This time slot is already booked.' });

    const id = uuidv4();
    db.createAppointment({ id, client_id: user.id, lawyer_id, date, start_time, type, notes: notes || '', status: 'confirmed', fee: lawyer.consultation_fee, meeting_link: `https://meet.lawcare.app/room/${id.slice(0,8)}` });

    const appt = db.appointmentById(id);
    return res.status(201).json({ appointment: { ...appt, lawyer_name: lawyer.name, specialization: lawyer.specialization } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
