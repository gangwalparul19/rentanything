/**
 * ID Verification Module
 * Handles manual ID verification (Aadhaar/PAN) with admin approval
 * Alternative to DigiLocker API for MVP
 */

import { db, auth, storage } from './firebase-config.js';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { showToast } from './toast-enhanced.js';
import { showLoader, hideLoader } from './loader.js';

// Verification status types
export const VERIFICATION_STATUS = {
    NOT_STARTED: 'not_started',
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
};

/**
 * Get current user's verification status
 * @returns {Promise<Object>} Verification status and details
 */
export async function getVerificationStatus() {
    const user = auth.currentUser;
    if (!user) return { status: VERIFICATION_STATUS.NOT_STARTED };

    try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return { status: VERIFICATION_STATUS.NOT_STARTED };

        const data = userSnap.data();
        return {
            status: data.idVerificationStatus || VERIFICATION_STATUS.NOT_STARTED,
            documentType: data.idDocument?.type,
            submittedAt: data.idDocument?.submittedAt,
            rejectionReason: data.idDocument?.rejectionReason,
            verifiedAt: data.idDocument?.verifiedAt
        };
    } catch (error) {
        console.error('Error getting verification status:', error);
        return { status: VERIFICATION_STATUS.NOT_STARTED };
    }
}

/**
 * Upload ID document for verification
 * @param {File} documentFile - Image file of the ID document
 * @param {string} documentType - 'aadhaar' or 'pan'
 * @param {string} documentNumber - Last 4 digits only (for privacy)
 */
export async function submitIDVerification(documentFile, documentType, documentNumber) {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to verify your ID', 'error');
        return false;
    }

    if (!documentFile || !documentType) {
        showToast('Please select a document and type', 'error');
        return false;
    }

    showLoader('Uploading document...');

    try {
        // 1. Upload to Firebase Storage (in a secure folder)
        const fileName = `id_docs/${user.uid}/${Date.now()}_${documentType}.${documentFile.name.split('.').pop()}`;
        const storageRef = ref(storage, fileName);

        await uploadBytes(storageRef, documentFile);
        const downloadURL = await getDownloadURL(storageRef);

        // 2. Update user profile with verification request
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            idVerificationStatus: VERIFICATION_STATUS.PENDING,
            idDocument: {
                type: documentType,
                lastFourDigits: documentNumber,
                documentUrl: downloadURL,
                submittedAt: serverTimestamp()
            }
        });

        // 3. Create admin notification/request
        await addDoc(collection(db, 'verification_requests'), {
            userId: user.uid,
            userName: user.displayName || 'User',
            userEmail: user.email,
            documentType: documentType,
            documentUrl: downloadURL,
            lastFourDigits: documentNumber,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        hideLoader();
        showToast('✅ Document submitted! We\'ll verify within 24 hours.', 'success');
        return true;

    } catch (error) {
        hideLoader();
        console.error('Error submitting verification:', error);
        showToast('Failed to submit document. Please try again.', 'error');
        return false;
    }
}

/**
 * Render the ID verification UI section for profile page
 * @returns {string} HTML string
 */
export function renderVerificationSection(status) {
    const { status: verificationStatus, documentType, submittedAt, rejectionReason } = status;

    // Base container style
    const containerStyle = `
        background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
        border: 1px solid #bae6fd;
        border-radius: 1rem;
        padding: 1.5rem;
        margin-top: 1.5rem;
    `;

    if (verificationStatus === VERIFICATION_STATUS.VERIFIED) {
        return `
            <div style="${containerStyle} background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-color: #86efac;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 50px; height: 50px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-shield-check" style="color: white; font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; color: #16a34a; font-size: 1.1rem;">✓ ID Verified</h3>
                        <p style="margin: 0.25rem 0 0; color: #4ade80; font-size: 0.9rem;">Your identity has been verified</p>
                    </div>
                </div>
            </div>
        `;
    }

    if (verificationStatus === VERIFICATION_STATUS.PENDING) {
        return `
            <div style="${containerStyle} background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-color: #fcd34d;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 50px; height: 50px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-clock" style="color: white; font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; color: #d97706; font-size: 1.1rem;">⏳ Verification Pending</h3>
                        <p style="margin: 0.25rem 0 0; color: #fbbf24; font-size: 0.9rem;">We're reviewing your ${documentType || 'document'}. Usually takes 24 hours.</p>
                    </div>
                </div>
            </div>
        `;
    }

    if (verificationStatus === VERIFICATION_STATUS.REJECTED) {
        return `
            <div style="${containerStyle} background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); border-color: #fca5a5;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    <div style="width: 50px; height: 50px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-xmark" style="color: white; font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; color: #dc2626; font-size: 1.1rem;">❌ Verification Failed</h3>
                        <p style="margin: 0.25rem 0 0; color: #f87171; font-size: 0.9rem;">${rejectionReason || 'Document could not be verified. Please try again.'}</p>
                    </div>
                </div>
                <button class="btn btn-outline" onclick="window.showVerificationModal()" style="width: 100%;">
                    <i class="fa-solid fa-rotate-right"></i> Submit Again
                </button>
            </div>
        `;
    }

    // NOT_STARTED - Show verification prompt
    return `
        <div style="${containerStyle}">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-shield-halved" style="color: white; font-size: 1.5rem;"></i>
                </div>
                <div>
                    <h3 style="margin: 0; color: #1e40af; font-size: 1.1rem;">Get Verified</h3>
                    <p style="margin: 0.25rem 0 0; color: #60a5fa; font-size: 0.9rem;">Build trust with a verified badge</p>
                </div>
            </div>
            <ul style="margin: 1rem 0; padding-left: 1.25rem; color: #64748b; font-size: 0.9rem; line-height: 1.8;">
                <li>Verified badge on your profile & listings</li>
                <li>Higher trust from renters & owners</li>
                <li>Priority in search results</li>
            </ul>
            <button class="btn btn-primary" onclick="window.showVerificationModal()" style="width: 100%;">
                <i class="fa-solid fa-id-card"></i> Verify My ID
            </button>
        </div>
    `;
}

/**
 * Show ID verification modal
 */
export function showVerificationModal() {
    const existingModal = document.getElementById('verification-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'verification-modal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;"
             onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 1rem; max-width: 450px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.2);">
                <div style="padding: 1.5rem; border-bottom: 1px solid #e2e8f0;">
                    <h2 style="margin: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-id-card" style="color: #3b82f6;"></i>
                        ID Verification
                    </h2>
                </div>
                
                <form id="verification-form" style="padding: 1.5rem;">
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Document Type *</label>
                        <div style="display: flex; gap: 1rem;">
                            <label style="flex: 1; display: flex; align-items: center; gap: 0.5rem; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 0.75rem; cursor: pointer;">
                                <input type="radio" name="doc-type" value="aadhaar" required>
                                <span>Aadhaar Card</span>
                            </label>
                            <label style="flex: 1; display: flex; align-items: center; gap: 0.5rem; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 0.75rem; cursor: pointer;">
                                <input type="radio" name="doc-type" value="pan">
                                <span>PAN Card</span>
                            </label>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Last 4 Digits</label>
                        <input type="text" id="doc-number" maxlength="4" pattern="[0-9A-Z]{4}" 
                               placeholder="XXXX" required
                               style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 1rem;">
                        <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem;">Last 4 characters of your Aadhaar/PAN</p>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Upload Document Photo *</label>
                        <div id="doc-upload-area" style="border: 2px dashed #94a3b8; border-radius: 0.75rem; padding: 2rem; text-align: center; cursor: pointer; background: #f8fafc;">
                            <i class="fa-solid fa-cloud-upload" style="font-size: 2rem; color: #64748b; margin-bottom: 0.5rem;"></i>
                            <p style="color: #64748b; margin: 0;">Click to upload or drag & drop</p>
                            <p style="color: #94a3b8; font-size: 0.8rem; margin: 0.25rem 0 0;">Max 5MB, JPG/PNG</p>
                            <input type="file" id="doc-file" accept="image/*" required style="display: none;">
                        </div>
                        <img id="doc-preview" style="display: none; max-width: 100%; max-height: 200px; margin-top: 1rem; border-radius: 0.5rem;">
                    </div>

                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 0.5rem; padding: 0.75rem; margin-bottom: 1.5rem;">
                        <p style="margin: 0; font-size: 0.85rem; color: #c2410c;">
                            <i class="fa-solid fa-lock" style="margin-right: 0.25rem;"></i>
                            Your document is securely stored and only visible to admins for verification.
                        </p>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        <i class="fa-solid fa-paper-plane"></i> Submit for Verification
                    </button>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Setup file upload
    const uploadArea = document.getElementById('doc-upload-area');
    const fileInput = document.getElementById('doc-file');
    const preview = document.getElementById('doc-preview');

    uploadArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('File too large. Max 5MB allowed.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                uploadArea.innerHTML = '<p style="color: #22c55e;"><i class="fa-solid fa-check"></i> File selected</p>';
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle form submit
    document.getElementById('verification-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const docType = document.querySelector('input[name="doc-type"]:checked')?.value;
        const docNumber = document.getElementById('doc-number').value;
        const docFile = fileInput.files[0];

        const success = await submitIDVerification(docFile, docType, docNumber);
        if (success) {
            modal.remove();
            // Refresh verification section if on profile page
            if (window.refreshVerificationSection) {
                window.refreshVerificationSection();
            }
        }
    });
}

// Expose globally for onclick handlers
window.showVerificationModal = showVerificationModal;
