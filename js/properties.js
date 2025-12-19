/**
 * Properties Browse Page
 */

import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { initHeader } from './header-manager.js';
import { showLoader, hideLoader } from './loader.js';

// Pagination variables
let currentPage = 1;
const ITEMS_PER_PAGE = 8;
let allFilteredProperties = [];

document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    loadSocieties(); // Load society dropdown
    loadProperties();
});

/**
 * Load Societies dropdown from Firestore
 */
async function loadSocieties() {
    try {
        const q = query(collection(db, "societies"), where("isActive", "!=", false));
        const querySnapshot = await getDocs(q);
        const approvedSocieties = [];
        querySnapshot.forEach((doc) => {
            approvedSocieties.push(doc.data().name);
        });

        const societySelect = document.getElementById('search-society');

        approvedSocieties.sort().forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            societySelect.appendChild(opt);
        });

    } catch (error) {
        console.error("Error loading societies:", error);
    }
}

async function loadProperties(filters = {}) {
    showLoader('Loading properties...');

    try {
        let q = query(
            collection(db, 'properties'),
            where('status', '==', 'available'),
            orderBy('createdAt', 'desc'),
            limit(50) // Increased limit for pagination
        );

        const querySnapshot = await getDocs(q);
        const properties = [];
        querySnapshot.forEach((doc) => {
            properties.push({ id: doc.id, ...doc.data() });
        });

        // Apply client-side filtering
        let filteredProperties = properties;

        if (filters.society) {
            filteredProperties = filteredProperties.filter(p =>
                p.address.building?.toLowerCase().includes(filters.society.toLowerCase()) ||
                p.address.society?.toLowerCase().includes(filters.society.toLowerCase())
            );
        }

        if (filters.bedrooms) {
            filteredProperties = filteredProperties.filter(p =>
                p.bedrooms >= parseInt(filters.bedrooms)
            );
        }

        if (filters.type) {
            filteredProperties = filteredProperties.filter(p =>
                p.type === filters.type
            );
        }

        // Store filtered results and reset to page 1
        allFilteredProperties = filteredProperties;
        currentPage = 1;

        renderPaginatedProperties();

    } catch (error) {
        console.error('Error loading properties:', error);
    } finally {
        hideLoader();
    }
}

function renderPaginatedProperties() {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedProperties = allFilteredProperties.slice(startIndex, endIndex);

    renderProperties(paginatedProperties);
    updatePaginationUI();
}

function updatePaginationUI() {
    const totalPages = Math.ceil(allFilteredProperties.length / ITEMS_PER_PAGE);
    const paginationContainer = document.getElementById('pagination-container');

    if (!paginationContainer || allFilteredProperties.length === 0) {
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = `
        <button 
            class="btn btn-outline" 
            onclick="goToPreviousPage()" 
            ${currentPage === 1 ? 'disabled' : ''}
            style="${currentPage === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
            <i class="fa-solid fa-chevron-left"></i> Previous
        </button>
        
        <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 500;">
            <span>Page ${currentPage} of ${totalPages}</span>
            <span style="color: var(--gray); font-size: 0.9rem;">(${allFilteredProperties.length} properties)</span>
        </div>
        
        <button 
            class="btn btn-outline" 
            onclick="goToNextPage()" 
            ${currentPage === totalPages ? 'disabled' : ''}
            style="${currentPage === totalPages ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
            Next <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;
}

window.goToPreviousPage = () => {
    if (currentPage > 1) {
        currentPage--;
        renderPaginatedProperties();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

window.goToNextPage = () => {
    const totalPages = Math.ceil(allFilteredProperties.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderPaginatedProperties();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderProperties(properties) {
    const grid = document.getElementById('properties-grid');

    if (properties.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
                <i class="fa-solid fa-building" style="font-size: 4rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
                <h3>No properties found</h3>
                <p style="color: #6b7280;">Try adjusting your filters</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = properties.map(property => `
        <a href="/property-details.html?id=${property.id}" style="text-decoration: none; color: inherit;">
            <div style="background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;" 
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';">
                
                <div style="position: relative;">
                    <img src="${property.mainImage}" alt="${property.title}" 
                         style="width: 100%; height: 220px; object-fit: cover;">
                    <div style="position: absolute; top: 1rem; right: 1rem; background: rgba(0,0,0,0.7); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600;">
                        ₹${property.monthlyRent.toLocaleString()}/mo
                    </div>
                </div>
                
                <div style="padding: 1.25rem;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 600;">${property.title}</h3>
                    <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem;">
                        <i class="fa-solid fa-location-dot"></i> ${property.address.area}, ${property.address.city}
                    </p>
                    
                    <div style="display: flex; gap: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.9rem;">
                        <span><i class="fa-solid fa-bed"></i> ${property.bedrooms} Bed</span>
                        <span><i class="fa-solid fa-bath"></i> ${property.bathrooms} Bath</span>
                        <span><i class="fa-solid fa-ruler-combined"></i> ${property.squareFeet} sqft</span>
                    </div>
                </div>
            </div>
        </a>
    `).join('');
}

window.applyFilters = () => {
    const filters = {
        society: document.getElementById('search-society').value,
        bedrooms: document.getElementById('filter-bedrooms').value,
        type: document.getElementById('filter-type').value
    };

    loadProperties(filters);
};
