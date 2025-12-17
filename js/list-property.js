/**
 * List Property - Form Handler for Rental Properties
 */

import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initHeader } from './header-manager.js';
import { compressImage } from './image-compressor.js';
import { showToast } from './toast-enhanced.js';
import { showLoader, hideLoader } from './loader.js';
import { FormValidator } from './form-validator.js';

let selectedFiles = [];
let isEditMode = false;
let editingPropertyId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initHeader();

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            showToast('Please log in to list a property', 'warning');
            setTimeout(() => window.location.href = '/?login=true', 1500);
        }
    });

    loadSocieties(); // Load societies from Firestore
    setupImageUpload();
    setupFormSubmission();
    setupSocietyToggle(); // Setup Other society toggle
});


/**
 * Load Societies from Firestore
 */
async function loadSocieties() {
    try {
        const q = query(collection(db, "societies"), where("isActive", "!=", false));
        const querySnapshot = await getDocs(q);
        const approvedSocieties = [];
        querySnapshot.forEach((doc) => {
            approvedSocieties.push(doc.data().name);
        });

        const societySelect = document.getElementById('building');
        const otherOption = societySelect.querySelector('option[value="Other Hinjewadi Phase 3"]');

        approvedSocieties.sort().forEach(name => {
            // Check if already exists
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

/**
 * Setup society selection toggle for "Other" option
 */
function setupSocietyToggle() {
    const societySelect = document.getElementById('building');
    const otherWrapper = document.getElementById('other-society-wrapper');
    const otherInput = document.getElementById('other-society-name');

    if (!societySelect || !otherWrapper || !otherInput) return;

    societySelect.addEventListener('change', () => {
        if (societySelect.value === "Other Hinjewadi Phase 3") {
            otherWrapper.style.display = 'block';
            otherInput.setAttribute('required', 'true');
        } else {
            otherWrapper.style.display = 'none';
            otherInput.removeAttribute('required');
            otherInput.value = ''; // Clear if hidden
        }
    });
}

/**
 * Setup image upload handler
 */
function setupImageUpload() {
    const imageInput = document.getElementById('property-images');
    const imagePreview = document.getElementById('image-preview');

    imageInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);

        if (files.length + selectedFiles.length > 10) {
            showToast('Maximum 10 images allowed', 'warning');
            return;
        }

        showLoader('Compressing images...');

        for (const file of files) {
            try {
                const compressed = await compressImage(file);
                selectedFiles.push(compressed);
            } catch (error) {
                console.error('Image compression failed:', error);
                selectedFiles.push(file);
            }
        }

        hideLoader();
        renderImagePreviews();
    });

    // Click to trigger file input
    imagePreview.parentElement.querySelector('.file-upload-label').addEventListener('click', () => {
        imageInput.click();
    });
}

/**
 * Render image previews
 */
function renderImagePreviews() {
    const imagePreview = document.getElementById('image-preview');
    imagePreview.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.style.cssText = 'position: relative; border-radius: 0.5rem; overflow: hidden;';
            div.innerHTML = `
                <img src="${e.target.result}" style="width: 100%; height: 150px; object-fit: cover;">
                <button type="button" onclick="window.removeImage(${index})" 
                        style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            imagePreview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Remove image from selection
 */
window.removeImage = (index) => {
    selectedFiles.splice(index, 1);
    renderImagePreviews();
};

/**
 * Setup form submission
 */
function setupFormSubmission() {
    const form = document.getElementById('property-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!auth.currentUser) {
            showToast('Please log in first', 'error');
            return;
        }

        if (selectedFiles.length === 0) {
            showToast('Please upload at least one property image', 'warning');
            return;
        }

        showLoader('Listing your property...');

        try {
            // Upload images
            const imageUrls = await uploadPropertyImages();

            // Get form data
            const propertyData = getFormData(imageUrls);

            // Save to Firestore
            await addDoc(collection(db, 'properties'), {
                ...propertyData,
                ownerId: auth.currentUser.uid,
                ownerName: auth.currentUser.displayName || 'Anonymous',
                ownerPhone: auth.currentUser.phoneNumber || '',
                status: 'pending',
                approvalStatus: 'pending',
                views: 0,
                inquiries: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            hideLoader();
            showToast('Property submitted for approval! You\'ll be notified once it\'s reviewed. 📝', 'success');

            setTimeout(() => {
                window.location.href = '/my-properties.html';
            }, 1500);

        } catch (error) {
            console.error('Error listing property:', error);
            hideLoader();
            showToast('Failed to list property. Please try again.', 'error');
        }
    });
}

/**
 * Upload property images to Firebase Storage
 */
async function uploadPropertyImages() {
    const imageUrls = [];

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const timestamp = Date.now();
        const fileName = `properties/${auth.currentUser.uid}/${timestamp}_${i}.jpg`;
        const storageRef = ref(storage, fileName);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
    }

    return imageUrls;
}

/**
 * Get form data
 */
function getFormData(imageUrls) {
    // Get selected amenities
    const amenities = Array.from(document.querySelectorAll('input[name="amenity"]:checked'))
        .map(cb => cb.value);

    // Handle society selection
    const buildingValue = document.getElementById('building').value;
    const otherSocietyName = document.getElementById('other-society-name').value;

    // Handle "Other" society selection
    let actualBuilding = buildingValue;
    if (buildingValue === "Other Hinjewadi Phase 3" && otherSocietyName) {
        actualBuilding = `Pending: ${otherSocietyName}`;
    }

    return {
        // Property Details
        type: document.getElementById('property-type').value,
        title: document.getElementById('title').value,
        bedrooms: parseInt(document.getElementById('bedrooms').value),
        bathrooms: parseInt(document.getElementById('bathrooms').value),
        squareFeet: parseInt(document.getElementById('square-feet').value),
        furnishing: document.getElementById('furnishing').value,

        // Location
        address: {
            building: actualBuilding,
            society: buildingValue === "Other Hinjewadi Phase 3" ? otherSocietyName : buildingValue,
            societyRequest: buildingValue === "Other Hinjewadi Phase 3" ? otherSocietyName : null,
            street: document.getElementById('street').value,
            area: document.getElementById('area').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            pincode: document.getElementById('pincode').value
        },

        // Pricing
        monthlyRent: parseInt(document.getElementById('monthly-rent').value),
        securityDeposit: parseInt(document.getElementById('security-deposit').value),
        maintenanceCharges: parseInt(document.getElementById('maintenance').value) || 0,

        // Amenities
        amenities: amenities,

        // Images
        images: imageUrls,
        mainImage: imageUrls[0],

        // Additional Info
        description: document.getElementById('description').value,
        preferredTenants: document.getElementById('preferred-tenants').value,
        availableFrom: new Date(document.getElementById('available-from').value)
    };
}
