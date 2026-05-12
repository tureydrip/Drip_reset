const express = require('express');
const axios = require('axios');
const cors = require('cors');
const admin = require('firebase-admin');

// Inicializar Firebase Admin para poder inyectar datos en Realtime Database
try {
    if (!admin.apps.length) {
        // Requiere tu archivo serviceAccountKey.json de Firebase en el servidor
        admin.initializeApp({
            credential: admin.credential.cert(require('./serviceAccountKey.json')),
            databaseURL: "https://clientesvip-be9bd-default-rtdb.firebaseio.com" // La URL de tu base de datos actual
        });
    }
} catch (error) {
    console.log("Aviso: Firebase Admin no inicializado. Asegúrate de tener serviceAccountKey.json en la raíz del proyecto.");
}

const app = express();

app.use(cors()); // Esto permite que tu web se conecte al server
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/reset-drip', async (req, res) => {
    // Recibimos uid_cliente desde tu web para saber a qué usuario inyectarle la key
    const { license_key, uid_cliente } = req.body;
    const userId = "TLI0oWrruTZlOYYMG5On6WkAL2P2"; // Tu ID seguro en el server

    if (!license_key) {
        return res.status(400).json({ ok: false, message: "Falta la license_key" });
    }

    try {
        // Aquí hacemos la petición simulando ser un navegador
        const response = await axios({
            method: 'post',
            url: 'https://ezteamsociety.com/api/drip_reset.php',
            data: `license_key=${license_key}&user_id=${userId}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://ezteamsociety.com',
                'Referer': 'https://ezteamsociety.com/dashboard.php'
            }
        });

        // ---------------------------------------------------------
        // LÓGICA DE INYECCIÓN DE KEY AL USUARIO (Realtime Database)
        // ---------------------------------------------------------
        if (uid_cliente && admin.apps.length > 0) {
            try {
                const db = admin.database();
                // Limpiamos la key para usarla como nombre del nodo (Firebase no permite caracteres como . # $ [ ] en las rutas)
                const safeKey = license_key.replace(/[.#$\[\]]/g, '_');
                
                // Buscamos la ruta del usuario para guardarle sus keys
                const keyRef = db.ref(`users/${uid_cliente}/keys_drip/${safeKey}`);
                
                const snapshot = await keyRef.once('value');
                if (!snapshot.exists()) {
                    // Si el usuario no tiene la key guardada, el servidor se la inyecta
                    await keyRef.set({
                        key_original: license_key,
                        fecha_inyeccion: new Date().toISOString()
                    });
                    console.log(`[LUCK XIT] Key inyectada a la cuenta del usuario: ${uid_cliente}`);
                } else {
                    console.log(`[LUCK XIT] El usuario ${uid_cliente} ya tenía esta key en su cuenta.`);
                }
            } catch (dbError) {
                console.error("Error inyectando en DB:", dbError.message);
                // Si la inyección falla, no se rompe la web, sigue con el proceso normal
            }
        }

        // Le regresamos a tu web lo que diga Ezteam
        res.json(response.data);

    } catch (error) {
        console.error("Error en el proxy:", error.message);
        res.status(500).json({ ok: false, message: "Error conectando con Ezteam" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor LUCK XIT corriendo en puerto ${PORT}`);
});
