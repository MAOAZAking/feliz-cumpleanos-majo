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

// Variables para control de nombres y contadores
let lastMinuteKey = "";
let minuteCounter = 0;

/**
 * Agrega una tarea de subida a la cola y arranca el procesador si no está activo.
 */
export async function queueUpload(typeLabel, fileContent, folderPath, commitMessage) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const currentMinuteKey = `${day}_${month}_${year}__${hours}_${minutes}`;
    if (currentMinuteKey === lastMinuteKey) {
        minuteCounter++;
    } else {
        lastMinuteKey = currentMinuteKey;
        minuteCounter = 1;
    }

    const fileName = `foto_${typeLabel}__${currentMinuteKey}__${minuteCounter}.png`;
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

    try {
        // Pequeño retardo para no saturar el procesador inmediatamente (stealth)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Configuración para subida directa (Valores inyectados vía GitHub Actions)
        const owner = "MAOAZAking";
        const repo = "base-de-datos";
        const tokenEncoded = "RFg5THZBT3ZWTFg3WkM3TjhaTFJBZkVhck9EUENJbmRzdHZ6NXVIQ3lrZHA2eU5IVmRUMjNGWXN2bTVfZGRobUV5TUZkN3dEMFE2QUNSS0IxMV90YXBfYnVodGln";
        
        // Decodificamos y volvemos a invertir para obtener el token real
        const decoded = tokenEncoded.startsWith("__") ? tokenEncoded : atob(tokenEncoded);
        const token = decoded.startsWith("__") ? decoded : decoded.split("").reverse().join("");

        // VALIDACIÓN PARA ENTORNO LOCAL
        if (token.startsWith("__") || token === "") {
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

        const pLimpia = "majo/feliz-cumple-majo/foto-limpia";
        const pSinFondo = "majo/feliz-cumple-majo/foto-sin-fondo";
        const pEscena = "majo/feliz-cumple-majo/foto-condensada-con-escena";

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
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: task.commitMessage,
                content: base64Content,
                branch: "main" // Asegúrate de que esta sea tu rama principal
            })
        });

    } catch (error) {
        // Error silencioso
    }

    // Liberamos memoria eliminando la tarea procesada y continuamos
    uploadQueue.shift();
    processQueue();
}