/* ==========================================================================
   POST /api/submit — Vercel serverless function
   Receives a quote form (multipart/form-data) and emails it, with the
   uploaded photos attached, to the agency mailbox.

   Environment variables (Vercel → Project → Settings → Environment Variables):
     SMTP_HOST   e.g. smtp.gmail.com (Google Workspace), smtp.office365.com, smtp.hostinger.com
     SMTP_PORT   465 (SSL) or 587 (STARTTLS). Default 465
     SMTP_USER   the mailbox login, e.g. contacts@savings-solutions.com
     SMTP_PASS   its password or app password
     MAIL_TO     optional, default contacts@savings-solutions.com (comma-separate for several)
     MAIL_FROM   optional, default SMTP_USER
   ========================================================================== */
const Busboy = require('busboy');
const nodemailer = require('nodemailer');

const MAIL_TO = process.env.MAIL_TO || 'contacts@savings-solutions.com';
const MAX_FILE = 4 * 1024 * 1024; // Vercel caps a request body at 4.5 MB
const MAX_FILES = 30;

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    let bb;
    try {
      bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE, files: MAX_FILES, fields: 400, fieldSize: 200 * 1024 } });
    } catch (err) {
      reject(err);
      return;
    }
    const fields = {};
    const files = [];
    let tooBig = false;
    bb.on('field', (name, value) => { fields[name] = value; });
    bb.on('file', (name, stream, info) => {
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('limit', () => { tooBig = true; });
      stream.on('end', () => {
        if (!info.filename) return;
        files.push({ field: name, filename: info.filename, contentType: info.mimeType, content: Buffer.concat(chunks) });
      });
    });
    bb.on('error', reject);
    bb.on('close', () => (tooBig ? reject(Object.assign(new Error('file too large'), { status: 413 })) : resolve({ fields, files })));
    req.pipe(bb);
  });
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function jsonField(fields, name, fallback) {
  try { return JSON.parse(fields[name] || ''); } catch (e) { return fallback; }
}

function buildEmail(fields, files) {
  const title = String(fields._title || fields._form || 'Quote form').slice(0, 120);
  const name = String(fields._name || '').slice(0, 120);
  const answers = jsonField(fields, '_answers', []).slice(0, 400);
  const attribution = jsonField(fields, '_attribution', {});
  const labels = jsonField(fields, '_file_labels', {});
  const pt = fields._language === 'pt';

  const rows = answers.map((a) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;vertical-align:top;width:45%">${esc(a.label)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;white-space:pre-wrap">${esc(a.value)}</td></tr>`).join('');
  const fileList = files.map((f) => `<li>${esc(labels[f.field] || f.field)}: ${esc(f.filename)}</li>`).join('');
  const source = Object.keys(attribution).map((k) => `${esc(k)}=${esc(attribution[k])}`).join(' · ');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;max-width:720px">
<h2 style="margin:0 0 4px">${esc(pt ? 'Nova cotação' : 'New quote request')}: ${esc(title)}</h2>
<p style="margin:0 0 16px;color:#555">${esc(name)}${fields._language ? ' · ' + (pt ? 'Atendimento em português' : 'Prefers English') : ''}</p>
<table style="border-collapse:collapse;width:100%">${rows}</table>
${files.length ? `<h3 style="margin:24px 0 8px">${pt ? 'Anexos' : 'Attachments'} (${files.length})</h3><ul>${fileList}</ul>` : ''}
<p style="margin-top:24px;color:#888;font-size:12px">${esc(fields._page || '')}${source ? '<br>' + source : ''}<br>${new Date().toISOString()}</p>
</div>`;

  const text = [`${pt ? 'Nova cotação' : 'New quote request'}: ${title}`, name, '']
    .concat(answers.map((a) => `${a.label}: ${a.value}`))
    .concat(files.length ? ['', `${pt ? 'Anexos' : 'Attachments'}:`].concat(files.map((f) => `- ${labels[f.field] || f.field}: ${f.filename}`)) : [])
    .join('\n');

  return {
    subject: `${pt ? 'Nova cotação' : 'New quote'}: ${title}${name ? ' · ' + name : ''}`,
    html,
    text,
    attachments: files.map((f, i) => ({ filename: `${String(i + 1).padStart(2, '0')}-${f.filename}`, content: f.content, contentType: f.contentType }))
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, code: 'method_not_allowed' });
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(503).json({ ok: false, code: 'not_configured' });
  }

  let data;
  try {
    data = await parseMultipart(req);
  } catch (err) {
    return res.status(err.status || 400).json({ ok: false, code: err.status === 413 ? 'too_large' : 'bad_request' });
  }

  // Spam trap: real visitors never fill this hidden field
  if (data.fields._gotcha) return res.status(200).json({ ok: true });
  if (data.fields.consent !== 'yes') return res.status(400).json({ ok: false, code: 'consent_required' });

  const email = buildEmail(data.fields, data.files);
  const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.fields._email || '') ? data.fields._email : undefined;
  const port = Number(process.env.SMTP_PORT || 465);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: `"4 Savings Solutions | Site" <${process.env.MAIL_FROM || process.env.SMTP_USER}>`,
      to: MAIL_TO,
      replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachments: email.attachments
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('sendMail failed:', err && err.code, err && err.responseCode, err && err.message);
    // Short, non-sensitive reason so the form can show it (e.g. EAUTH = wrong user/password, ETIMEDOUT = port)
    return res.status(502).json({ ok: false, code: 'send_failed', reason: (err && (err.code || err.responseCode)) || 'unknown' });
  }
};
