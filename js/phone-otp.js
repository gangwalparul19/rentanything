/**
 * Phone OTP Verification Module
 * Uses Firebase Phone Authentication with reCAPTCHA verification
 */

import { auth, db } from './firebase-config.js';
import { RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, linkWithCredential, updatePhoneNumber } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from './toast-enhanced.js';

// Global reCAPTCHA verifier instance
let recaptchaVerifier = null;
let confirmationResult = null;

/**
 * Initialize reCAPTCHA verifier
 * @param {string} containerId - The ID of the container element for reCAPTCHA
 */
export function initRecaptcha(containerId = 'recaptcha-container') {
    // Clear existing verifier if any
    if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        recaptchaVerifier = null;
    }

    // Create the container if it doesn't exist
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
    }

    try {
        recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => {
                // reCAPTCHA solved, allow signInWithPhoneNumber
                console.log('reCAPTCHA verified');
            },
            'expired-callback': () => {
                showToast('reCAPTCHA expired. Please try again.', 'warning');
                recaptchaVerifier = null;
            }
        });
    } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
    }

    return recaptchaVerifier;
}

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Phone number with country code (e.g., +919876543210)
 * @returns {Promise<boolean>} - True if OTP sent successfully
 */
export async function sendOTP(phoneNumber) {
    try {
        // Format phone number
        let formattedNumber = phoneNumber.trim();

        // Add India country code if not present
        if (!formattedNumber.startsWith('+')) {
            // Remove leading 0 if present
            if (formattedNumber.startsWith('0')) {
                formattedNumber = formattedNumber.substring(1);
            }
            formattedNumber = '+91' + formattedNumber;
        }

        // Validate phone number format
        if (!/^\+\d{10,15}$/.test(formattedNumber)) {
            showToast('Please enter a valid phone number', 'error');
            return false;
        }

        // Initialize reCAPTCHA if not already done
        if (!recaptchaVerifier) {
            initRecaptcha();
        }

        console.log('Sending OTP to:', formattedNumber);

        // Send OTP
        confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, recaptchaVerifier);

        showToast('OTP sent successfully!', 'success');
        return true;

    } catch (error) {
        console.error('Error sending OTP:', error);

        // Handle specific errors
        if (error.code === 'auth/invalid-phone-number') {
            showToast('Invalid phone number format', 'error');
        } else if (error.code === 'auth/too-many-requests') {
            showToast('Too many attempts. Please try again later.', 'error');
        } else if (error.code === 'auth/captcha-check-failed') {
            showToast('reCAPTCHA verification failed. Please try again.', 'error');
            recaptchaVerifier = null;
        } else {
            showToast('Failed to send OTP. Please try again.', 'error');
        }

        return false;
    }
}

/**
 * Verify OTP and link phone to user account
 * @param {string} otp - The OTP code entered by user
 * @returns {Promise<boolean>} - True if verified successfully
 */
export async function verifyOTP(otp) {
    try {
        if (!confirmationResult) {
            showToast('Please request OTP first', 'error');
            return false;
        }

        if (!otp || otp.length !== 6) {
            showToast('Please enter a valid 6-digit OTP', 'error');
            return false;
        }

        // Verify OTP
        const credential = PhoneAuthProvider.credential(
            confirmationResult.verificationId,
            otp
        );

        const user = auth.currentUser;

        if (user) {
            try {
                // Try to link the phone number to existing account
                await linkWithCredential(user, credential);
                console.log('Phone number linked to account');
            } catch (linkError) {
                // If already linked or other error, try updating phone number
                if (linkError.code === 'auth/provider-already-linked' ||
                    linkError.code === 'auth/credential-already-in-use') {
                    console.log('Phone already linked, verification successful');
                } else {
                    console.error('Link error:', linkError);
                }
            }
        }

        showToast('Phone verified successfully!', 'success');
        confirmationResult = null;
        return true;

    } catch (error) {
        console.error('Error verifying OTP:', error);

        if (error.code === 'auth/invalid-verification-code') {
            showToast('Invalid OTP. Please try again.', 'error');
        } else if (error.code === 'auth/code-expired') {
            showToast('OTP expired. Please request a new one.', 'error');
        } else {
            showToast('Verification failed. Please try again.', 'error');
        }

        return false;
    }
}

/**
 * Save phone number to user's Firestore document
 * @param {string} phoneNumber - The verified phone number
 * @returns {Promise<boolean>} - True if saved successfully
 */
export async function savePhoneToProfile(phoneNumber) {
    try {
        const user = auth.currentUser;
        if (!user) return false;

        // Format phone number
        let formattedNumber = phoneNumber.trim();
        if (!formattedNumber.startsWith('+')) {
            if (formattedNumber.startsWith('0')) {
                formattedNumber = formattedNumber.substring(1);
            }
            formattedNumber = '+91' + formattedNumber;
        }

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            phoneNumber: formattedNumber,
            phoneVerified: true,
            phoneVerifiedAt: serverTimestamp()
        });

        console.log('Phone number saved to profile');
        return true;

    } catch (error) {
        console.error('Error saving phone to profile:', error);
        return false;
    }
}

/**
 * Check if user has a verified phone number
 * @returns {Promise<{hasPhone: boolean, phoneNumber: string|null}>}
 */
export async function checkUserPhone() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { hasPhone: false, phoneNumber: null };
        }

        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const phoneNumber = userData.phoneNumber || null;

            return {
                hasPhone: !!phoneNumber,
                phoneNumber: phoneNumber,
                isVerified: userData.phoneVerified || false
            };
        }

        return { hasPhone: false, phoneNumber: null, isVerified: false };

    } catch (error) {
        console.error('Error checking user phone:', error);
        return { hasPhone: false, phoneNumber: null, isVerified: false };
    }
}

/**
 * Create and show the Phone OTP verification modal
 * @param {Function} onSuccess - Callback function after successful verification
 */
export function showPhoneVerificationModal(onSuccess) {
    // Remove existing modal if any
    const existingModal = document.getElementById('phone-otp-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div id="phone-otp-modal" class="otp-modal-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        ">
            <div class="otp-modal-content" style="
                background: white;
                border-radius: 1rem;
                width: 90%;
                max-width: 400px;
                padding: 2rem;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease;
            ">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <i class="fa-solid fa-phone" style="font-size: 1.8rem; color: white;"></i>
                    </div>
                    <h2 style="margin: 0 0 0.5rem; color: #1e293b; font-size: 1.5rem;">Verify Your Phone</h2>
                    <p style="color: #64748b; font-size: 0.95rem; margin: 0;">
                        Please verify your phone number to complete this booking
                    </p>
                </div>

                <!-- Step 1: Phone Number Input -->
                <div id="otp-step-phone">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #1e293b;">
                        Mobile Number
                    </label>
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                        <span style="background: #f1f5f9; padding: 0.75rem 1rem; border-radius: 0.5rem; color: #64748b; font-weight: 500;">
                            +91
                        </span>
                        <input type="tel" id="otp-phone-input" placeholder="Enter 10-digit number" 
                            maxlength="10" pattern="[0-9]{10}"
                            style="
                                flex: 1;
                                padding: 0.75rem 1rem;
                                border: 2px solid #e2e8f0;
                                border-radius: 0.5rem;
                                font-size: 1rem;
                                outline: none;
                                transition: border-color 0.2s;
                            "
                            onfocus="this.style.borderColor='#6366f1'"
                            onblur="this.style.borderColor='#e2e8f0'"
                        >
                    </div>
                    <button id="otp-send-btn" style="
                        width: 100%;
                        padding: 0.875rem;
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                        color: white;
                        border: none;
                        border-radius: 0.5rem;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(99,102,241,0.4)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <i class="fa-solid fa-paper-plane"></i> Send OTP
                    </button>
                </div>

                <!-- Step 2: OTP Input (Hidden Initially) -->
                <div id="otp-step-verify" style="display: none;">
                    <p style="text-align: center; color: #64748b; margin-bottom: 1rem;">
                        Enter the 6-digit code sent to <strong id="otp-sent-phone"></strong>
                    </p>
                    <div style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
                        <input type="text" id="otp-code-input" maxlength="6" placeholder="000000"
                            style="
                                width: 180px;
                                padding: 1rem;
                                border: 2px solid #e2e8f0;
                                border-radius: 0.5rem;
                                font-size: 1.5rem;
                                text-align: center;
                                letter-spacing: 0.5rem;
                                font-weight: 700;
                                outline: none;
                            "
                            onfocus="this.style.borderColor='#6366f1'"
                            onblur="this.style.borderColor='#e2e8f0'"
                        >
                    </div>
                    <button id="otp-verify-btn" style="
                        width: 100%;
                        padding: 0.875rem;
                        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                        color: white;
                        border: none;
                        border-radius: 0.5rem;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        margin-bottom: 1rem;
                    ">
                        <i class="fa-solid fa-check"></i> Verify & Continue
                    </button>
                    <div style="text-align: center;">
                        <button id="otp-resend-btn" style="
                            background: none;
                            border: none;
                            color: #6366f1;
                            cursor: pointer;
                            font-size: 0.9rem;
                        " disabled>
                            Resend OTP in <span id="otp-timer">30</span>s
                        </button>
                    </div>
                </div>

                <!-- Close Button -->
                <button onclick="closePhoneVerificationModal()" style="
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #94a3b8;
                    cursor: pointer;
                " aria-label="Close">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
        </div>
        
        <!-- reCAPTCHA container -->
        <div id="recaptcha-container"></div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add styles for animations
    if (!document.getElementById('otp-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'otp-modal-styles';
        styles.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    let currentPhoneNumber = '';
    let resendTimer = null;

    // Send OTP button click handler
    document.getElementById('otp-send-btn').addEventListener('click', async () => {
        const phoneInput = document.getElementById('otp-phone-input');
        const phoneNumber = phoneInput.value.trim();

        if (!/^\d{10}$/.test(phoneNumber)) {
            showToast('Please enter a valid 10-digit mobile number', 'error');
            return;
        }

        const sendBtn = document.getElementById('otp-send-btn');
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

        const success = await sendOTP(phoneNumber);

        if (success) {
            currentPhoneNumber = phoneNumber;
            document.getElementById('otp-step-phone').style.display = 'none';
            document.getElementById('otp-step-verify').style.display = 'block';
            document.getElementById('otp-sent-phone').textContent = '+91 ' + phoneNumber;

            // Start resend timer
            startResendTimer();
        }

        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
    });

    // Verify OTP button click handler
    document.getElementById('otp-verify-btn').addEventListener('click', async () => {
        const otpInput = document.getElementById('otp-code-input');
        const otp = otpInput.value.trim();

        const verifyBtn = document.getElementById('otp-verify-btn');
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

        const success = await verifyOTP(otp);

        if (success) {
            // Save phone number to profile
            await savePhoneToProfile(currentPhoneNumber);

            // Close modal
            closePhoneVerificationModal();

            // Call success callback
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
        }

        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Verify & Continue';
    });

    // Resend OTP timer
    function startResendTimer() {
        let seconds = 30;
        const timerSpan = document.getElementById('otp-timer');
        const resendBtn = document.getElementById('otp-resend-btn');

        resendBtn.disabled = true;

        if (resendTimer) clearInterval(resendTimer);

        resendTimer = setInterval(() => {
            seconds--;
            timerSpan.textContent = seconds;

            if (seconds <= 0) {
                clearInterval(resendTimer);
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend OTP';

                resendBtn.onclick = async () => {
                    resendBtn.disabled = true;
                    const success = await sendOTP(currentPhoneNumber);
                    if (success) {
                        startResendTimer();
                    } else {
                        resendBtn.disabled = false;
                    }
                };
            }
        }, 1000);
    }

    // Allow only numbers in phone input
    document.getElementById('otp-phone-input').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });

    // Auto-submit OTP when 6 digits entered
    document.getElementById('otp-code-input').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        if (e.target.value.length === 6) {
            document.getElementById('otp-verify-btn').click();
        }
    });
}

/**
 * Close the phone verification modal
 */
export function closePhoneVerificationModal() {
    const modal = document.getElementById('phone-otp-modal');
    if (modal) {
        modal.remove();
    }
}

// Expose to window for HTML onclick
window.closePhoneVerificationModal = closePhoneVerificationModal;

export default {
    initRecaptcha,
    sendOTP,
    verifyOTP,
    savePhoneToProfile,
    checkUserPhone,
    showPhoneVerificationModal,
    closePhoneVerificationModal
};
