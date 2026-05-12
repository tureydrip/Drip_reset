const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } = require('firebase/firestore');

// Tu configuración exacta de Firebase (ezteam-3e6f3)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC5Og3mYzKROltzRfX5BhW0YexVYqYtHsI",
  authDomain: "ezteam-3e6f3.firebaseapp.com",
  projectId: "ezteam-3e6f3",
  storageBucket: "ezteam-3e6f3.firebasestorage.app",
  messagingSenderId: "30544278085",
  appId: "1:30544278085:web:e1cb049342d8acafe9292c"
};

// Inicializamos Firebase con tu configuración
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(firebaseApp);

const app = express();

app.use(cors()); // Esto permite que tu web se conecte al server
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/reset-drip', async (req, res) => {
    const { license_key, uid_cliente } = req.body;
    const userId = "TLI0oWrruTZlOYYMG5On6WkAL2P2"; // Tu ID seguro en el server

    if (!license_key) {
        return res.status(400).json({ ok: false, message: "Falta la license_key" });
    }

    try {
        // Aquí hacemos la petición simulando ser un navegador a Ezteam
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
        // LÓGICA DE INYECCIÓN EN FIRESTORE CON TU CONFIGURACIÓN
        // ---------------------------------------------------------
        if (uid_cliente) {
            try {
                const ordenesRef = collection(db, 'ordenes');
                
                // Buscamos si el usuario ya tiene esta key en su historial
                const q = query(
                    ordenesRef, 
                    where('userId', '==', uid_cliente), 
                    where('clave', '==', license_key)
                );
                const querySnapshot = await getDocs(q);

                // Si no la tiene, se la inyectamos como una orden completada
                if (querySnapshot.empty) {
                    await addDoc(ordenesRef, {
                        userId: uid_cliente,
                        nombre: "Drip Client (Inyectada)",
                        clave: license_key,
                        precio: 0,
                        estado: "completado",
                        numeroOrden: "INJ-" + Math.floor(Math.random() * 1000000), // Genera ID falso
                        duracion: "Lifetime",
                        fecha: serverTimestamp()
                    });
                    console.log(`[LUCK XIT] Key inyectada exitosamente en Firestore para el usuario: ${uid_cliente}`);
                } else {
                    console.log(`[LUCK XIT] El usuario ${uid_cliente} ya tiene esta key en su historial de Firestore.`);
                }
            } catch (dbError) {
                // Aviso: Si las reglas de seguridad (Security Rules) de tu Firestore bloquean 
                // la escritura desde clientes sin autenticar, esto tirará error de permisos.
                console.error("Error inyectando en Firestore:", dbError.message);
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
