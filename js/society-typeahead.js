/**
 * Society Typeahead Search Component
 * Provides typeahead search for society selection with option to add new society
 */

import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { showToast } from './toast-enhanced.js';

// Default societies fallback
const DEFAULT_SOCIETIES_FALLBACK = [
    { id: 'megapolis-splendour', name: 'Megapolis Splendour', approved: true },
    { id: 'megapolis-sparklet', name: 'Megapolis Sparklet', approved: true },
    { id: 'megapolis-senerity', name: 'Megapolis Senerity', approved: true },
    { id: 'megapolis-mystic', name: 'Megapolis Mystic', approved: true },
    { id: 'megapolis-sangaria', name: 'Megapolis Sangaria', approved: true },
    { id: 'megapolis-saffron', name: 'Megapolis Saffron', approved: true },
    { id: 'megapolis-symphony', name: 'Megapolis Symphony', approved: true },
    { id: 'megapolis-sunway', name: 'Megapolis Sunway', approved: true },
    { id: 'life-republic', name: 'Life Republic', approved: true },
    { id: 'blue-ridge', name: 'Blue Ridge', approved: true }
];

let allSocieties = [];
let activeTypeahead = null;

/**
 * Initialize society typeahead on an input field
 * @param {string} inputId - ID of the input element
 * @param {string} hiddenInputId - ID of hidden input for storing selected society ID (optional)
 */
export async function initSocietyTypeahead(inputId, hiddenInputId = null) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Load societies from Firestore
    await loadApprovedSocieties();

    // Create wrapper and dropdown
    const wrapper = document.createElement('div');
    wrapper.className = 'typeahead-wrapper';
    wrapper.style.cssText = 'position: relative;';

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'typeahead-dropdown';
    dropdown.id = `${inputId}-dropdown`;
    dropdown.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        max-height: 250px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
    `;
    wrapper.appendChild(dropdown);

    // Event listeners
    input.addEventListener('input', (e) => handleInput(e, dropdown, inputId, hiddenInputId));
    input.addEventListener('focus', (e) => handleInput(e, dropdown, inputId, hiddenInputId));
    input.addEventListener('blur', () => {
        setTimeout(() => { dropdown.style.display = 'none'; }, 200);
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => handleKeydown(e, dropdown, input, hiddenInputId));

    activeTypeahead = { input, dropdown, hiddenInputId };
}

/**
 * Load approved societies from Firestore
 */
async function loadApprovedSocieties() {
    // Return cached if already loaded
    if (allSocieties.length > 0) return;

    try {
        console.log('Fetching societies from Firestore...');
        // Query 'societies' collection
        const q = query(
            collection(db, 'societies'),
            orderBy('name'),
            limit(200)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
            allSocieties = snap.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                approved: true
            }));
            console.log(`Loaded ${allSocieties.length} societies from Firestore`);
        } else {
            console.warn('No societies found in Firestore, falling back to defaults.');
            allSocieties = [...DEFAULT_SOCIETIES_FALLBACK];
        }
    } catch (error) {
        console.error('Error loading societies from Firestore:', error);
        console.log('Using fallback societies');
        allSocieties = [...DEFAULT_SOCIETIES_FALLBACK];
    }
}

/**
 * Handle input changes and show suggestions
 */
function handleInput(e, dropdown, inputId, hiddenInputId) {
    const value = e.target.value.toLowerCase().trim();

    // Filter societies
    const matches = allSocieties.filter(s =>
        s.name.toLowerCase().includes(value)
    ).slice(0, 8);

    // Build dropdown content
    let html = '';

    if (matches.length > 0) {
        html += matches.map(s => `
            <div class="typeahead-item" data-id="${s.id}" data-name="${s.name}" style="
                padding: 0.75rem 1rem;
                cursor: pointer;
                border-bottom: 1px solid #f1f5f9;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            ">
                <i class="fa-solid fa-building" style="color: #94a3b8;"></i>
                <span>${s.name}</span>
                ${s.approved ? '<span style="margin-left: auto; font-size: 0.7rem; color: #22c55e;">✓ Approved</span>' : ''}
            </div>
        `).join('');
    }

    // Always show "Add new society" option at the bottom
    html += `
        <div class="typeahead-add-new" style="
            padding: 0.75rem 1rem;
            cursor: pointer;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border-top: 2px solid #0ea5e9;
        " data-action="add-new">
            <i class="fa-solid fa-plus-circle" style="color: #0ea5e9;"></i>
            <span style="color: #0369a1; font-weight: 500;">Add new society: "${e.target.value || 'Type name'}"</span>
        </div>
    `;

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';

    // Add click handlers
    dropdown.querySelectorAll('.typeahead-item').forEach(item => {
        item.addEventListener('click', () => {
            const name = item.dataset.name;
            const id = item.dataset.id;
            e.target.value = name;
            if (hiddenInputId) {
                document.getElementById(hiddenInputId).value = id;
            }
            dropdown.style.display = 'none';
        });

        item.addEventListener('mouseenter', () => {
            item.style.background = '#f1f5f9';
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = '';
        });
    });

    // Add new society handler
    dropdown.querySelector('.typeahead-add-new')?.addEventListener('click', () => {
        showAddSocietyModal(e.target.value, e.target, hiddenInputId);
        dropdown.style.display = 'none';
    });
}

/**
 * Handle keyboard navigation
 */
function handleKeydown(e, dropdown, input, hiddenInputId) {
    const items = dropdown.querySelectorAll('.typeahead-item, .typeahead-add-new');
    const current = dropdown.querySelector('.typeahead-item.active, .typeahead-add-new.active');
    let idx = [...items].indexOf(current);

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        idx = (idx + 1) % items.length;
        items.forEach(i => i.classList.remove('active'));
        items[idx].classList.add('active');
        items[idx].style.background = '#f1f5f9';
        items[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx - 1 + items.length) % items.length;
        items.forEach(i => i.classList.remove('active'));
        items[idx].classList.add('active');
        items[idx].style.background = '#f1f5f9';
        items[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && current) {
        e.preventDefault();
        if (current.dataset.action === 'add-new') {
            showAddSocietyModal(input.value, input, hiddenInputId);
        } else {
            input.value = current.dataset.name;
            if (hiddenInputId) {
                document.getElementById(hiddenInputId).value = current.dataset.id;
            }
        }
        dropdown.style.display = 'none';
    } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
    }
}

/**
 * Show modal to add a new society
 */
function showAddSocietyModal(societyName, inputElement, hiddenInputId) {
    const existing = document.getElementById('add-society-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'add-society-modal';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 1rem;"
             onclick="if(event.target === this) this.remove()">
            <div style="background: white; border-radius: 1rem; max-width: 450px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.2);">
                <div style="padding: 1.5rem; border-bottom: 1px solid #e2e8f0;">
                    <h2 style="margin: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-building" style="color: #0ea5e9;"></i>
                        Request New Society
                    </h2>
                </div>
                
                <form id="add-society-form" style="padding: 1.5rem;">
                    <div style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Society/Township Name *</label>
                        <input type="text" id="new-society-name" value="${societyName}" required
                               style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 1rem;">
                    </div>

                    <div style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Area/Location *</label>
                        <input type="text" id="new-society-area" value="Hinjewadi" required
                               style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 1rem;">
                    </div>

                    <div style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Pincode</label>
                        <input type="text" id="new-society-pincode" placeholder="411057" pattern="[0-9]{6}"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 1rem;">
                    </div>

                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 0.5rem; padding: 0.75rem; margin-bottom: 1.25rem;">
                        <p style="margin: 0; font-size: 0.85rem; color: #c2410c;">
                            <i class="fa-solid fa-info-circle" style="margin-right: 0.25rem;"></i>
                            Your request will be reviewed by our team. Once approved, the society will be available for listings.
                        </p>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <button type="button" onclick="this.closest('#add-society-modal').remove()" 
                                class="btn btn-outline" style="flex: 1;">Cancel</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fa-solid fa-paper-plane"></i> Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle form submit
    document.getElementById('add-society-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('new-society-name').value.trim();
        const area = document.getElementById('new-society-area').value.trim();
        const pincode = document.getElementById('new-society-pincode').value.trim();

        const user = auth.currentUser;
        if (!user) {
            showToast('Please login to submit a request', 'error');
            return;
        }

        try {
            // Create society request
            await addDoc(collection(db, 'society_requests'), {
                name: name,
                area: area,
                pincode: pincode,
                status: 'pending',
                requestedBy: user.uid,
                requestedByName: user.displayName || 'User',
                requestedByEmail: user.email,
                createdAt: serverTimestamp()
            });

            // Set the input value to the requested name (pending)
            if (inputElement) {
                inputElement.value = `${name} (Pending Approval)`;
                inputElement.dataset.pendingSociety = name;
            }

            modal.remove();
            showToast('✅ Society request submitted! We\'ll notify you once approved.', 'success');

        } catch (error) {
            console.error('Error submitting society request:', error);
            showToast('Failed to submit request. Please try again.', 'error');
        }
    });
}

/**
 * Get selected society value (handles pending societies)
 */
export function getSelectedSociety(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return null;

    // Check if it's a pending society
    if (input.dataset.pendingSociety) {
        return {
            name: input.dataset.pendingSociety,
            status: 'pending',
            isPending: true
        };
    }

    // Find in approved list
    const society = allSocieties.find(s => s.name === input.value);
    if (society) {
        return {
            id: society.id,
            name: society.name,
            status: 'approved',
            isPending: false
        };
    }

    // Return raw value if not found
    return {
        name: input.value,
        status: 'unknown',
        isPending: false
    };
}

// Export for global access
window.initSocietyTypeahead = initSocietyTypeahead;
window.getSelectedSociety = getSelectedSociety;
