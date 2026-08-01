// Vercel serverless function that generates a short-lived Agora RTC
// token on demand. Deployed separately from the Flutter app (see
// README section "6b. Agora (calling) setup") so the app never needs
// to embed the Agora App Certificate itself.
//
// GET /api/agora-token?channelName=weer_private_chat&uid=12345

const { RtcTokenBuilder, RtcRole } = require('agora-token');

// The App ID is not secret and is fine to leave hardcoded (it's already
// embedded in the Flutter app too). The App Certificate IS secret -
// it must be set as an environment variable in the Vercel project
// settings, never committed to the repo.
const APP_ID = process.env.AGORA_APP_ID || 'c10b9657b062455a92329b2f04156ee9';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

module.exports = (req, res) => {
  // Allow the Flutter app (and easy testing from a browser) to call this.
  res.setHeader('Access-Control-Allow-Origin', '*');

  const channelName = req.query.channelName;
  const uid = parseInt(req.query.uid || '0', 10);

  if (!channelName) {
    res.status(400).json({ error: 'channelName query parameter is required' });
    return;
  }

  if (!APP_CERTIFICATE) {
    res.status(500).json({
      error: 'Server misconfigured: AGORA_APP_CERTIFICATE environment variable is not set',
    });
    return;
  }

  const expirationTimeInSeconds = 3600; // token valid for 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs,
      privilegeExpiredTs
    );

    res.status(200).json({ token, expiresAt: privilegeExpiredTs });
  } catch (err) {
    res.status(500).json({ error: 'Token generation failed', details: String(err) });
  }
};
