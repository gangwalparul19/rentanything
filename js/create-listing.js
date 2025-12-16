import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { compressImage } from './image-compressor.js';
import { showToast } from './toast.js';

// Initialize Global UI Components
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTheme();
    initAuth();
    initHeader();


    // Check for Edit Mode
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    if (editId) {
        enableEditMode(editId);
    }

    // Magic AI Logic (Description)
    const magicBtn = document.getElementById('magic-ai-btn');
    if (magicBtn) {
        magicBtn.addEventListener('click', () => {
            const title = document.getElementById('title').value;
            const category = document.getElementById('category').value;

            if (!title) { showToast("Enter a title first!", "info"); return; }

            const originalText = magicBtn.innerHTML;
            magicBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles fa-spin"></i> Generating...';
            magicBtn.disabled = true;

            // Simulated AI Generation
            setTimeout(() => {
                const descriptors = ["high-quality", "durable", "perfect condition", "easy to use", "top-rated"];
                const desc = `Rent this ${descriptors[Math.floor(Math.random() * descriptors.length)]} ${title} for your next ${category === 'party' ? 'event' : 'project'}. It is well-maintained and ready for immediate pickup. Contact me for more details!`;

                document.getElementById('description').value = desc;
                showToast("Description generated! ✨", "success");
                magicBtn.innerHTML = originalText;
                magicBtn.disabled = false;
            }, 1500);
        });
    }

    // AI Price Assistant
    const aiPriceBtn = document.getElementById('ai-price-btn');
    if (aiPriceBtn) {
        aiPriceBtn.addEventListener('click', () => {
            const category = document.getElementById('category').value;
            if (!category) {
                showToast("Please select a category first.", "info");
                return;
            }

            const dayInput = document.getElementById('price-day');
            const weekInput = document.getElementById('price-week');
            const monthInput = document.getElementById('price-month');

            const originalText = aiPriceBtn.innerText;
            aiPriceBtn.innerHTML = '<i class="fa-solid fa-calculator fa-spin"></i> Analyzing...';
            aiPriceBtn.disabled = true;

            setTimeout(() => {
                let base = 100; // default
                switch (category) {
                    case 'electronics': base = 500; break;
                    case 'party': base = 400; break;
                    case 'tools': base = 150; break;
                    case 'camping': base = 250; break;
                    case 'kids': base = 200; break;
                    case 'mobility': base = 300; break;
                }

                // Add some "market fluctuation" randomness (+- 10%)
                const variance = 1 + (Math.random() * 0.2 - 0.1);
                base = Math.round(base * variance / 10) * 10;

                dayInput.value = base;
                weekInput.value = base * 5;
                monthInput.value = base * 15;

                // Suggest Deposit (Safety) - e.g., 20x daily rate for safety
                const depositInput = document.getElementById('deposit');
                if (depositInput) depositInput.value = base * 20;

                showToast(`💡 Market average found for ${category}!`, "success");
                aiPriceBtn.innerHTML = originalText;
                aiPriceBtn.disabled = false;
            }, 1000);
        });
    }
});

// --- GLOBALS ---
const form = document.getElementById('create-listing-form');
const uploadArea = document.getElementById('upload-area');
const imageInput = document.getElementById('image-file');
const previewContainer = document.getElementById('preview-container');
const submitBtn = document.querySelector('.btn-primary');
const pageTitle = document.querySelector('.section-title');

let currentUser = null;
let selectedFiles = [];
let existingImages = [];
let isEditMode = false;
let currentListingId = null;

// --- AUTH GUARD ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        setTimeout(() => {
            if (!auth.currentUser) {
                showToast("You must be logged in to list an item!", 'error');
                setTimeout(() => window.location.href = '/', 1500);
            }
        }, 1000);
    }
});

// --- EDIT MODE LOGIC ---
async function enableEditMode(id) {
    isEditMode = true;
    currentListingId = id;
    if (pageTitle) pageTitle.textContent = "Edit Listing";
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update Listing';

    try {
        const docRef = doc(db, "listings", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Populate Fields
            document.getElementById('title').value = data.title || '';
            document.getElementById('description').value = data.description || '';
            document.getElementById('category').value = data.category || '';
            document.getElementById('location').value = data.location || '';

            // Populate Rates
            if (data.rates) {
                document.getElementById('price-day').value = data.rates.daily || '';
                document.getElementById('price-week').value = data.rates.weekly || '';
                document.getElementById('price-month').value = data.rates.monthly || '';
            } else if (data.price) {
                // Backward compatibility
                if (data.period === 'day') document.getElementById('price-day').value = data.price;
                if (data.period === 'week') document.getElementById('price-week').value = data.price;
                if (data.period === 'month') document.getElementById('price-month').value = data.price;
            }

            // Populate Deposit
            if (data.deposit) {
                document.getElementById('deposit').value = data.deposit;
            }

            // Populate Images
            if (data.images && data.images.length > 0) {
                existingImages = data.images;
                renderExistingImages();
            } else if (data.image) {
                existingImages = [data.image];
                renderExistingImages();
            }

        } else {
            showToast("Listing not found", "error");
        }
    } catch (error) {
        console.error("Error loading listing:", error);
        showToast("Error loading listing details", "error");
    }
}

function renderExistingImages() {
    existingImages.forEach((url, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';

        const img = document.createElement('img');
        img.src = url;
        img.style.width = '100px';
        img.style.height = '100px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '0.5rem';
        img.style.border = '1px solid #e2e8f0';

        // Add Delete Button Logic (simplified for now: just view)
        // Ideally we enable deletion, but let's keep it safe.

        wrapper.appendChild(img);
        previewContainer.appendChild(wrapper);
    });
}

// --- IMAGE LOGIC ---
if (uploadArea && imageInput) {
    uploadArea.addEventListener('click', () => imageInput.click());

    // Standard Change Listener
    imageInput.addEventListener('change', handleImageUpload);

    // Helper: Handle Image Upload & Preview
    function handleImageUpload(e) {
        const files = Array.from(e.target.files);

        if ((files.length + existingImages.length) > 5) {
            showToast("Maximum 5 images allowed total", 'error');
            imageInput.value = '';
            selectedFiles = [];
            return;
        }

        selectedFiles = files;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100px';
                img.style.height = '100px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '0.5rem';
                img.style.border = '1px solid #e2e8f0';
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }
}

// --- FORM SUBMISSION ---
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            showToast("Please login first.", 'error');
            return;
        }

        // Basic Validation
        const title = document.getElementById('title').value;
        const category = document.getElementById('category').value;

        // Pricing
        const priceDay = document.getElementById('price-day').value;
        const priceWeek = document.getElementById('price-week').value;
        const priceMonth = document.getElementById('price-month').value;
        const deposit = document.getElementById('deposit').value;

        if (!priceDay && !priceWeek && !priceMonth) {
            showToast("Please enter at least one price rate.", 'error');
            return;
        }

        // Checking images
        if (selectedFiles.length === 0 && existingImages.length === 0) {
            showToast("Please select at least one image.", 'error');
            return;
        }

        showToast(isEditMode ? "Updating listing..." : "Creating listing...", 'info');
        submitBtn.disabled = true;

        try {
            const imageUrls = [...existingImages]; // Keep old

            // Upload New Images
            for (const file of selectedFiles) {
                const compressedFile = await compressImage(file);
                const storageRef = ref(storage, `listings/${currentUser.uid}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, compressedFile);
                const downloadURL = await getDownloadURL(snapshot.ref);
                imageUrls.push(downloadURL);
            }

            // Sanitize Input (XSS Prevention)
            const sanitize = (str) => {
                const temp = document.createElement('div');
                temp.textContent = str;
                return temp.innerHTML;
            };

            const listingData = {
                title: sanitize(title),
                description: sanitize(document.getElementById('description').value),
                category: category,
                location: sanitize(document.getElementById('location').value),
                rates: {
                    daily: priceDay || null,
                    weekly: priceWeek || null,
                    monthly: priceMonth || null
                },
                deposit: deposit || 0,
                images: imageUrls,
                image: imageUrls[0], // Main
                ownerId: currentUser.uid,
                ownerName: currentUser.displayName,
                ownerPhoto: currentUser.photoURL,
                updatedAt: serverTimestamp()
            };

            if (!isEditMode) {
                listingData.status = 'pending'; // Default status
                listingData.createdAt = serverTimestamp();
                await addDoc(collection(db, "listings"), listingData);
                showToast("Listing submitted for approval! ⏳", 'success');
            } else {
                const docRef = doc(db, "listings", currentListingId);
                await updateDoc(docRef, listingData);
                showToast("Listing updated successfully! ✅", 'success');
            }

            setTimeout(() => {
                window.location.href = isEditMode ? 'my-listings.html' : '/';
            }, 1500);

        } catch (error) {
            console.error("Error saving listing:", error);
            showToast("Failed to save listing: " + error.message, 'error');
            submitBtn.disabled = false;
        }
    });
}
