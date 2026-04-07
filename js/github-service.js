// Configuración de rutas (pueden ser públicas, no son críticas)
export const GH_CONFIG = {
    paths: {
        limpia: 'fotos/feliz-cumple-majo/foto-limpia',
        sinFondo: 'fotos/feliz-cumple-majo/foto-sin-fondo',
        condensada: 'fotos/feliz-cumple-majo/foto-condensada-con-escena'
    }
};

export async function uploadToGitHub(fileName, fileContent, folderPath, commitMessage) {
    // Convertimos a Base64 para enviarlo al backend
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileContent)));

    try {
        // Llamamos a nuestra propia API en lugar de a GitHub directamente
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName, content: base64Content, folderPath, commitMessage })
        });

        if (!response.ok) {
            throw new Error("Error en el servidor intermediario");
        }

        console.log(`Foto ${fileName} procesada por el backend.`);
        return true;
    } catch (error) {
        console.error("Error de subida:", error);
        return false;
    }
}