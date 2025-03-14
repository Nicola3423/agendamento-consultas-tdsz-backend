const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors({ origin: true }));

const SECRET_KEY = "chave-secreta";

// Verifica se está rodando no emulador
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

// Inicializa o Firebase Admin corretamente
if (!isEmulator) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: "https://app-medical-appointments.firebaseio.com"
    });
} else {
    admin.initializeApp({ projectId: "app-medical-appointments" });
}

const db = admin.firestore();

// Middleware de autenticação JWT
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token ausente" });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Token inválido" });
    }
};

// Autenticação - Login de usuário
app.post("/auth/login", async (req, res) => {
    const { email, senha } = req.body;
    const snapshot = await db.collection("usuarios").where("email", "==", email).get();
    if (snapshot.empty) return res.status(401).json({ error: "Usuário não encontrado" });

    const user = snapshot.docs[0].data();
    if (user.senha !== senha) return res.status(401).json({ error: "Senha inválida" });

    const token = jwt.sign({ id: snapshot.docs[0].id, perfil: user.perfil }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
});

// Endpoint protegido para obter perfil do usuário autenticado
app.get("/pacientes/perfil", authMiddleware, async (req, res) => {
    const userRef = db.collection("usuarios").doc(req.user.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(userDoc.data());
});

// Criar usuário - Verifica se o email já está cadastrado antes de criar
app.post("/auth/register", async (req, res) => {
    const { nome, email, senha, perfil } = req.body;

    // Verifica se já existe um usuário com o mesmo e-mail
    const snapshot = await db.collection("usuarios").where("email", "==", email).get();
    if (!snapshot.empty) {
        return res.status(400).json({ error: "Usuário já existente" });
    }

    // Se não existir, cria um novo usuário
    const novoUsuario = await db.collection("usuarios").add({ nome, email, senha, perfil });
    res.json({ id: novoUsuario.id });
});

// Exportando a API para o Firebase Functions
exports.api = functions.https.onRequest(app);


// Cadastrar uma especialidade
app.post("/especialidades", async (req, res) => {
    const { nome, descricao } = req.body;
    if (!nome || !descricao) {
        return res.status(400).json({ error: "Nome e descrição são obrigatórios." });
    }
    try {
        const especialidadeRef = await db.collection("especialidades").add({ nome, descricao });
        res.status(201).json({ id: especialidadeRef.id, nome, descricao });
    } catch (error) {
        res.status(500).json({ error: "Erro ao cadastrar especialidade.", details: error.message });
    }
});

// Listar especialidades
app.get("/especialidades", async (req, res) => {
    try {
        const snapshot = await db.collection("especialidades").get();
        const especialidades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(especialidades);
    } catch (error) {
        res.status(500).json({ error: "Erro ao listar especialidades.", details: error.message });
    }
});

// Agendar uma consulta
app.post("/consultas", authMiddleware, async (req, res) => {
    const { id_paciente, id_medico, data, hora, especialidade } = req.body;
    if (!id_paciente || !id_medico || !data || !hora || !especialidade) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }
    try {
        const consultaRef = await db.collection("consultas").add({ paciente: id_paciente, medico: id_medico, data, hora, especialidade, status: "Agendada" });
        res.status(201).json({ id: consultaRef.id, paciente: id_paciente, medico: id_medico, data, hora, status: "Agendada" });
    } catch (error) {
        res.status(500).json({ error: "Erro ao agendar consulta.", details: error.message });
    }
});

// Cancelar uma consulta
app.delete("/consultas/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const consultaRef = db.collection("consultas").doc(id);
        const consultaDoc = await consultaRef.get();
        if (!consultaDoc.exists) {
            return res.status(404).json({ error: "Consulta não encontrada." });
        }
        await consultaRef.delete();
        res.status(200).json({ message: "Consulta cancelada com sucesso." });
    } catch (error) {
        res.status(500).json({ error: "Erro ao cancelar consulta.", details: error.message });
    }
});

// Listar consultas de um médico
app.get("/medicos/:id/consultas", authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const consultasSnapshot = await db.collection("consultas").where("medico", "==", id).get();
        const consultas = consultasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(consultas);
    } catch (error) {
        res.status(500).json({ error: "Erro ao listar consultas.", details: error.message });
    }
});