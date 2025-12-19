/**
 * My Properties - Dashboard for managing property listings
 */

import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { initHeader } from './header-manager.js';
import { initFooter } from './footer-manager.js';
import { showToast } from './toast-enhanced.js';
import { showLoader, hideLoader } from './loader.js';

document.addEventListener('DOMContentLoaded', () => {
    initHeader();      // 1. Inject links and setup UI auth
    initMobileMenu();  // 2. Make hamburger menu clickable
    initTheme();       // 3. Setup light/dark mode
    initAuth();        // 4. Setup login button listeners
    initFooter();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadMyProperties(user.uid);
        } else {
            window.location.href = '/?login=true';
        }
    });
});

async function loadMyProperties(userId) {
    showLoader('Loading your properties...');

    try {
        const q = query(
            collection(db, 'properties'),
            where('ownerId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const properties = [];
        querySnapshot.forEach((doc) => {
            properties.push({ id: doc.id, ...doc.data() });
        });

        renderProperties(properties);

    } catch (error) {
        console.error('Error loading properties:', error);
        showToast('Failed to load properties', 'error');
    } finally {
        hideLoader();
    }
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getApprovalStatusBadge(property) {
    const approvalStatus = property.approvalStatus || 'approved'; // Default to approved for old properties

    if (approvalStatus === 'pending') {
        return `
            <div style="padding: 0.75rem; border-radius: 0.5rem; text-align: center; font-size: 0.85rem; font-weight: 600; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; border: 1px solid #fbbf24;">
                <i class="fa-solid fa-clock"></i> Pending Approval
                <div style="font-size: 0.75rem; font-weight: 400; margin-top: 0.25rem; opacity: 0.8;">Under review by admin</div>
                <div style="font-size: 0.7rem; margin-top: 0.25rem; opacity: 0.7;">Submitted: ${formatDate(property.createdAt)}</div>
            </div>
        `;
    } else if (approvalStatus === 'rejected') {
        const reason = property.rejectionReason || 'No reason provided';
        return `
            <div style="padding: 0.75rem; border-radius: 0.5rem; text-align: center; font-size: 0.85rem; font-weight: 600; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b; border: 1px solid #f87171;">
                <i class="fa-solid fa-times-circle"></i> Rejected
                <div style="font-size: 0.75rem; font-weight: 400; margin-top: 0.25rem; opacity: 0.8;" title="${reason}">Reason: ${reason.substring(0, 30)}${reason.length > 30 ? '...' : ''}</div>
                <div style="font-size: 0.7rem; margin-top: 0.25rem; opacity: 0.7;">Rejected: ${formatDate(property.rejectedAt)}</div>
            </div>
        `;
    } else if (approvalStatus === 'approved') {
        return `
            <div style="padding: 0.75rem; border-radius: 0.5rem; text-align: center; font-size: 0.85rem; font-weight: 600; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46; border: 1px solid #34d399;">
                <i class="fa-solid fa-check-circle"></i> Approved
                <div style="font-size: 0.7rem; margin-top: 0.25rem; opacity: 0.7;">Approved: ${formatDate(property.approvedAt)}</div>
            </div>
        `;
    }

    return ''; // No badge if no approval status
}

function renderProperties(properties) {
    const container = document.getElementById('properties-container');

    if (properties.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem; background: white; border-radius: 1rem;">
                <i class="fa-solid fa-building" style="font-size: 4rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">No properties listed yet</h3>
                <p style="color: #6b7280; margin-bottom: 2rem;">Start by listing your first property</p>
                <a href="/list-property.html" class="btn btn-primary">
                    <i class="fa-solid fa-plus"></i> List Property
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; gap: 1.5rem;">
            ${properties.map(property => `
                <div style="background: white; border-radius: 1rem; overflow: hidden; display: grid; grid-template-columns: 250px 1fr auto; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <img src="${property.mainImage}" alt="${property.title}" 
                         style="width: 100%; height: 200px; object-fit: cover;">
                    
                    <div style="padding: 1.5rem;">
                        <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem;">${property.title}</h3>
                        <p style="color: #6b7280; margin-bottom: 1rem;">
                            <i class="fa-solid fa-location-dot"></i> ${property.address.area}, ${property.address.city}
                        </p>
                        
                        <div style="display: flex; gap: 1.5rem; margin-bottom: 1rem;">
                            <span>🛏️ ${property.bedrooms} Bed</span>
                            <span>🚿 ${property.bathrooms} Bath</span>
                            <span>📏 ${property.squareFeet} sqft</span>
                        </div>
                        
                        <div style="font-weight: 700; color: var(--primary); font-size: 1.2rem;">
                            ₹${property.monthlyRent.toLocaleString()}/month
                        </div>
                        
                        <div style="margin-top: 1rem; display: flex; gap: 1rem; font-size: 0.85rem; color: #6b7280;">
                            <span><i class="fa-solid fa-eye"></i> ${property.views || 0} views</span>
                            <span><i class="fa-solid fa-envelope"></i> ${property.inquiries || 0} inquiries</span>
                        </div>
                    </div>
                    
                    <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; border-left: 1px solid #e5e7eb;">
                        ${getApprovalStatusBadge(property)}
                        
                        <span style="padding: 0.5rem 1rem; border-radius: 0.5rem; text-align: center; font-size: 0.85rem; font-weight: 600; ${property.status === 'available' ? 'background: #dcfce7; color: #15803d;' : property.status === 'pending' ? 'background: #fef3c7; color: #92400e;' : 'background: #fee2e2; color: #991b1b;'}">
                            ${property.status === 'available' ? '✓ Available' : property.status === 'pending' ? '⏳ Pending' : '✗ Rented'}
                        </span>
                        
                        <a href="/property-details.html?id=${property.id}" class="btn btn-outline" style="text-align: center;">
                            <i class="fa-solid fa-eye"></i> View
                        </a>
                        
                        ${(property.approvalStatus === 'approved' || !property.approvalStatus) ? `
                            ${property.status === 'available' ? `
                                <button onclick="markAsRented('${property.id}')" class="btn btn-outline" style="border-color: #22c55e; color: #22c55e;">
                                    <i class="fa-solid fa-check"></i> Mark Rented
                                </button>
                            ` : `
                                <button onclick="markAsAvailable('${property.id}')" class="btn btn-outline" style="border-color: #0ea5e9; color: #0ea5e9;">
                                    <i class="fa-solid fa-rotate"></i> Mark Available
                                </button>
                            `}
                            
                            <button onclick="deleteProperty('${property.id}')" class="btn btn-outline" style="border-color: #ef4444; color: #ef4444;">
                                <i class="fa-solid fa-trash"></i> Delete
                            </button>
                        ` : `
                            <button disabled class="btn btn-outline" style="opacity: 0.5; cursor: not-allowed; border-color: #9ca3af; color: #9ca3af;" title="Actions disabled until approved">
                                <i class="fa-solid fa-lock"></i> Actions Disabled
                            </button>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Mark as rented
window.markAsRented = async (propertyId) => {
    if (!confirm('Mark this property as rented?')) return;

    try {
        await updateDoc(doc(db, 'properties', propertyId), {
            status: 'rented'
        });
        showToast('Property marked as rented', 'success');
        loadMyProperties(auth.currentUser.uid);
    } catch (error) {
        console.error('Error updating property:', error);
        showToast('Failed to update property', 'error');
    }
};

// Mark as available
window.markAsAvailable = async (propertyId) => {
    try {
        await updateDoc(doc(db, 'properties', propertyId), {
            status: 'available'
        });
        showToast('Property marked as available', 'success');
        loadMyProperties(auth.currentUser.uid);
    } catch (error) {
        console.error('Error updating property:', error);
        showToast('Failed to update property', 'error');
    }
};

// Delete property
window.deleteProperty = async (propertyId) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) return;

    showLoader('Deleting property...');

    try {
        await deleteDoc(doc(db, 'properties', propertyId));
        showToast('Property deleted successfully', 'success');
        loadMyProperties(auth.currentUser.uid);
    } catch (error) {
        console.error('Error deleting property:', error);
        showToast('Failed to delete property', 'error');
    } finally {
        hideLoader();
    }
};
