// Configuración de rutas (pueden ser públicas, no son críticas)
export const GH_CONFIG = {
    paths: {
        limpia: 'fotos/feliz-cumple-majo/foto-limpia',
        sinFondo: 'fotos/feliz-cumple-majo/foto-sin-fondo',
        condensada: 'fotos/feliz-cumple-majo/foto-condensada-con-escena'
    }
};

// Cola interna de tareas
const uploadQueue = [];
let isProcessing = false;

/**
 * Agrega una tarea de subida a la cola y arranca el procesador si no está activo.
 */
export async function queueUpload(fileName, fileContent, folderPath, commitMessage) {
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

        const base64Content = btoa(String.fromCharCode(...new Uint8Array(task.fileContent)));
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: task.fileName, content: base64Content, folderPath: task.folderPath, commitMessage: task.commitMessage })
        });

    } catch (error) {
        // Fallo silencioso en producción
    }

    // Liberamos memoria eliminando la tarea procesada y continuamos
    uploadQueue.shift();
    processQueue();
}