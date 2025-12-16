
/**
 * Compresses an image file using the Canvas API.
 * @param {File} file - The original image file.
 * @param {number} maxWidth - Maximum width of the output image (default 1080px).
 * @param {number} quality - JPEG quality from 0 to 1 (default 0.7).
 * @returns {Promise<Blob>} - Compressed image blob.
 */
export async function compressImage(file, maxWidth = 1080, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
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

                // Convert to Blob
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas is empty'));
                        return;
                    }
                    console.log(`Original: ${(file.size / 1024).toFixed(2)}KB, Compressed: ${(blob.size / 1024).toFixed(2)}KB`);
                    resolve(blob);
                }, 'image/jpeg', quality);
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
}
