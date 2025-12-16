/**
 * File Upload Validator
 * Provides secure validation for image uploads
 */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Validates an image file for security and format compliance
 * @param {File} file - The file to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export function validateImageFile(file) {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // 1. Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`
        };
    }

    // 2. Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed'
        };
    }

    // 3. Validate file extension
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();

    if (!ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension)) {
        return {
            valid: false,
            error: 'Invalid file extension. File must end with .jpg, .jpeg, .png, or .webp'
        };
    }

    // 4. Cross-check MIME type with extension
    const extensionTypeMap = {
        'jpg': ['image/jpeg', 'image/jpg'],
        'jpeg': ['image/jpeg', 'image/jpg'],
        'png': ['image/png'],
        'webp': ['image/webp']
    };

    const expectedTypes = extensionTypeMap[fileExtension];
    if (!expectedTypes || !expectedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'File extension does not match file type. Possible file masquerading detected'
        };
    }

    return { valid: true, error: null };
}

/**
 * Validates multiple image files
 * @param {FileList|File[]} files - Files to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateImageFiles(files) {
    const errors = [];

    for (let i = 0; i < files.length; i++) {
        const result = validateImageFile(files[i]);
        if (!result.valid) {
            errors.push(`${files[i].name}: ${result.error}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}
