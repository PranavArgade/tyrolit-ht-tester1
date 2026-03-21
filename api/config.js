export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      apiKey: process.env.FIREBASE_API_KEY || "AIzaSyB_3hCOBFKGMxzqd5ByK3PbBZb4F3IrTPI",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "raspberry-pi-iot-f7707.firebaseapp.com",
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://raspberry-pi-iot-f7707-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: process.env.FIREBASE_PROJECT_ID || "raspberry-pi-iot-f7707",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "raspberry-pi-iot-f7707.firebasestorage.app",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "679880318889",
      appId: process.env.FIREBASE_APP_ID || "1:679880318889:web:f0014e5cdac0098172aeb8",
      appCheckKey: process.env.FIREBASE_APP_CHECK_KEY || "6LehCYssAAAAAEqhs40WZbE-Qvi1ii1QaNdq-TGi"
    });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
