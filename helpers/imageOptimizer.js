const sharp = require('sharp');

/**
 * Optimizes an image buffer to WebP format, resizing if width exceeds 1920px.
 * @param {Buffer} buffer - The original image buffer.
 * @returns {Promise<Buffer>} - The optimized WebP image buffer.
 */
async function optimizeImageToWebP(buffer) {
    return sharp(buffer)
        .resize({
            width: 1920,
            withoutEnlargement: true,
            fit: sharp.fit.inside
        })
        .webp({ quality: 80 })
        .toBuffer();
}

module.exports = { optimizeImageToWebP };
