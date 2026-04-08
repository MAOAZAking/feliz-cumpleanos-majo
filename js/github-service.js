// Configuración de rutas (pueden ser públicas, no son críticas)
export const GH_CONFIG = {
    paths: {
        limpia: 'TYPE_CLEAN',
        sinFondo: 'TYPE_NO_BG',
        condensada: 'TYPE_SCENE'
    }
};

// Cola interna de tareas
const uploadQueue = [];
let isProcessing = false;

/**
 * Agrega una tarea de subida a la cola y arranca el procesador si no está activo.
 */
export async function queueUpload(fileName, fileContent, folderPath, commitMessage) {
    console.log(`[GitHub Service] Encolando subida: ${fileName} para tipo: ${folderPath}`);
    uploadQueue.push({ fileName, fileContent, folderPath, commitMessage });
    if (!isProcessing) {
        processQueue();
    }
}

/**
 * Procesador de la cola: ejecuta las subidas secuencialmente "bajo cuerda".
 */
async function processQueue() {
    if (uploadQueue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const task = uploadQueue[0];
    console.log(`[GitHub Service] Procesando subida: ${task.fileName}...`);

    try {
        // Pequeño retardo para no saturar el procesador inmediatamente (stealth)
        await new Promise(resolve => setTimeout(resolve, 1500));

        const base64Content = btoa(String.fromCharCode(...new Uint8Array(task.fileContent)));

        // Configuración para subida directa (Valores inyectados vía GitHub Actions)
        const owner = "__GH_OWNER__";
        const repo = "__GH_REPO_NAME__";
        const token = "__GH_TOKEN__";
        const pathMap = {
            'TYPE_CLEAN': "__PATH_LIMPIA__",
            'TYPE_NO_BG': "__PATH_SIN_FONDO__",
            'TYPE_SCENE': "__PATH_CONDENSADA__"
        };

        const targetPath = pathMap[task.folderPath] || task.folderPath;
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}/${task.fileName}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: task.commitMessage,
                content: base64Content,
                branch: "main" // Asegúrate de que esta sea tu rama principal
            })
        });

        if (response.ok) {
            console.log(`[GitHub Service] Éxito al subir: ${task.fileName}`);
        } else {
            const errorMsg = await response.text();
            console.error(`[GitHub Service] Error en servidor para ${task.fileName}:`, errorMsg);
        }

    } catch (error) {
        console.error(`[GitHub Service] Error crítico al subir ${task.fileName}:`, error);
    }

    // Liberamos memoria eliminando la tarea procesada y continuamos
    uploadQueue.shift();
    processQueue();
}