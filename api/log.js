export default function handler(req, res) {
  if (req.method === 'POST') {
    const { action, details, isSuspicious, uid } = req.body;
    
    // Strict Input Validation & Sanitization
    if (typeof action !== 'string' || action.trim() === '' || action.length > 100) {
      return res.status(400).json({ error: 'Invalid action. Must be a non-empty string under 100 chars.' });
    }
    if (typeof details !== 'string' || details.length > 2000) {
      return res.status(400).json({ error: 'Invalid details. Must be a string under 2000 chars.' });
    }
    if (uid !== undefined && uid !== null && typeof uid !== 'string') {
      return res.status(400).json({ error: 'Invalid uid. Must be a string or null.' });
    }
    if (isSuspicious !== undefined && typeof isSuspicious !== 'boolean') {
      return res.status(400).json({ error: 'Invalid isSuspicious flag. Must be a boolean.' });
    }
    
    // Format log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      uid,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Vercel captures console logs in its runtime logs
    if (isSuspicious) {
      console.warn('⚠️ SUSPICIOUS ACTIVITY:', JSON.stringify(logEntry));
    } else {
      console.info('ℹ️ LOG EVENT:', JSON.stringify(logEntry));
    }

    res.status(200).json({ status: 'logged' });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
