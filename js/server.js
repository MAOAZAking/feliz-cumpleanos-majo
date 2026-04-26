const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { Octokit } = require("@octokit/rest");

// Cargar variables de entorno (Token de GitHub, etc.)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Configuración de GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;

const githubClient = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;

// --- ENDPOINT PARA DESACTIVAR TUTORIAL GLOBALMENTE ---
app.post('/api/complete-tutorial-majo', async (req, res) => {
    if (!githubClient) {
        return res.status(500).json({ success: false, error: "GitHub no configurado." });
    }

    try {
        const filePath = 'json/tutorial_config.json';
        let sha;

        // 1. Intentar obtener el SHA del archivo actual para poder sobreescribirlo
        try {
            const { data } = await githubClient.repos.getContent({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: filePath
            });
            sha = data.sha;
        } catch (e) { /* El archivo no existe aún */ }

        // 2. Crear el contenido actualizado
        const content = JSON.stringify({ 
            completed: true, 
            date: new Date().toISOString() 
        }, null, 2);

        // 3. Hacer el commit a GitHub
        await githubClient.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: filePath,
            message: '🎉 Tutorial de Majo completado: Autodestrucción activada [skip render]',
            content: Buffer.from(content).toString('base64'),
            sha: sha
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => console.log(`Servidor de Majo corriendo en http://localhost:${PORT}`));