
import { db, auth, storage } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { updateProfile, onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initFooter } from './footer-manager.js';
import { initHeader } from './header-manager.js';
import { showToast } from './toast-enhanced.js';
import { showLoader, hideLoader } from './loader.js';
import { compressImage } from './image-compressor.js'; // Import enhanced compressor
import { dedupedFetch, escapeHtml } from './utils';
import { FormValidator } from './form-validator.js';

// Init
document.addEventListener('DOMContentLoaded', () => {
    initHeader()
    initMobileMenu();
    initTheme();
    initAuth(); // Initialize header state
    initFooter();
    loadSocieties(); // Fetch dynamic list
    setupFormValidation();
});

function setupFormValidation() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    new FormValidator(form, {
        displayName: {
            required: true,
            minLength: 2,
            maxLength: 50,
            messages: {
                required: 'Name is required',
                minLength: 'Name too short'
            }
        },
        phoneNumber: {
            required: true,
            pattern: /^[0-9]{10}$/,
            messages: {
                required: 'Phone number is required',
                pattern: 'Must be 10 digits'
            }
        },
        bio: {
            maxLength: 500,
            messages: {
                maxLength: 'Bio cannot exceed 500 characters'
            }
        }
    });
}

const profileForm = document.getElementById('profile-form');
const displayNameInput = document.getElementById('displayName');
const phoneNumberInput = document.getElementById('phoneNumber');
const societySelect = document.getElementById('society');
const otherSocietyWrapper = document.getElementById('other-society-wrapper');
const otherSocietyInput = document.getElementById('otherSocietyName');
const flatNumberInput = document.getElementById('flatNumber');
const genderSelect = document.getElementById('gender');
const bioInput = document.getElementById('bio');
const profileImageInput = document.getElementById('profile-image-input');
const profilePreview = document.getElementById('profile-preview');
const imageUploadWrapper = document.getElementById('image-upload-wrapper');
const saveBtn = document.getElementById('save-profile-btn');

let currentUser = null;
let newImageFile = null;

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loadProfile(user.uid);
    } else {
        // Redirect if not logged in
        setTimeout(() => {
            if (!auth.currentUser) window.location.href = '/?login=true';
        }, 1000);
    }
});

// Load Societies from Firestore
async function loadSocieties() {
    try {
        const q = query(collection(db, "societies"), where("isActive", "!=", false));
        const querySnapshot = await getDocs(q);
        const approvedSocieties = [];
        querySnapshot.forEach((doc) => {
            approvedSocieties.push(doc.data().name);
        });

        // Insert before "Other" option
        const otherOption = societySelect.querySelector('option[value="Other Hinjewadi Phase 3"]');

        approvedSocieties.sort().forEach(name => {
            // Check if already exists (hardcoded)
            if (!societySelect.querySelector(`option[value="${name}"]`)) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                societySelect.insertBefore(opt, otherOption);
            }
        });

    } catch (error) {
        console.error("Error loading societies:", error);
    }
}

// Load Profile Data
async function loadProfile(uid) {
    try {
        const docRef = doc(db, "users", uid);
        // Deduped profile fetch
        const docSnap = await dedupedFetch(
            `user-profile-${uid}`,
            () => getDoc(docRef)
        );

        if (docSnap.exists()) {
            const data = docSnap.data();
            displayNameInput.value = data.displayName || currentUser.displayName || '';
            phoneNumberInput.value = data.phoneNumber || '';
            phoneNumberInput.value = data.phoneNumber || '';

            // Handle Pending Approval or Existing "Other" logic
            // If data.society matches one of the options, select it.
            // If data.society is custom OR we have a flag 'isPendingSociety', handle it.
            // For MVP: If data.societyRequest, show it in the text box and select "Other".

            if (data.societyRequest) {
                societySelect.value = "Other Hinjewadi Phase 3";
                otherSocietyWrapper.style.display = 'block';
                otherSocietyInput.value = data.societyRequest;
            } else {
                societySelect.value = data.society || '';
            }
            flatNumberInput.value = data.flatNumber || '';
            genderSelect.value = data.gender || 'prefer-not';
            bioInput.value = data.bio || '';

            if (data.photoURL) {
                profilePreview.src = data.photoURL;
            } else if (currentUser.photoURL) {
                profilePreview.src = currentUser.photoURL;
            }
        } else {
            // First time, pre-fill from Auth
            displayNameInput.value = currentUser.displayName || '';
            if (currentUser.photoURL) profilePreview.src = currentUser.photoURL;
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        showToast("Failed to load profile", "error");
    }
}

// Image Selection
if (imageUploadWrapper) {
    imageUploadWrapper.addEventListener('click', () => {
        profileImageInput.click();
    });
}

if (profileImageInput) {
    profileImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            // SECURITY FIX: Comprehensive file validation
            const { validateImageFile } = await import('./file-validator.js');
            const validation = validateImageFile(file);

            if (!validation.valid) {
                showToast(validation.error, "error");
                profileImageInput.value = ''; // Reset input
                return;
            }

            // Show notification for large files
            if (file.size > 2 * 1024 * 1024) {
                showToast('Compressing large image...', 'info');
            }

            // Preview Original immediately for better UX
            const reader = new FileReader();
            reader.onload = (evt) => {
                profilePreview.src = evt.target.result;
            };
            reader.readAsDataURL(file);

            try {
                // Use enhanced compressor with profile-optimized settings
                const compressedFile = await compressImage(file, {
                    maxWidth: 800,  // Profile images don't need to be huge
                    targetSizeMB: 0.5, // Target 500KB for profile pictures
                    maxQuality: 0.85
                });

                newImageFile = compressedFile;

                if (file.size > 2 * 1024 * 1024) {
                    const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
                    showToast(`✅ Image compressed by ${reduction}%`, 'success');
                }
            } catch (error) {
                console.error("Compression error:", error);
                showToast("Failed to process image. Try another.", "error");
                newImageFile = null; // Reset
            }
        }
    });
}

// Toggle "Other" Society Input
if (societySelect) {
    societySelect.addEventListener('change', () => {
        if (societySelect.value === "Other Hinjewadi Phase 3") {
            otherSocietyWrapper.style.display = 'block';
            otherSocietyInput.setAttribute('required', 'true');
        } else {
            otherSocietyWrapper.style.display = 'none';
            otherSocietyInput.removeAttribute('required');
            otherSocietyInput.value = ''; // Clear if hidden
        }
    });
}

// --- GOVT ID LOGIC ---
const idInput = document.getElementById('id-file-input');
const idArea = document.getElementById('id-upload-area');
const idPreview = document.getElementById('id-preview-container');
const idFilename = document.getElementById('id-filename');
const idStatusBadge = document.getElementById('id-status-badge');
let newIdFile = null;

if (idArea) {
    idArea.addEventListener('click', () => idInput.click());
    idInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            newIdFile = file;
            idPreview.style.display = 'flex';
            idFilename.textContent = file.name;
            showToast("ID selected. Click Save to upload.", "info");
        }
    });
}

// Load ID Status helper
async function checkIdStatus(uid, data) {
    if (data.idVerificationStatus) {
        idStatusBadge.textContent = data.idVerificationStatus.toUpperCase();
        if (data.idVerificationStatus === 'verified') {
            idStatusBadge.style.background = '#dcfce7';
            idStatusBadge.style.color = '#166534';
            idArea.style.display = 'none'; // Hide upload if already verified

            // Unlock Badge
            const badge = document.getElementById('badge-verified');
            if (badge) {
                badge.style.opacity = '1';
                badge.querySelector('div:last-child').style.color = '#166534';
            }
        } else if (data.idVerificationStatus === 'pending') {
            idStatusBadge.style.background = '#fff7ed';
            idStatusBadge.style.color = '#c2410c';
            idFilename.textContent = "Document Uploaded (Pending Review)";
            idPreview.style.display = 'flex';
        }
    }
}
// Hook into loadProfile to call this (requires editing loadProfile, skipping for now, relying on submit update)


// Form Submission
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';
        showLoader("Saving your profile...");

        try {
            let photoURL = profilePreview.src;

            // 1. Upload Profile Image
            if (newImageFile) {
                const storageRef = ref(storage, `profiles/${currentUser.uid}/${currentUser.uid}_${Date.now()}`);
                await uploadBytes(storageRef, newImageFile);
                photoURL = await getDownloadURL(storageRef);
            }

            // 2. Upload Govt ID (New)
            let idDocUrl = null;
            if (newIdFile) {
                const ext = newIdFile.name.split('.').pop();
                const idRef = ref(storage, `id_docs/${currentUser.uid}/govt_id.${ext}`);
                await uploadBytes(idRef, newIdFile);
                idDocUrl = await getDownloadURL(idRef);
            }

            // Sanitize
            // Sanitize
            const sanitize = escapeHtml;

            // 3. Update Firestore
            const profileData = {
                displayName: sanitize(displayNameInput.value),
                phoneNumber: sanitize(phoneNumberInput.value),
                society: sanitize(societySelect.value),
                flatNumber: sanitize(flatNumberInput.value),
                gender: sanitize(genderSelect.value),
                bio: sanitize(bioInput.value),
                photoURL: photoURL,
                email: currentUser.email,
                updatedAt: serverTimestamp()
            };

            if (idDocUrl) {
                profileData.idDocumentUrl = idDocUrl;
                profileData.idVerificationStatus = 'pending';
            }

            // Handle Other Society
            if (societySelect.value === "Other Hinjewadi Phase 3") {
                const customSociety = otherSocietyInput.value.trim();
                if (customSociety) {
                    profileData.societyRequest = customSociety;
                    profileData.society = "Pending: " + customSociety;
                    // Add to admin requests
                    try {
                        await addDoc(collection(db, "society_requests"), {
                            userId: currentUser.uid,
                            userName: displayNameInput.value,
                            requestedSociety: customSociety,
                            status: 'pending',
                            createdAt: serverTimestamp()
                        });
                    } catch (e) { console.error(e); }
                }
            } else {
                profileData.society = societySelect.value;
                profileData.societyRequest = null;
            }

            const userRef = doc(db, "users", currentUser.uid);
            await setDoc(userRef, profileData, { merge: true });

            // 4. Update Auth
            await updateProfile(currentUser, {
                displayName: displayNameInput.value,
                photoURL: photoURL
            });

            // 5. Update Header
            const headerAvatar = document.getElementById('user-avatar');
            if (headerAvatar) headerAvatar.src = photoURL;

            // Update ID Badge UI immediately
            if (idDocUrl) {
                idStatusBadge.textContent = "PENDING";
                idStatusBadge.style.background = '#fff7ed';
                idStatusBadge.style.color = '#c2410c';
            }

            showToast("Profile updated successfully!", "success");

        } catch (error) {
            console.error("Error saving profile:", error);
            showToast("Failed to save: " + error.message, "error");
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save Changes';
            hideLoader();
        }
    });
}
