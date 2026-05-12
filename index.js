const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Tu configuración de Firebase
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC5Og3mYzKROltzRfX5BhW0YexVYqYtHsI",
  authDomain: "ezteam-3e6f3.firebaseapp.com",
  projectId: "ezteam-3e6f3",
  storageBucket: "ezteam-3e6f3.firebasestorage.app",
  messagingSenderId: "30544278085",
  appId: "1:30544278085:web:e1cb049342d8acafe9292c"
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/reset-drip', async (req, res) => {
    const { license_key, uid_cliente } = req.body;
    const userId = "TLI0oWrruTZlOYYMG5On6WkAL2P2";

    if (!license_key) {
        return res.status(400).json({ ok: false, message: "Falta la license_key" });
    }

    try {
        const response = await axios({
            method: 'post',
            url: 'https://ezteamsociety.com/api/drip_reset.php',
            data: `license_key=${license_key}&user_id=${userId}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://ezteamsociety.com',
                'Referer': 'https://ezteamsociety.com/dashboard.php'
            }
        });

        if (uid_cliente) {
            try {
                // INICIAMOS SESIÓN EN EL SERVIDOR PARA SALTARNOS LAS REGLAS DE SEGURIDAD
                // Pon un correo y contraseña de un usuario administrador de ezteam-3e6f3
                await signInWithEmailAndPassword(auth, "feitanacount@gmail.com", "serello099");

                const ordenesRef = collection(db, 'ordenes');
                const q = query(
                    ordenesRef, 
                    where('userId', '==', uid_cliente), 
                    where('clave', '==', license_key)
                );
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    await addDoc(ordenesRef, {
                        userId: uid_cliente,
                        nombre: "Drip Client (Inyectada)",
                        clave: license_key,
                        precio: 0,
                        estado: "completado",
                        numeroOrden: "INJ-" + Math.floor(Math.random() * 1000000),
                        duracion: "Lifetime",
                        fecha: serverTimestamp()
                    });
                    console.log(`[LUCK XIT] Key inyectada exitosamente en Firestore para el usuario: ${uid_cliente}`);
                } else {
                    console.log(`[LUCK XIT] El usuario ${uid_cliente} ya tiene esta key en Firestore.`);
                }
            } catch (dbError) {
                console.error("Error inyectando en Firestore:", dbError.message);
            }
        }

        res.json(response.data);

    } catch (error) {
        console.error("Error en el proxy:", error.message);
        res.status(500).json({ ok: false, message: "Error conectando con Ezteam" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor LUCK XIT corriendo en puerto ${PORT}`);
});
