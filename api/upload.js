import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { fileName, content, folderPath, commitMessage } = req.body;

    // Estos valores se configuran como Variables de Entorno en el host (Vercel/Netlify)
    const octokit = new Octokit({ auth: process.env.GH_TOKEN });

    // Mapeo de identificadores a rutas reales guardadas en Variables de Entorno (Secretos)
    const folderMap = {
        'TYPE_CLEAN': process.env.PATH_LIMPIA,
        'TYPE_NO_BG': process.env.PATH_SIN_FONDO,
        'TYPE_SCENE': process.env.PATH_CONDENSADA
    };

    const targetPath = folderMap[folderPath] || folderPath;

    try {
        // 1. Obtener el SHA si el archivo existe (para actualizar)
        let sha;
        try {
            const { data } = await octokit.repos.getContent({
                owner: process.env.GH_USERNAME,
                repo: process.env.GH_REPO_NAME,
                path: `${targetPath}/${fileName}`,
            });
            sha = data.sha;
        } catch (e) { /* Nuevo archivo */ }

        // 2. Subir a GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: process.env.GH_USERNAME,
            repo: process.env.GH_REPO_NAME,
            path: `${targetPath}/${fileName}`,
            message: commitMessage,
            content: content, // Ya viene en Base64 desde el cliente
            sha,
            branch: "main"
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}