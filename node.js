const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
admin.initializeApp({
    credential: admin.credential.cert(require("./seu.json")),
});
const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());
// Rota de teste
app.get("/", (req, res) => {
    res.send("API Firestore funcionando!");
});
// Criar usuário
app.post("/users", async (req, res) => {
    try {
        const { name, email, userType } = req.body;
        const userRef = db.collection("users").doc();
        await userRef.set({
            name,
            email,
            userType,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ id: userRef.id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});