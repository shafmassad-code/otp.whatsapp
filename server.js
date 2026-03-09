require('dotenv').config();
const express = require('express');
const app = express();
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.use(express.json());
app.use(express.static('public'));

const otpStore = {};

const authorizedUsers = [
  "+972507357127",
  "+972585976060", // תוסיף כאן מספרים של מנויים
];

app.post('/api/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Missing phone' });
  if (!authorizedUsers.includes(phone)) {
    return res.status(403).json({ error: 'המספר אינו ברשימת המנויים' });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 3 * 60 * 1000;
  otpStore[phone] = { otp, expiresAt };
  try {
    await client.messages.create({
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:' + phone,
      body: `קוד הכניסה שלך הוא: ${otp} (תקף ל-3 דקות)`
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שליחת WhatsApp נכשלה' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Missing data' });
  const record = otpStore[phone];
  if (!record) return res.status(400).json({ error: 'לא נשלח קוד למספר זה' });
  if (Date.now() > record.expiresAt) return res.status(400).json({ error: 'הקוד פג תוקף' });
  if (otp !== record.otp) return res.status(400).json({ error: 'קוד שגוי' });
  delete otpStore[phone];
  res.json({ success: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
