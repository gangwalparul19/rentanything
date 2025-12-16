import { db, auth, storage } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { showToast } from './toast.js';
import { compressImage } from './image-compressor.js';

// State
let currentStep = 1;
let selectedBooking = null;
let uploadedEvidence = [];
let evidenceFiles = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTheme();
    initAuth();
    initHeader();

    loadUserBookings();
    setupEventListeners();
});

// Load user's bookings
async function loadUserBookings() {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to file a dispute', 'error');
        setTimeout(() => window.location.href = '/?login=true', 2000);
        return;
    }

    const bookingSelect = document.getElementById('booking-select');
    bookingSelect.innerHTML = '<option value="">Loading...</option>';

    try {
        // Fetch bookings where user is renter or owner
        const q1 = query(collection(db, 'bookings'), where('renterId', '==', user.uid));
        const q2 = query(collection(db, 'bookings'), where('ownerId', '==', user.uid));

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const bookings = new Map();
        snap1.forEach(doc => {
            const data = doc.data();
            // Only completed or active bookings eligible for disputes
            if (['completed', 'confirmed', 'active'].includes(data.status)) {
                bookings.set(doc.id, { id: doc.id, ...data, userRole: 'renter' });
            }
        });
        snap2.forEach(doc => {
            const data = doc.data();
            if (['completed', 'confirmed', 'active'].includes(data.status)) {
                bookings.set(doc.id, { id: doc.id, ...data, userRole: 'owner' });
            }
        });

        if (bookings.size === 0) {
            bookingSelect.innerHTML = '<option value="">No eligible bookings found</option>';
            showToast('You need a completed booking to file a dispute', 'info');
            return;
        }

        bookingSelect.innerHTML = '<option value="">Select a booking...</option>';

        const sorted = Array.from(bookings.values()).sort((a, b) =>
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );

        sorted.forEach(booking => {
            const date = booking.startDate ?
                new Date(booking.startDate.seconds * 1000).toLocaleDateString() : 'N/A';
            const option = document.createElement('option');
            option.value = booking.id;
            option.textContent = `${booking.listingTitle} (${date}) - You are ${booking.userRole}`;
            option.dataset.booking = JSON.stringify(booking);
            bookingSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading bookings:', error);
        bookingSelect.innerHTML = '<option value="">Error loading bookings</option>';
        showToast('Failed to load bookings', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Booking selection
    document.getElementById('booking-select').addEventListener('change', (e) => {
        if (e.target.value) {
            selectedBooking = JSON.parse(e.target.selectedOptions[0].dataset.booking);
        }
    });

    // Evidence upload
    document.getElementById('evidence-input').addEventListener('change', handleEvidenceSelect);
}

// Step navigation
window.nextStep = function (stepNumber) {
    if (!validateCurrentStep()) return;

    if (currentStep === 5 && stepNumber > 5) {
        // Final step, submit instead
        return;
    }

    goToStep(stepNumber);
};

window.prevStep = function (stepNumber) {
    goToStep(stepNumber);
};

function goToStep(stepNumber) {
    // Hide current step
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    document.querySelector(`[data-step="${currentStep}"]`).classList.remove('active');

    // Show new step
    currentStep = stepNumber;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    document.querySelector(`[data-step="${currentStep}"]`).classList.add('active');

    // Mark previous steps as completed
    for (let i = 1; i < currentStep; i++) {
        document.querySelector(`[data-step="${i}"]`).classList.add('completed');
    }

    // Update progress bar
    const progress = ((currentStep - 1) / 4) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;

    // If step 5, populate summary
    if (currentStep === 5) {
        populateReviewSummary();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validate current step
function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            if (!selectedBooking) {
                showToast('Please select a booking', 'error');
                return false;
            }
            return true;

        case 2:
            const disputeType = document.getElementById('dispute-type').value;
            if (!disputeType) {
                showToast('Please select a dispute type', 'error');
                return false;
            }
            return true;

        case 3:
            const description = document.getElementById('dispute-description').value.trim();
            if (description.length < 50) {
                showToast('Description must be at least 50 characters', 'error');
                return false;
            }
            return true;

        case 4:
            if (evidenceFiles.length === 0) {
                showToast('Please upload at least one piece of evidence', 'error');
                return false;
            }
            return true;

        default:
            return true;
    }
}

// Handle evidence file selection
function handleEvidenceSelect(e) {
    const files = Array.from(e.target.files);

    if (evidenceFiles.length + files.length > 10) {
        showToast('Maximum 10 evidence files allowed', 'error');
        return;
    }

    files.forEach(file => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            showToast(`${file.name} is not a valid file type`, 'error');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast(`${file.name} is too large (max 5MB)`, 'error');
            return;
        }

        evidenceFiles.push(file);
        displayEvidencePreview(file);
    });

    e.target.value = ''; // Reset input
}

// Display evidence preview
function displayEvidencePreview(file) {
    const preview = document.getElementById('evidence-preview');
    const index = evidenceFiles.length - 1;

    const item = document.createElement('div');
    item.className = 'evidence-item';
    item.dataset.index = index;

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            item.innerHTML = `
                <img src="${e.target.result}" alt="Evidence ${index + 1}">
                <button class="evidence-remove" onclick="removeEvidence(${index})">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        // PDF icon
        item.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f3f4f6;">
                <i class="fa-solid fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
            </div>
            <button class="evidence-remove" onclick="removeEvidence(${index})">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
    }

    preview.appendChild(item);
}

// Remove evidence
window.removeEvidence = function (index) {
    evidenceFiles.splice(index, 1);

    // Rebuild preview
    const preview = document.getElementById('evidence-preview');
    preview.innerHTML = '';
    evidenceFiles.forEach(file => displayEvidencePreview(file));
};

// Populate review summary
function populateReviewSummary() {
    const disputeType = document.getElementById('dispute-type');
    const description = document.getElementById('dispute-description').value;

    const summary = document.getElementById('dispute-summary');
    summary.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">Booking:</span>
            <span class="summary-value">${selectedBooking.listingTitle}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Your Role:</span>
            <span class="summary-value">${selectedBooking.userRole}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Dispute Type:</span>
            <span class="summary-value">${disputeType.selectedOptions[0].textContent}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Description:</span>
            <span class="summary-value">${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Evidence Files:</span>
            <span class="summary-value">${evidenceFiles.length} file(s)</span>
        </div>
    `;
}

// Submit dispute
window.submitDispute = async function () {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to submit', 'error');
        return;
    }

    const submitBtn = event.target;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    try {
        // 1. Upload evidence files
        showToast('Uploading evidence...', 'info');
        const evidenceUrls = await uploadEvidenceFiles(user.uid);

        // 2. Determine respondent
        const respondentId = selectedBooking.userRole === 'renter' ?
            selectedBooking.ownerId : selectedBooking.renterId;
        const respondentName = selectedBooking.userRole === 'renter' ?
            selectedBooking.ownerName || 'Owner' : selectedBooking.renterName || 'Renter';

        // 3. Create dispute document
        showToast('Creating dispute...', 'info');
        const disputeData = {
            // Parties
            reporterId: user.uid,
            reporterName: user.displayName || 'User',
            reporterType: selectedBooking.userRole,

            respondentId: respondentId,
            respondentName: respondentName,
            respondentType: selectedBooking.userRole === 'renter' ? 'owner' : 'renter',

            // Context
            bookingId: selectedBooking.id,
            listingId: selectedBooking.listingId,
            listingTitle: selectedBooking.listingTitle,

            // Dispute details
            disputeType: document.getElementById('dispute-type').value,
            description: document.getElementById('dispute-description').value,
            evidenceUrls: evidenceUrls,

            // Status
            status: 'open',
            priority: 'medium',
            resolutionType: null,
            resolutionAmount: 0,
            resolutionNotes: '',

            // Timeline
            timeline: [{
                action: 'filed',
                actor: user.uid,
                actorName: user.displayName || 'User',
                timestamp: serverTimestamp(),
                details: 'Dispute filed by ' + (user.displayName || 'User')
            }],

            adminNotes: [],

            // Timestamps
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            resolvedAt: null
        };

        const disputeRef = await addDoc(collection(db, 'disputes'), disputeData);

        // 4. Notify respondent
        await addDoc(collection(db, 'notifications'), {
            userId: respondentId,
            title: 'Dispute Filed ⚖️',
            body: `A dispute has been filed regarding booking: ${selectedBooking.listingTitle}`,
            type: 'dispute_filed',
            disputeId: disputeRef.id,
            read: false,
            createdAt: serverTimestamp()
        });

        // 5. Notify admins (optional - if you have admin user list)
        // Could query admins collection and send notifications

        showToast('Dispute submitted successfully! 📨', 'success');

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = 'my-bookings.html';
        }, 2000);

    } catch (error) {
        console.error('Error submitting dispute:', error);
        showToast('Failed to submit dispute: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-gavel"></i> Submit Dispute';
    }
};

// Upload evidence files to Firebase Storage
async function uploadEvidenceFiles(userId) {
    const urls = [];
    const timestamp = Date.now();

    for (let i = 0; i < evidenceFiles.length; i++) {
        const file = evidenceFiles[i];
        let fileToUpload = file;

        // Compress images
        if (file.type.startsWith('image/')) {
            try {
                fileToUpload = await compressImage(file);
            } catch (e) {
                console.warn('Compression failed, using original:', e);
            }
        }

        // Upload to Storage: disputes/{userId}/{timestamp}_evidence_{index}.ext
        const ext = file.name.split('.').pop();
        const fileName = `${timestamp}_evidence_${i}.${ext}`;
        const storageRef = ref(storage, `disputes/${userId}/${fileName}`);

        await uploadBytes(storageRef, fileToUpload);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
    }

    return urls;
}
