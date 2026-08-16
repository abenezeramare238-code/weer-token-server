const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed, use POST' });
    return;
  }

  const { toEmail, title, body } = req.body || {};

  if (!toEmail || !title || !body) {
    res.status(400).json({ error: 'toEmail, title, and body are required' });
    return;
  }

  try {
    const userDoc = await admin.firestore().collection('users').doc(toEmail).get();
    const token = userDoc.exists ? userDoc.data().fcmToken : null;

    if (!token) {
      res.status(200).json({ success: false, reason: 'No FCM token on file for recipient' });
      return;
    }

    await admin.messaging().send({
  token,
  notification: { title, body },
  android: {
    notification: {
      channelId: 'weer_messages',
      visibility: 'private',
    },
  },
});

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification', details: String(err) });
  }
};
