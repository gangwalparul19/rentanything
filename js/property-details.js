/**
 * Property Details Page
 */

import { db, auth } from './firebase-config.js';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { initHeader } from './header-manager.js';
import { showToast } from './toast.js';
import { showLoader, hideLoader } from './loader.js';

// Get property ID from URL
const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    initHeader();

    if (!propertyId) {
        document.getElementById('property-container').innerHTML = `
            <div style="text-align: center; padding: 4rem;">
                <h2>Property not found</h2>
                <a href="/properties.html" class="btn btn-primary">Browse Properties</a>
            </div>
        `;
        return;
    }

    loadPropertyDetails();
});

async function loadPropertyDetails() {
    showLoader('Loading property details...');

    try {
        const propertyRef = doc(db, 'properties', propertyId);
        const propertySnap = await getDoc(propertyRef);

        if (!propertySnap.exists()) {
            throw new Error('Property not found');
        }

        const property = { id: propertySnap.id, ...propertySnap.data() };

        // Increment view count
        await updateDoc(propertyRef, { views: increment(1) });

        renderPropertyDetails(property);

    } catch (error) {
        console.error('Error loading property:', error);
        document.getElementById('property-container').innerHTML = `
            <div style="text-align: center; padding: 4rem;">
                <h2>Property not found</h2>
                <p>This property may have been removed or is no longer available.</p>
                <a href="/properties.html" class="btn btn-primary">Browse Properties</a>
            </div>
        `;
    } finally {
        hideLoader();
    }
}

function renderPropertyDetails(property) {
    const container = document.getElementById('property-container');

    const amenitiesIcons = {
        parking: '🅿️', gym: '🏋️', wifi: '📶', ac: '❄️',
        powerBackup: '🔋', lift: '🛗', security: '🔒',
        swimmingPool: '🏊', garden: '🌳', clubhouse: '🏛️'
    };

    container.innerHTML = `
        <!-- Image Gallery -->
        <div style="margin-bottom: 2rem;">
            <img src="${property.mainImage}" alt="${property.title}" 
                 style="width: 100%; height: 400px; object-fit: cover; border-radius: 1rem;">
            ${property.images.length > 1 ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem; margin-top: 0.5rem;">
                    ${property.images.slice(1).map(img => `
                        <img src="${img}" style="height: 100px; object-fit: cover; border-radius: 0.5rem; cursor: pointer;">
                    `).join('')}
                </div>
            ` : ''}
        </div>
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
            <!-- Main Content -->
            <div>
                <h1 style="font-size: 2rem; margin-bottom: 0.5rem;">${property.title}</h1>
                <p style="color: #6b7280; margin-bottom: 1rem;">
                    <i class="fa-solid fa-location-dot"></i> 
                    ${property.address.area}, ${property.address.city}
                </p>
                
                <!-- Property Stats -->
                <div style="display: flex; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap;">
                    <div>
                        <div style="font-size: 0.9rem; color: #6b7280;">Bedrooms</div>
                        <div style="font-weight: 600; font-size: 1.1rem;">🛏️ ${property.bedrooms}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; color: #6b7280;">Bathrooms</div>
                        <div style="font-weight: 600; font-size: 1.1rem;">🚿 ${property.bathrooms}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; color: #6b7280;">Area</div>
                        <div style="font-weight: 600; font-size: 1.1rem;">📏 ${property.squareFeet} sqft</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; color: #6b7280;">Furnishing</div>
                        <div style="font-weight: 600; font-size: 1.1rem; text-transform: capitalize;">🪑 ${property.furnishing.replace('-', ' ')}</div>
                    </div>
                </div>
                
                <!-- Description -->
                <div style="background: white; padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Description</h3>
                    <p style="white-space: pre-wrap; line-height: 1.6;">${property.description}</p>
                </div>
                
                <!-- Amenities -->
                <div style="background: white; padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Amenities</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
                        ${property.amenities.map(amenity => `
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="font-size: 1.2rem;">${amenitiesIcons[amenity] || '✓'}</span>
                                <span style="text-transform: capitalize;">${amenity.replace(/([A-Z])/g, ' $1').trim()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Location -->
                <div style="background: white; padding: 1.5rem; border-radius: 1rem;">
                    <h3 style="margin-bottom: 1rem;">Location</h3>
                    <p style="line-height: 1.8;">
                        ${property.address.building ? `${property.address.building}<br>` : ''}
                        ${property.address.street}<br>
                        ${property.address.area}, ${property.address.city}<br>
                        ${property.address.state} - ${property.address.pincode}
                    </p>
                </div>
            </div>
            
            <!-- Sidebar -->
            <div>
                <!-- Pricing Card -->
                <div style="background: white; padding: 1.5rem; border-radius: 1rem; margin-bottom: 1.5rem; position: sticky; top: 1rem;">
                    <div style="margin-bottom: 1.5rem;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">
                            ₹${property.monthlyRent.toLocaleString()}
                            <span style="font-size: 0.9rem; font-weight: 400; color: #6b7280;">/month</span>
                        </div>
                        ${property.maintenanceCharges > 0 ? `
                            <div style="font-size: 0.9rem; color: #6b7280; margin-top: 0.5rem;">
                                + ₹${property.maintenanceCharges.toLocaleString()} maintenance
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="background: #f0f9ff; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                        <div style="font-weight: 600; color: #0c4a6e; margin-bottom: 0.5rem;">Security Deposit</div>
                        <div style="font-size: 1.3rem; font-weight: 700; color: #0369a1;">₹${property.securityDeposit.toLocaleString()}</div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem; padding: 0.75rem; background: #f0fdf4; border-radius: 0.5rem;">
                        <div style="font-size: 0.9rem; color: #15803d;">
                            <i class="fa-solid fa-calendar"></i> Available from: 
                            <strong>${new Date(property.availableFrom.seconds * 1000).toLocaleDateString()}</strong>
                        </div>
                    </div>
                    
                    <button onclick="contactOwner('${property.id}')" class="btn btn-primary" style="width: 100%; margin-bottom: 0.75rem;">
                        <i class="fa-solid fa-phone"></i> Contact Owner
                    </button>
                    
                    <button onclick="scheduleVisit('${property.id}')" class="btn btn-outline" style="width: 100%;">
                        <i class="fa-solid fa-calendar-check"></i> Schedule Visit
                    </button>
                    
                    <!-- Owner Info -->
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">Listed by</div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center;">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600;">${property.ownerName}</div>
                                <div style="font-size: 0.85rem; color: #6b7280;">Property Owner</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Contact owner - Open chat
window.contactOwner = async (propertyId) => {
    if (!auth.currentUser) {
        showToast('Please log in to contact owner', 'warning');
        setTimeout(() => window.location.href = '/?login=true', 1500);
        return;
    }

    try {
        // Get property details to get owner ID
        const propertyRef = doc(db, 'properties', propertyId);
        const propertySnap = await getDoc(propertyRef);

        if (propertySnap.exists()) {
            const property = propertySnap.data();
            // Redirect to chat with owner
            window.location.href = `/chat.html?ownerId=${property.ownerId}&propertyId=${propertyId}`;
        }
    } catch (error) {
        console.error('Error opening chat:', error);
        showToast('Failed to open chat', 'error');
    }
};

// Schedule visit - Create inquiry
window.scheduleVisit = async (propertyId) => {
    if (!auth.currentUser) {
        showToast('Please log in to schedule visit', 'warning');
        setTimeout(() => window.location.href = '/?login=true', 1500);
        return;
    }

    try {
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

        await addDoc(collection(db, 'property_inquiries'), {
            propertyId: propertyId,
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || 'User',
            userPhone: auth.currentUser.phoneNumber || '',
            message: 'Interested in scheduling a visit',
            status: 'pending',
            createdAt: serverTimestamp()
        });

        showToast('Visit request sent! Owner will contact you soon.', 'success');
    } catch (error) {
        console.error('Error scheduling visit:', error);
        showToast('Failed to send request', 'error');
    }
};
