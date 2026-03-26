// api/ai/ask.js
const { getDb, getUser, cors } = require('../_db');

const TOPICS = {
  tenant:     { kw: ['tenant','rent','deposit','landlord','eviction','lease'], spec: 'Property Law',    ans: `**Tenant Rights in India:**\n\n**1. Written Agreement** — Always insist on a registered rent agreement.\n\n**2. No Illegal Eviction** — Landlord cannot evict without 15–30 days legal notice.\n\n**3. Security Deposit** — Capped at 2–3 months rent. Must be returned within 30 days of vacating.\n\n**4. Basic Amenities** — Landlord must maintain essential services (water, electricity).\n\n**5. RERA Protection** — For new housing projects, RERA provides additional protections.\n\nConsult our Property Law specialists for your specific situation.` },
  accident:   { kw: ['accident','car','vehicle','collision','injury','motor'],  spec: 'Criminal Law',   ans: `**After a Vehicle Accident in India:**\n\n**Immediately:**\n• Call 100 (Police) and 108 (Ambulance)\n• Document scene with photos, get witness details\n• Do not move vehicles until police arrive\n\n**Within 24 hours:**\n• File FIR at nearest police station\n• Notify your insurance company\n• Keep all medical bills\n\n**Legal Options:**\n• File compensation claim at Motor Accident Claims Tribunal (MACT)\n• Claims under Motor Vehicles Act, 1988\n• Limitation: 6 months to file MACT claim\n\nOur lawyers can help you maximize your compensation.` },
  divorce:    { kw: ['divorce','separation','alimony','custody','matrimonial'], spec: 'Family Law',      ans: `**Divorce Law in India:**\n\n**Types:**\n• **Mutual Consent** — Both agree, 6-month separation needed. Fastest route (6–18 months)\n• **Contested** — Grounds: cruelty, desertion (2 yrs), adultery. Takes 2–5 years\n\n**Key Rights:**\n• Maintenance/Alimony under Section 125 CrPC\n• Child custody — courts prioritize child's best interest\n• Matrimonial property can be divided equitably\n\nOur Family Law specialists handle sensitive matters with complete confidentiality.` },
  employment: { kw: ['fired','termination','workplace','harassment','salary','labour'], spec: 'Employment Law', ans: `**Employee Rights in India:**\n\n**Against Wrongful Termination:**\n• Industrial Disputes Act requires valid reason and notice\n• Gratuity mandatory after 5+ years of service\n• Retrenchment needs government permission for 100+ worker companies\n\n**Workplace Harassment:**\n• POSH Act 2013 — every company with 10+ employees needs ICC\n• File with ICC, then Labour Commissioner\n\n**Salary Issues:**\n• Payment of Wages Act ensures timely payment\n• Approach Labour Commissioner or Labour Court\n\nConsult our Employment Law specialists for a case evaluation.` },
  consumer:   { kw: ['product','defective','fraud','cheated','consumer','refund'], spec: 'Consumer Law',  ans: `**Consumer Rights under Consumer Protection Act, 2019:**\n\n**Your Rights:** Safety, information, choice, redressal, consumer education\n\n**Where to File:**\n• District Consumer Commission — claims up to ₹1 crore\n• State Consumer Commission — ₹1–10 crore\n• National Consumer Commission — above ₹10 crore\n\n**How:** File online at consumerhelpline.gov.in or call 1800-11-4000 (free)\n\n**Time Limit:** 2 years from cause of action\n\nOur Consumer Law specialists have an excellent track record.` },
  property:   { kw: ['property','land','plot','real estate','builder','registry','rera'], spec: 'Property Law', ans: `**Property Law Essentials:**\n\n**Before Buying:**\n• Verify title deed (minimum 30 years chain)\n• Check encumbrance certificate for loans/liabilities\n• Confirm RERA registration at rera.gov.in\n\n**Registration:**\n• Mandatory under Registration Act, 1908\n• Within 4 months of signing\n• Stamp duty 5–8% (varies by state)\n\n**Disputes:**\n• RERA Tribunal for builder disputes (faster)\n• Civil court for title/possession disputes\n\nOur Property Law team handles everything from due diligence to litigation.` },
};

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { question, conversation_history = [] } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Question is required.' });

  const db = getDb();

  // Try Anthropic API if key is set
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: `You are LawCare AI, a knowledgeable legal assistant for Indian law. Provide practical, accurate information about Indian legal matters. Always recommend consulting a licensed lawyer for specific advice. Format with **bold** headers. Never give definitive legal advice.`,
          messages: [...(conversation_history || []).slice(-6), { role: 'user', content: question }]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const answer = data.content?.[0]?.text || '';
        const q = question.toLowerCase();
        let spec = null;
        for (const t of Object.values(TOPICS)) { if (t.kw.some(k => q.includes(k))) { spec = t.spec; break; } }
        const suggested_lawyers = spec ? db.prepare(`SELECT u.id,u.name,lp.specialization,lp.rating,lp.consultation_fee FROM users u JOIN lawyer_profiles lp ON lp.user_id=u.id WHERE lp.specialization LIKE ? AND lp.is_available=1 ORDER BY lp.rating DESC LIMIT 2`).all(`%${spec}%`) : [];
        return res.json({ answer, suggested_lawyers });
      }
    } catch (e) { /* fallthrough */ }
  }

  // Built-in response
  const q = question.toLowerCase();
  let match = null;
  for (const t of Object.values(TOPICS)) { if (t.kw.some(k => q.includes(k))) { match = t; break; } }

  const answer = match?.ans || `Thank you for your question. Under Indian law, this involves several considerations depending on your specific circumstances.\n\n**General Advice:**\n• Document everything (dates, communications, receipts)\n• Preserve all relevant agreements and documents\n• Note key timelines carefully\n• Avoid discussing your case without legal counsel\n\nI recommend consulting with one of our specialized lawyers who can review your specific situation and provide personalized advice.`;
  const suggested_lawyers = match?.spec ? db.prepare(`SELECT u.id,u.name,lp.specialization,lp.rating,lp.consultation_fee FROM users u JOIN lawyer_profiles lp ON lp.user_id=u.id WHERE lp.specialization LIKE ? AND lp.is_available=1 ORDER BY lp.rating DESC LIMIT 2`).all(`%${match.spec}%`) : [];

  return res.json({ answer, suggested_lawyers });
};
