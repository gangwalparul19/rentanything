
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from './toast-enhanced.js';
import { initHeader } from './header-manager.js';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initFooter } from './footer-manager.js';

const agreementIdEl = document.getElementById('agreement-id');
const ownerNameEl = document.getElementById('owner-name');
const renterNameEl = document.getElementById('renter-name');
const itemNameEl = document.getElementById('item-name');
const startDateEl = document.getElementById('start-date');
const endDateEl = document.getElementById('end-date');
const amountEl = document.getElementById('total-amount');
const currentDateEl = document.getElementById('current-date');

const ownerStatus = document.getElementById('owner-status');
const renterStatus = document.getElementById('renter-status');
const signBtn = document.getElementById('sign-btn');
const agreeCheckbox = document.getElementById('agree-checkbox');
const actionArea = document.getElementById('action-area');
const successMsg = document.getElementById('success-msg');

let bookingData = null;
let currentUser = null;
let bookingId = null;

document.addEventListener('DOMContentLoaded', () => {
    initHeader();      // 1. Inject HTML links and setup UI auth
    initMobileMenu();  // 2. Make menu clickable
    initTheme();       // 3. Setup dark/light mode
    initAuth();        // 4. Setup login button events
    initFooter();
    const urlParams = new URLSearchParams(window.location.search);
    bookingId = urlParams.get('id');

    if (!bookingId) {
        showToast("Invalid Agreement Link", "error");
        setTimeout(() => window.location.href = '/', 1500);
        return;
    }

    currentDateEl.textContent = new Date().toLocaleDateString();
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loadBooking(bookingId);
    } else {
        // Allow viewing public maybe? No, need auth to sign.
        window.location.href = '/?login=true';
    }
});

async function loadBooking(id) {
    try {
        const docRef = doc(db, "bookings", id);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            showToast("Booking not found", "error");
            return;
        }

        bookingData = snap.data();
        agreementIdEl.textContent = id;
        ownerNameEl.textContent = bookingData.ownerName;
        renterNameEl.textContent = bookingData.renterName;
        itemNameEl.textContent = bookingData.listingTitle;
        startDateEl.textContent = new Date(bookingData.startDate.seconds * 1000).toLocaleDateString();
        endDateEl.textContent = new Date(bookingData.endDate.seconds * 1000).toLocaleDateString();
        amountEl.textContent = bookingData.amount;

        // New Fields
        document.getElementById('deposit-amount').textContent = bookingData.deposit || '0';

        if (bookingData.ownerSigned) {
            document.getElementById('owner-ip-display').textContent = bookingData.ownerIp || 'Recorded';
            document.getElementById('owner-time-display').textContent = new Date(bookingData.ownerSignedAt.seconds * 1000).toLocaleString();
        }
        if (bookingData.renterSigned) {
            document.getElementById('renter-ip-display').textContent = bookingData.renterIp || 'Recorded';
            document.getElementById('renter-time-display').textContent = new Date(bookingData.renterSignedAt.seconds * 1000).toLocaleString();
        }

        renderSignatures();

    } catch (e) {
        console.error("Error loading agreement:", e);
    }
}

const signingUI = document.getElementById('signing-ui');
const canvas = document.getElementById('sig-canvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clear-sig');
const finalSignBtn = document.getElementById('final-sign-btn');
let isDrawing = false;

// Drawing Logic
function startDraw(e) {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(getPosition(e).x, getPosition(e).y);
}
function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    ctx.lineTo(getPosition(e).x, getPosition(e).y);
    ctx.stroke();
    finalSignBtn.disabled = false;
}
function stopDraw() { isDrawing = false; }
function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

// Guard: Only attach listeners if we're on the agreement page
if (canvas) {
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);
}

if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        finalSignBtn.disabled = true;
    });
}


function renderSignatures() {
    const isOwner = currentUser.uid === bookingData.ownerId;
    const isRenter = currentUser.uid === bookingData.renterId;

    // Load Metadata UI
    document.getElementById('meta-device').innerText = navigator.userAgent;
    fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => document.getElementById('meta-ip').innerText = d.ip)
        .catch(() => document.getElementById('meta-ip').innerText = 'Hidden');

    // Update Owner UI
    if (bookingData.ownerSigned) {
        document.getElementById('owner-placeholder').style.display = 'none';
        const img = document.getElementById('owner-sig-img');
        img.src = bookingData.ownerSignatureUrl; // Load sig image
        img.style.display = 'block';
        document.getElementById('owner-status').innerHTML += `<div style="font-size:0.7rem; color:green;">Signed: ${new Date(bookingData.ownerSignedAt.seconds * 1000).toLocaleString()}</div>`;
    }

    // Update Renter UI
    if (bookingData.renterSigned) {
        document.getElementById('renter-placeholder').style.display = 'none';
        const img = document.getElementById('renter-sig-img');
        img.src = bookingData.renterSignatureUrl;
        img.style.display = 'block';
        document.getElementById('renter-status').innerHTML += `<div style="font-size:0.7rem; color:green;">Signed: ${new Date(bookingData.renterSignedAt.seconds * 1000).toLocaleString()}</div>`;
    }

    // Check if I need to sign
    const myRole = isOwner ? 'owner' : (isRenter ? 'renter' : null);
    if (!myRole) return;

    const iHaveSigned = (myRole === 'owner' && bookingData.ownerSigned) || (myRole === 'renter' && bookingData.renterSigned);

    // Show Signing UI if pending
    if (!iHaveSigned) {
        signingUI.style.display = 'block';

        finalSignBtn.onclick = async () => {
            finalSignBtn.disabled = true;
            finalSignBtn.innerText = 'Encrypting & Saving...';

            try {
                // 1. Upload Signature Image
                const { ref, uploadString, getDownloadURL } = await import('firebase/storage');
                const { storage } = await import('./firebase-config.js');

                const dataUrl = canvas.toDataURL(); // PNG
                const sigRef = ref(storage, `signatures/${bookingId}_${myRole}.png`);
                await uploadString(sigRef, dataUrl, 'data_url');
                const sigUrl = await getDownloadURL(sigRef);

                // 2. Update Booking
                const updateData = {};
                if (myRole === 'owner') {
                    updateData.ownerSigned = true;
                    updateData.ownerSignedAt = serverTimestamp();
                    updateData.ownerSignatureUrl = sigUrl;
                    updateData.ownerIp = document.getElementById('meta-ip').innerText;
                } else {
                    updateData.renterSigned = true;
                    updateData.renterSignedAt = serverTimestamp();
                    updateData.renterSignatureUrl = sigUrl;
                    updateData.renterIp = document.getElementById('meta-ip').innerText;
                }

                // Activate if both done
                if ((myRole === 'owner' && bookingData.renterSigned) || (myRole === 'renter' && bookingData.ownerSigned)) {
                    updateData.status = 'active';
                }

                await updateDoc(doc(db, "bookings", bookingId), updateData);

                showToast("Signed Successfully! ✍️", "success");
                setTimeout(() => window.location.reload(), 1500);

            } catch (e) {
                console.error(e);
                showToast("Signing Failed", "error");
                finalSignBtn.disabled = false;
            }
        };
    } else {
        signingUI.style.display = 'none';
        if (bookingData.ownerSigned && bookingData.renterSigned) {
            successMsg.style.display = 'block';
        } else {
            successMsg.style.display = 'block';
            successMsg.innerHTML = '<h3>Waiting for other party...</h3>';
            successMsg.style.background = '#fff7ed';
            successMsg.style.color = '#c2410c';
        }
    }
}
