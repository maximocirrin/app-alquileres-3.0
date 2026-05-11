const { optimizeImageToWebP } = require('../helpers/imageOptimizer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Controller endpoint to upload property images.
 * Expects an array of files in req.files and a property id in req.body.propiedad_id.
 * Typically used with Express and Multer.
 */
async function uploadPropertyImages(req, res) {
    try {
        const { propiedad_id } = req.body;
        const files = req.files;

        // 1. Validaciones
        if (!propiedad_id) {
            return res.status(400).json({ error: 'El parámetro propiedad_id es requerido.' });
        }

        if (!files || files.length < 5 || files.length > 50) {
            return res.status(400).json({ 
                error: `Cantidad de imágenes inválida. Se recibieron ${files ? files.length : 0}. Deben ser un mínimo de 5 y un máximo de 50 imágenes.` 
            });
        }

        // 2. Procesamiento concurrente y subida a Supabase Storage
        const uploadPromises = files.map(async (file, index) => {
            // Optimizar imagen a WebP con max-width 1920px
            const optimizedBuffer = await optimizeImageToWebP(file.buffer);
            
            // Generar ruta única en el bucket
            const fileName = `${Date.now()}-${index}.webp`;
            const storagePath = `propiedades/${propiedad_id}/${fileName}`;

            // Subir al bucket (asumiendo que se llama 'propiedades_multimedia')
            const { data: storageData, error: storageError } = await supabase
                .storage
                .from('propiedades_multimedia')
                .upload(storagePath, optimizedBuffer, {
                    contentType: 'image/webp',
                    upsert: false
                });

            if (storageError) {
                throw new Error(`Error al subir la imagen ${index}: ${storageError.message}`);
            }

            // Obtener URL pública (si el bucket es público)
            const { data: publicUrlData } = supabase
                .storage
                .from('propiedades_multimedia')
                .getPublicUrl(storagePath);

            return {
                propiedad_id: propiedad_id,
                url: publicUrlData.publicUrl,
                storage_path: storagePath,
                orden: index + 1 // Mantener orden según el array recibido
            };
        });

        // Esperar a que todas las imágenes se optimicen y suban
        const uploadedImagesMetadata = await Promise.all(uploadPromises);

        // 3. Guardar registros relacionales en la DB
        const { data: dbData, error: dbError } = await supabase
            .from('propiedad_imagenes')
            .insert(uploadedImagesMetadata)
            .select();

        if (dbError) {
            throw new Error(`Error al registrar en la base de datos: ${dbError.message}`);
        }

        // 4. Retornar éxito
        return res.status(201).json({
            message: 'Imágenes validadas, optimizadas y guardadas con éxito.',
            data: dbData
        });

    } catch (error) {
        console.error('Error en uploadPropertyImages:', error);
        return res.status(500).json({ error: error.message });
    }
}

module.exports = {
    uploadPropertyImages
};
