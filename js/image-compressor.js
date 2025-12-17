
/**
 * Advanced Image Compressor with Progressive Compression
 * Automatically compresses images to target size while maintaining quality
 * @version 2.0
 */

/**
 * Compresses an image file using progressive quality reduction.
 * Will automatically reduce quality until target size is achieved.
 * 
 * @param {File} file - The original image file.
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width of the output image (default 1920px)
 * @param {number} options.targetSizeMB - Target output size in MB (default 1MB)
 * @param {number} options.minQuality - Minimum quality threshold (default 0.5)
 * @param {number} options.maxQuality - Maximum quality to start with (default 0.85)
 * @param {Function} options.onProgress - Progress callback (optional)
 * @returns {Promise<File>} - Compressed image as File object.
 */
export async function compressImage(file, options = {}) {
    const {
        maxWidth = 1920,
        targetSizeMB = 1,
        minQuality = 0.5,
        maxQuality = 0.85,
        onProgress = null
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = async () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Determine output format
                const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

                // Progressive compression
                let quality = maxQuality;
                let compressedBlob = null;
                let attempts = 0;
                const maxAttempts = 10;
                const targetSizeBytes = targetSizeMB * 1024 * 1024;

                // Initial compression
                compressedBlob = await canvasToBlob(canvas, outputFormat, quality);

                if (onProgress) {
                    onProgress({
                        attempt: 1,
                        quality: quality,
                        originalSize: file.size,
                        currentSize: compressedBlob.size,
                        targetSize: targetSizeBytes
                    });
                }

                // Progressive quality reduction if needed
                while (compressedBlob.size > targetSizeBytes && quality > minQuality && attempts < maxAttempts) {
                    attempts++;
                    quality = Math.max(minQuality, quality - 0.05);

                    compressedBlob = await canvasToBlob(canvas, outputFormat, quality);

                    if (onProgress) {
                        onProgress({
                            attempt: attempts + 1,
                            quality: quality,
                            originalSize: file.size,
                            currentSize: compressedBlob.size,
                            targetSize: targetSizeBytes
                        });
                    }
                }

                const originalSizeKB = (file.size / 1024).toFixed(2);
                const compressedSizeKB = (compressedBlob.size / 1024).toFixed(2);
                const compressionRatio = ((1 - compressedBlob.size / file.size) * 100).toFixed(1);

                console.log(`✅ Image Compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB (${compressionRatio}% reduction) at quality ${quality.toFixed(2)}`);

                // Convert Blob to File object
                const compressedFile = new File(
                    [compressedBlob],
                    file.name.replace(/\.[^.]+$/, '.jpg'), // Change extension to .jpg
                    {
                        type: outputFormat,
                        lastModified: Date.now()
                    }
                );

                resolve(compressedFile);
            };

            img.onerror = (err) => reject(new Error('Failed to load image'));
        };

        reader.onerror = (err) => reject(new Error('Failed to read file'));
    });
}

/**
 * Helper function to convert canvas to blob
 * @private
 */
function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            resolve(blob);
        }, type, quality);
    });
}

/**
 * Batch compress multiple images
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options (same as compressImage)
 * @param {Function} onFileProgress - Callback for individual file progress
 * @returns {Promise<File[]>} - Array of compressed files
 */
export async function compressImages(files, options = {}, onFileProgress = null) {
    const compressedFiles = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
            const compressed = await compressImage(file, {
                ...options,
                onProgress: (progress) => {
                    if (onFileProgress) {
                        onFileProgress({
                            fileIndex: i,
                            fileName: file.name,
                            totalFiles: files.length,
                            ...progress
                        });
                    }
                }
            });
            compressedFiles.push(compressed);
        } catch (error) {
            console.error(`Failed to compress ${file.name}:`, error);
            // Fallback to original file if compression fails
            compressedFiles.push(file);
        }
    }

    return compressedFiles;
}
