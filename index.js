const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors()); // Esto permite que tu web se conecte al server
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/reset-drip', async (req, res) => {
    const { license_key } = req.body;
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
