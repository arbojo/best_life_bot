const { exec } = require('child_process');

function autoSave() {
    console.log(`[Auto-Save] Ejecutando respaldo automático a Github... - ${new Date().toLocaleString()}`);
    exec('git add . && git commit -m "Auto-save de sistema" && git push', (error, stdout, stderr) => {
        if (error) {
            console.error(`[Auto-Save] Error: ${error.message}`);
            return;
        }
        if (stderr && !stderr.includes('Warning') && !stderr.includes('warning') && !stderr.includes('To https://github.com')) {
            console.error(`[Auto-Save] git stderr: ${stderr}`);
        }
        console.log(`[Auto-Save] Respaldo completado a las ${new Date().toLocaleTimeString()}`);
    });
}

// Ejecutar cada 15 minutos (15 * 60 * 1000 milisegundos)
setInterval(autoSave, 15 * 60 * 1000);

console.log('Servicio de Auto-Save iniciado (se ejecutará cada 15 minutos).');

// Hacer un guardado inicial al arrancar
autoSave();
