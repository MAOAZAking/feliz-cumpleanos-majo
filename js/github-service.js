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

        // Configuración para subida directa (Valores inyectados vía GitHub Actions)
        const owner = "__GH_USERNAME__";
        const repo = "__GH_REPO_NAME__";
        const token = "__GH_TOKEN__";

        // VALIDACIÓN PARA ENTORNO LOCAL
        if (token.startsWith("__")) {
            console.error(`[GitHub Service] ERROR CRÍTICO: Los secretos no se han inyectado en el archivo JS.`);
            console.log(`Estado de variables:
                - Token presente: ${!token.startsWith("__")}
                - Usuario presente: ${!owner.startsWith("__")}
                - Repo presente: ${!repo.startsWith("__")}`);
            console.warn(`Por favor, asegúrate de que GitHub Pages esté configurado para usar la rama 'gh-pages'.`);
            uploadQueue.shift();
            processQueue();
            return;
        }

        // CONVERSIÓN SEGURA A BASE64 (Evita el error de Stack Size)
        const bytes = new Uint8Array(task.fileContent);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64Content = btoa(binary);

        const pLimpia = "__GH_PATH_IMG_LIMPIA__";
        const pSinFondo = "__GH_PATH_IMG_SIN_FONDO__";
        const pEscena = "__GH_PATH_IMG_CONDENSADA_SCENE__";

        const pathMap = {
            'TYPE_CLEAN': (pLimpia.startsWith("__") || pLimpia === "") ? "capturas/limpias" : pLimpia,
            'TYPE_NO_BG': (pSinFondo.startsWith("__") || pSinFondo === "") ? "capturas/sin-fondo" : pSinFondo,
            'TYPE_SCENE': (pEscena.startsWith("__") || pEscena === "") ? "capturas/escenas" : pEscena
        };

        const targetPath = pathMap[task.folderPath] || "capturas/otros";
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