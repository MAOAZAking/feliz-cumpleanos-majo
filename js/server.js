// --- ENDPOINT PARA DESACTIVAR TUTORIAL GLOBALMENTE (PROYECTO MAJO) ---
app.post('/api/complete-tutorial-majo', async (req, res) => {
    if (!githubClient || !GITHUB_OWNER || !GITHUB_REPO) {
        return res.status(500).json({ success: false, error: "GitHub no configurado." });
    }

    const unlock = await gitMutex.lock();
    try {
        const path = 'json/tutorial_config.json'; 
        let sha;
        try {
            // Intentamos obtener el archivo si ya existe
            const { data: fileData } = await githubClient.repos.getContent({
                owner: GITHUB_OWNER, repo: GITHUB_REPO, path: path
            });
            sha = fileData.sha;
        } catch(e) { /* El archivo no existe aún, se creará */ }

        const content = JSON.stringify({ completed: true, date: new Date().toISOString() }, null, 2);
        await githubClient.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER, repo: GITHUB_REPO,
            path: path,
            message: '🎉 Tutorial de Majo completado: Autodestrucción global activada [skip render]',
            content: Buffer.from(content).toString('base64'),
            sha: sha
        });
        
        console.log("🔒 Tutorial de Majo desactivado permanentemente en la nube.");
        res.json({ success: true });
    } catch (e) {
        console.error("Error en autodestrucción:", e.message);
        res.status(500).json({ success: false, error: e.message });
    } finally {
        unlock();
    }
});