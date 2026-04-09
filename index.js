const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');

// Inicializar Express
const app = express();
app.use(cors());
app.use(express.json());

// Inicializar Firebase Admin (Asegúrate de tener el archivo serviceAccountKey.json en la misma carpeta)
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://clientesvip-be9bd.firebaseio.com" // Tu URL de base de datos
});

const PORT = process.env.PORT || 3000;

// ==========================================
// RUTA 1: LOGIN DE USUARIOS
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Faltan datos." });
    }

    try {
        const db = admin.database();
        const usersRef = db.ref("web_users");
        const snapshot = await usersRef.orderByChild("username").equalTo(username).once("value");

        if (!snapshot.exists()) {
            return res.status(401).json({ success: false, message: "Usuario no encontrado." });
        }

        let userData = null;
        let userUid = null;
        
        snapshot.forEach(child => {
            userData = child.val();
            userUid = child.key;
        });

        // Validar contraseña
        if (userData.password !== password) {
             return res.status(401).json({ success: false, message: "Contraseña incorrecta." });
        }

        res.json({ success: true, uid: userUid, subscription: userData.subscription });
    } catch (error) {
        console.error("Error en Login:", error);
        res.status(500).json({ success: false, message: "Error en el servidor de Firebase." });
    }
});

// ==========================================
// RUTA 2: RESET DE DRIP CON VALIDACIÓN
// ==========================================
app.post('/reset-drip-premium', async (req, res) => {
    const { license_key, uid } = req.body;

    if (!uid) return res.status(401).json({ success: false, message: "Sesión no válida.", requirePay: false });
    if (!license_key) return res.status(400).json({ success: false, message: "Falta la key.", requirePay: false });

    try {
        const db = admin.database();
        const userSnap = await db.ref(`web_users/${uid}`).once("value");
        
        if (!userSnap.exists()) {
            return res.status(401).json({ success: false, message: "Usuario no existe.", requirePay: false });
        }

        const userData = userSnap.val();
        const now = Date.now();

        // --- VALIDAR MEMBRESÍA ---
        if (!userData.subscription || userData.subscription === "free") {
            return res.status(403).json({ success: false, message: "Necesitas una membresía para hacer resets.", requirePay: true });
        }

        if (userData.subscription === "monthly" && userData.expiresAt < now) {
            // Se le acabó el mes, lo pasamos a free
            await db.ref(`web_users/${uid}`).update({ subscription: "free" });
            return res.status(403).json({ success: false, message: "Tu membresía mensual ha expirado.", requirePay: true });
        }

        // --- EJECUTAR RESET MAESTRO ---
        const MASTER_USER_ID = "TLI0oWrruTZlOYYMG5On6WkAL2P2"; // El UID que funciona en Ezteam

        const response = await axios({
            method: 'post',
            url: 'https://ezteamsociety.com/api/drip_reset.php',
            data: `license_key=${license_key}&user_id=${MASTER_USER_ID}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://ezteamsociety.com',
                'Referer': 'https://ezteamsociety.com/dashboard.php'
            }
        });

        // Registrar estadisticas del usuario
        await db.ref(`web_users/${uid}`).update({ reset_count: (userData.reset_count || 0) + 1 });

        // Devolver lo que dijo Ezteam
        res.json(response.data);

    } catch (error) {
        console.error("Error en Reset:", error.message);
        res.status(500).json({ success: false, message: "Error conectando con el servidor maestro de Ezteam.", requirePay: false });
    }
});

// Arrancar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor SociosXit corriendo en el puerto ${PORT}`);
});
