import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { initFooter } from './footer-manager.js';
import { compressImage } from './image-compressor.js';
import { showToast } from './toast-enhanced.js';
import { showLoader, hideLoader } from './loader.js';
import { FormValidator } from './form-validator.js';
import { escapeHtml } from './utils';
import { initSocietyTypeahead, getSelectedSociety } from './society-typeahead.js';

// Initialize Global UI Components
document.addEventListener('DOMContentLoaded', () => {
    initHeader();      // 1. Inject HTML links and setup UI auth
    initMobileMenu();  // 2. Make menu clickable
    initTheme();       // 3. Setup dark/light mode
    initAuth();        // 4. Setup login button events
    initFooter();
    initTransactionModes();

    // Initialize society typeahead for location field
    initSocietyTypeahead('location', 'location-id');

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

            // Loader for AI
            showLoader("✨ Generating magic description...");

            setTimeout(() => {
                const descriptors = ["high-quality", "durable", "perfect condition", "easy to use", "top-rated"];
                const desc = `Rent this ${descriptors[Math.floor(Math.random() * descriptors.length)]} ${title} for your next ${category === 'party' ? 'event' : 'project'}. It is well-maintained and ready for immediate pickup. Contact me for more details!`;

                document.getElementById('description').value = desc;
                showToast("Description generated! ✨", "success");
                hideLoader();
            }, 1000);
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

            showLoader("📊 Analyzing market prices...");

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
                const variance = base * 0.1;
                const dayPrice = Math.round(base + (Math.random() - 0.5) * variance);
                const weekPrice = Math.round(dayPrice * 6); // Small weekly discount
                const monthPrice = Math.round(dayPrice * 20); // Better monthly discount

                dayInput.value = dayPrice;
                weekInput.value = weekPrice;
                monthInput.value = monthPrice;

                // Suggest Deposit (Safety) - e.g., 20x daily rate for safety
                const depositInput = document.getElementById('deposit');
                if (depositInput) depositInput.value = dayPrice * 20;

                showToast("Smart prices suggested! 💡", "success");
                hideLoader();
            }, 1200);
        });
    }

    // Setup Form Validation
    setupFormValidation();
});

function setupFormValidation() {
    const form = document.getElementById('create-listing-form');
    if (!form) return;

    const validator = new FormValidator(form, {
        title: {
            required: true,
            minLength: 3,
            maxLength: 100,
            messages: {
                required: 'Please enter a title for your listing',
                minLength: 'Title should be at least 3 characters long',
                maxLength: 'Title cannot exceed 100 characters'
            }
        },
        description: {
            required: true,
            minLength: 20,
            maxLength: 1000,
            messages: {
                required: 'Please describe your item',
                minLength: 'Please provide more details (minimum 20 characters)',
                maxLength: 'Description is too long (maximum 1000 characters)'
            }
        },
        category: {
            required: true,
            custom: (value) => {
                if (!value || value === '') {
                    return 'Please select a category';
                }
                return null;
            }
        },
        location: {
            required: true,
            minLength: 2,
            messages: {
                required: 'Please specify the location (e.g., Splendour, Mystic)',
                minLength: 'Location seems too short'
            }
        },
        daily: {
            number: true,
            min: 1,
            custom: (value) => {
                const modeRent = document.getElementById('mode-rent');
                const isRentMode = modeRent && modeRent.checked;

                if (isRentMode && (!value || parseFloat(value) < 1)) {
                    return 'Please enter a daily rental price (minimum ₹1)';
                }
                return null;
            },
            messages: {
                number: 'Price must be a valid number',
                min: 'Price must be at least ₹1'
            }
        }
    });

    // Add character counter for description
    const descriptionField = document.getElementById('description');
    if (descriptionField) {
        const formGroup = descriptionField.closest('.form-group');
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.textContent = '0 / 1000';
        formGroup.appendChild(counter);

        descriptionField.addEventListener('input', () => {
            const length = descriptionField.value.length;
            counter.textContent = `${length} / 1000`;

            if (length > 950) {
                counter.classList.add('warning');
            } else if (length > 1000) {
                counter.classList.add('error');
            } else {
                counter.classList.remove('warning', 'error');
            }
        });
    }
}

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

// BUSINESS RULE: Donate cannot be combined with Rent or Sell
window.handleTransactionTypeChange = function () {
    const rentCheckbox = document.getElementById('mode-rent');
    const sellCheckbox = document.getElementById('mode-sell');
    const donateCheckbox = document.getElementById('mode-donate');

    if (!rentCheckbox || !sellCheckbox || !donateCheckbox) return;

    // If Donate is checked, uncheck and disable Rent and Sell
    if (donateCheckbox.checked) {
        rentCheckbox.checked = false;
        sellCheckbox.checked = false;
        rentCheckbox.disabled = true;
        sellCheckbox.disabled = true;
    } else {
        // If Donate is unchecked, enable Rent and Sell
        rentCheckbox.disabled = false;
        sellCheckbox.disabled = false;
    }

    // If Rent or Sell is checked, disable Donate
    if (rentCheckbox.checked || sellCheckbox.checked) {
        donateCheckbox.disabled = true;
    } else {
        donateCheckbox.disabled = false;
    }
};


// --- TRANSACTION MODES LOGIC ---
function initTransactionModes() {
    const modes = ['rent', 'sell', 'donate'];

    modes.forEach(mode => {
        const checkbox = document.getElementById(`mode-${mode}`);
        const section = document.getElementById(`section-${mode}`);

        if (checkbox && section) {
            checkbox.addEventListener('change', () => {
                section.style.display = checkbox.checked ? 'block' : 'none';

                // Logic to ensure at least one is checked? 
                // Or just validate on submit. Let's validate on submit to allow free toggling.
            });

            // Trigger initial state
            section.style.display = checkbox.checked ? 'block' : 'none';
        }
    });
}

// --- AUTH GUARD ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Remove banner if exists
        const banner = document.getElementById('login-warning-banner');
        if (banner) banner.remove();
        if (submitBtn) submitBtn.disabled = false;
    } else {
        // User not logged in
        // 1. Show Banner
        showLoginBanner();

        // 2. Disable Submit Button visually (optional, but good UX)
        // submitBtn.disabled = true; // User requested to "see that button", so let's keep it enabled but block action
    }
});

function showLoginBanner() {
    if (document.getElementById('login-warning-banner')) return;

    const container = document.querySelector('.container');
    const banner = document.createElement('div');
    banner.id = 'login-warning-banner';
    banner.className = 'alert alert-warning';
    banner.style.background = '#fffbeb';
    banner.style.border = '1px solid #fcd34d';
    banner.style.padding = '1rem';
    banner.style.marginBottom = '1rem';
    banner.style.borderRadius = '0.5rem';
    banner.style.color = '#92400e';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.gap = '0.5rem';
    banner.innerHTML = `
        <i class="fa-solid fa-lock"></i>
        <span><strong>Login Required:</strong> You can fill out this form, but you must <a href="#" id="banner-login-link" style="text-decoration:underline; color:#b45309;">login</a> to submit it.</span>
    `;

    // Insert before the form
    if (form) {
        form.parentNode.insertBefore(banner, form);
    }

    // Attach click to the link
    const link = banner.querySelector('#banner-login-link');
    if (link) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) loginBtn.click();
        });
    }
}

// --- EDIT MODE LOGIC ---
async function enableEditMode(id) {
    isEditMode = true;
    currentListingId = id;
    if (pageTitle) pageTitle.textContent = "Edit Listing";
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update Listing';

    showLoader("Loading listing details...");

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

            // Populate Modes (Backwards Compatibility: Default to Rent)
            const types = data.transactionTypes || ['rent'];

            ['rent', 'sell', 'donate'].forEach(mode => {
                const cb = document.getElementById(`mode-${mode}`);
                if (cb) {
                    cb.checked = types.includes(mode);
                    // Trigger change to update UI
                    cb.dispatchEvent(new Event('change'));
                }
            });

            // Populate Rent Rates
            if (types.includes('rent')) {
                if (data.rates) {
                    document.getElementById('price-day').value = data.rates.daily || '';
                    document.getElementById('price-week').value = data.rates.weekly || '';
                    document.getElementById('price-month').value = data.rates.monthly || '';
                } else if (data.price) {
                    // Legacy support
                    if (data.period === 'day') document.getElementById('price-day').value = data.price;
                }
            }

            // Populate Sell Price
            if (types.includes('sell') && data.salePrice) {
                document.getElementById('sale-price').value = data.salePrice;
            }

            // Populate Donate Note
            if (types.includes('donate') && data.donateDescription) {
                document.getElementById('donate-note').value = data.donateDescription;
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
    } finally {
        hideLoader();
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
    async function handleImageUpload(e) {
        const files = Array.from(e.target.files);

        if ((files.length + existingImages.length) > 5) {
            showToast("Maximum 5 images allowed total", 'error');
            imageInput.value = '';
            selectedFiles = [];
            return;
        }

        // SECURITY FIX: Validate all files
        const { validateImageFiles } = await import('./file-validator.js');
        const validation = validateImageFiles(files);

        if (!validation.valid) {
            showToast(validation.errors.join('\n'), 'error');
            imageInput.value = '';
            return;
        }

        selectedFiles = files;

        // PERFORMANCE FIX: Compress images before upload
        const { compressImage } = await import('./image-compressor.js');
        const compressedFiles = [];

        // Show loader during compression
        showLoader(`Compressing ${files.length} image(s)...`);

        for (const file of files) {
            try {
                const compressed = await compressImage(file);
                compressedFiles.push(compressed);
            } catch (error) {
                console.error('Compression error:', error);
                // Fallback to original if compression fails
                compressedFiles.push(file);
            }
        }

        hideLoader();
        selectedFiles = compressedFiles;

        files.forEach((file, index) => {
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
            showToast("Please login to submit your listing.", 'info');

            // Scroll to top to see banner or just triggering modal
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Trigger Login Modal
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                setTimeout(() => loginBtn.click(), 500);
            }
            return;
        }

        // 1. Transaction Type Validation
        const isRent = document.getElementById('mode-rent').checked;
        const isSell = document.getElementById('mode-sell').checked;
        const isDonate = document.getElementById('mode-donate').checked;

        if (!isRent && !isSell && !isDonate) {
            showToast("Please select at least one option: Rent, Sell, or Donate.", 'error');
            return;
        }

        // Basic Validation
        const title = document.getElementById('title').value;
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        const location = document.getElementById('location').value;

        // Pricing Validation
        const priceDay = document.getElementById('price-day').value;
        const priceWeek = document.getElementById('price-week').value;
        const priceMonth = document.getElementById('price-month').value;
        const salePrice = document.getElementById('sale-price').value;
        const donateNote = document.getElementById('donate-note').value;
        const deposit = document.getElementById('deposit').value;

        if (isRent && !priceDay && !priceWeek && !priceMonth) {
            showToast("Please enter at least one Rental Rate (Daily, Weekly, or Monthly).", 'error');
            return;
        }

        if (isSell && !salePrice) {
            showToast("Please enter a Selling Price.", 'error');
            return;
        }

        // Checking images
        if (selectedFiles.length === 0 && existingImages.length === 0) {
            showToast("Please select at least one image.", 'error');
            return;
        }

        // showToast(isEditMode ? "Updating listing..." : "Creating listing...", 'info');
        showLoader(isEditMode ? "Updating your listing..." : "Creating your listing... (Uploading images)");
        submitBtn.disabled = true;

        try {
            const imageUrls = [...existingImages]; // Keep old

            // Upload New Images
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    // Update loader message for multi-file upload
                    // showLoader(`Uploading image ${imageUrls.length + 1}...`);
                    const compressedFile = await compressImage(file);
                    const storageRef = ref(storage, `listings/${currentUser.uid}/${Date.now()}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, compressedFile);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    imageUrls.push(downloadURL);
                }
            }

            // Sanitize Input (XSS Prevention)
            const sanitize = escapeHtml;

            const transactionTypes = [];
            if (isRent) transactionTypes.push('rent');
            if (isSell) transactionTypes.push('sell');
            if (isDonate) transactionTypes.push('donate');

            const listingData = {
                title: sanitize(title),
                description: sanitize(description),
                category: category,
                location: sanitize(location),
                transactionTypes: transactionTypes, // NEW
                rates: {
                    daily: isRent ? (priceDay || null) : null,
                    weekly: isRent ? (priceWeek || null) : null,
                    monthly: isRent ? (priceMonth || null) : null
                },
                salePrice: isSell ? Number(salePrice) : null, // NEW
                donateDescription: isDonate ? sanitize(donateNote) : null, // NEW
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
                hideLoader();
                showToast("Listing submitted for approval! ⏳", 'success');

                // Notify Admin via WhatsApp
                setTimeout(() => {
                    const adminPhone = "919372776019";
                    const msg = `📦 *New Item Listed*\n\nUser: ${currentUser.displayName || 'Unknown'}\nItem: ${listingData.title}\nPrice: ₹${listingData.rates?.daily || listingData.price || 'N/A'}\n\nPlease review in Admin Panel.`;
                    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                }, 1000);

            } else {
                const docRef = doc(db, "listings", currentListingId);
                await updateDoc(docRef, listingData);
                hideLoader();
                showToast("Listing updated successfully! ✅", 'success');
            }

            setTimeout(() => {
                window.location.href = isEditMode ? 'my-listings.html' : '/';
            }, 2500);

        } catch (error) {
            console.error("Error saving listing:", error);
            hideLoader();
            showToast("Failed to save listing: " + error.message, 'error');
            submitBtn.disabled = false;
        }
    });
}
