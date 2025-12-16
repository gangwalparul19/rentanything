/**
 * My Properties - Dashboard for managing property listings
 */

import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { initHeader } from './header-manager.js';
import { showToast } from './toast.js';
import { showLoader, hideLoader } from './loader.js';

document.addEventListener('DOMContentLoaded', () => {
    initHeader();

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
                        <span style="padding: 0.5rem 1rem; border-radius: 0.5rem; text-align: center; font-size: 0.85rem; font-weight: 600; ${property.status === 'available' ? 'background: #dcfce7; color: #15803d;' : 'background: #fee2e2; color: #991b1b;'}">
                            ${property.status === 'available' ? '✓ Available' : '✗ Rented'}
                        </span>
                        
                        <a href="/property-details.html?id=${property.id}" class="btn btn-outline" style="text-align: center;">
                            <i class="fa-solid fa-eye"></i> View
                        </a>
                        
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
