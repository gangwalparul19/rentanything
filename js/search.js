
import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';

import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';

let allListings = [];
let allBookings = [];
let allSocieties = new Set(); // Store unique locations
let calendarInstance;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

// Init
document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();
    initTheme();
    initAuth();
    initHeader();

    // Init Date Picker
    calendarInstance = flatpickr("#date-filter", {
        mode: "range",
        dateFormat: "Y-m-d",
        minDate: "today"
    });

    // Parse URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const queryTerm = urlParams.get('q') || '';
    const catTerm = urlParams.get('cat') || '';

    if (queryTerm) document.getElementById('search-input').value = queryTerm;

    // Checkboxes
    if (catTerm) {
        document.querySelectorAll(`#category-filters input[value="${catTerm}"]`).forEach(cb => cb.checked = true);
    }

    // Load Data
    await loadData();
    setupTypeAhead(); // Init autocomplete
    filterAndRender();
});

let verifiedUserIds = new Set();

// Helper: Toggle View
window.toggleMapView = () => {
    const grid = document.getElementById('results-grid');
    const map = document.getElementById('map-view');
    const btn = document.getElementById('map-toggle-btn');

    if (map.style.display === 'none') {
        map.style.display = 'block';
        grid.style.display = 'none';
        btn.innerHTML = '<i class="fa-solid fa-list"></i> List View';
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-outline');
        updateMapCounts();
    } else {
        map.style.display = 'none';
        grid.style.display = 'grid';
        btn.innerHTML = '<i class="fa-solid fa-map"></i> Tower Map';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    }
}

let activeTowerFilter = null;
window.filterByTower = (tower) => {
    activeTowerFilter = tower;
    alert(`Showing listings in Tower ${tower}`);

    // Switch back to grid visualization but filtered
    window.toggleMapView(); // Go back to list
    filterAndRender(); // Re-render with new filter

    // Update active filters UI
    const chips = document.getElementById('active-filters');
    chips.innerHTML += `<div class="filter-chip">Tower ${tower} <i class="fa-solid fa-times" onclick="activeTowerFilter=null; filterAndRender(); this.parentElement.remove();"></i></div>`;
}

function updateMapCounts() {
    // Count items per tower
    const counts = { A: 0, B: 0, C: 0 };
    // Filter against current active filters first (except tower)
    const currentList = getFilteredList();

    currentList.forEach(item => {
        if (item.tower) counts[item.tower]++;
    });

    document.getElementById('count-a').innerText = `(${counts.A} items)`;
    document.getElementById('count-b').innerText = `(${counts.B} items)`;
    document.getElementById('count-c').innerText = `(${counts.C} items)`;
}

// Extract strict filtering logic for reuse
function getFilteredList() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const minPrice = Number(document.getElementById('min-price').value) || 0;
    const maxPrice = Number(document.getElementById('max-price').value) || 100000;
    const isVerifiedOnly = document.getElementById('verified-only')?.checked || false;
    const selectedCats = Array.from(document.querySelectorAll('#category-filters input:checked')).map(cb => cb.value);
    const societyTerm = document.getElementById('society-filter').value.toLowerCase();

    return allListings.filter(item => {
        // 1. Text Search
        const textMatch = !term || (item.title?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term));
        if (!textMatch) return false;
        // 2. Category
        if (selectedCats.length > 0 && !selectedCats.includes(item.category)) return false;
        // 3. Price
        const price = item.rates?.daily || item.price || 0;
        if (price < minPrice || price > maxPrice) return false;
        // 4. Verified
        if (isVerifiedOnly && (!item.ownerId || !verifiedUserIds.has(item.ownerId))) return false;
        // 5. Society / Location
        if (societyTerm && !item.location?.toLowerCase().includes(societyTerm)) return false;

        return true;
    });
}

async function loadData() {
    try {
        // 1. Fetch Verified Users (Optimization: fetch only verified ones)
        const userQ = query(collection(db, "users"), where("isVerified", "==", true));
        const userSnap = await getDocs(userQ);
        userSnap.forEach(doc => verifiedUserIds.add(doc.id));

        // 2. Fetch Listings
        const listSnap = await getDocs(collection(db, "listings"));
        listSnap.forEach(doc => {
            const data = doc.data();
            // FILTER: Only show approved listings
            if (data.status === 'approved' || !data.status) {
                // SIMULATION: Assign random tower if missing
                const tower = data.tower || ['A', 'B', 'C'][Math.floor(Math.random() * 3)];
                allListings.push({ id: doc.id, tower, ...data });

                // Collect unique locations/societies
                if (data.location) allSocieties.add(data.location.trim());
            }
        });

        // 3. Fetch Active Bookings (for availability check)
        const bookQ = query(collection(db, "bookings"), where("status", "in", ["confirmed", "pending"]));
        const bookSnap = await getDocs(bookQ);
        bookSnap.forEach(doc => {
            const data = doc.data();
            if (data.startDate && data.endDate) { // Safety check
                allBookings.push({
                    listingId: data.listingId,
                    start: data.startDate.toDate(), // Firestore Timestamp to JS Date
                    end: data.endDate.toDate()
                });
            }
        });

    } catch (e) {
        console.error("Data Load Error:", e);
    }
}

// --- TYPE AHEAD LOGIC ---
function setupTypeAhead() {
    const input = document.getElementById('society-filter');
    const suggestionsBox = document.getElementById('society-suggestions');

    if (!input || !suggestionsBox) return;

    // Filter societies on input
    input.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';

        if (!val) {
            filterAndRender(); // Clear filter if empty
            return;
        }

        const matches = Array.from(allSocieties).filter(soc => soc.toLowerCase().includes(val));

        if (matches.length > 0) {
            suggestionsBox.style.display = 'block';
            matches.forEach(match => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = match;
                div.onclick = () => {
                    input.value = match;
                    suggestionsBox.style.display = 'none';
                    filterAndRender();
                };
                suggestionsBox.appendChild(div);
            });
        }
    });

    // Hide when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = 'none';
        }
    });

    // Also update filter on direct input change (if they don't click suggestion)
    input.addEventListener('change', filterAndRender);
}

window.applyFilters = () => {
    filterAndRender();
};

window.clearFilters = () => {
    document.getElementById('search-input').value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    calendarInstance.clear();
    document.querySelectorAll('#category-filters input').forEach(cb => cb.checked = false);
    document.querySelectorAll('#transaction-filters input').forEach(cb => cb.checked = false);
    if (document.getElementById('verified-only')) document.getElementById('verified-only').checked = false;
    currentPage = 1; // Reset page
    filterAndRender();
};


window.loadMore = () => {
    currentPage++;
    filterAndRender();
}

function filterAndRender() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const minPrice = Number(document.getElementById('min-price').value) || 0;
    const maxPrice = Number(document.getElementById('max-price').value) || 100000;
    const isVerifiedOnly = document.getElementById('verified-only')?.checked || false;

    // Categories
    const selectedCats = Array.from(document.querySelectorAll('#category-filters input:checked')).map(cb => cb.value);

    // Transaction Types
    const selectedTypes = Array.from(document.querySelectorAll('#transaction-filters input:checked')).map(cb => cb.value);

    // Dates
    const dates = calendarInstance.selectedDates;
    const dateStart = dates[0];
    const dateEnd = dates[1] || dates[0]; // If range not complete

    const results = allListings.filter(item => {
        // 1. Text Search
        const textMatch = !term || (item.title?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term));
        if (!textMatch) return false;

        // 2. Category
        if (selectedCats.length > 0 && !selectedCats.includes(item.category)) return false;

        // 3. Transaction Types (OR Logic)
        const itemTypes = item.transactionTypes || ['rent'];
        if (selectedTypes.length > 0) {
            const hasMatch = selectedTypes.some(type => itemTypes.includes(type));
            if (!hasMatch) return false;
        }

        // 4. Price (Adaptive)
        // If filtering by Price, we need to check if ANY of the item's available modes fall in range.
        // For simplicity: If "Donate" is selected/available, Price 0 is fine.
        // If "Sell" -> item.salePrice
        // If "Rent" -> item.rates.daily
        let effectivePrice = Infinity;

        if (itemTypes.includes('donate')) effectivePrice = 0;
        if (itemTypes.includes('rent') && item.rates?.daily) effectivePrice = Math.min(effectivePrice, item.rates.daily);
        if (itemTypes.includes('sell') && item.salePrice) effectivePrice = Math.min(effectivePrice, item.salePrice);

        // If no known price, default to item.price (legacy)
        if (effectivePrice === Infinity) effectivePrice = item.price || 0;

        if (effectivePrice < minPrice || effectivePrice > maxPrice) return false;


        // 5. Verified Only Check
        if (isVerifiedOnly) {
            if (!item.ownerId || !verifiedUserIds.has(item.ownerId)) return false;
        }

        // 6. Availability Check (Only relevant for Renting)
        // If user is searching specifically for "Buy" only, maybe skip date check?
        // Let's keep it simple: If dates are selected, we assume they want it available during that time (even for visiting to buy).
        if (dateStart) {
            // Check if ANY booking overlaps this range for this item
            const hasConflict = allBookings.some(b => {
                if (b.listingId !== item.id) return false;
                // Overlap formula: (StartA <= EndB) and (EndA >= StartB)
                return (dateStart <= b.end && dateEnd >= b.start);
            });
            if (hasConflict) return false;
        }

        return true;
    });

    const visibleResults = results.slice(0, currentPage * ITEMS_PER_PAGE);

    // Show/Hide Load More Button
    const loadMoreBtn = document.getElementById('pagination-container');
    if (loadMoreBtn) {
        if (results.length > visibleResults.length) {
            loadMoreBtn.style.display = 'block';
            const btn = document.getElementById('load-more-btn');
            if (btn) btn.onclick = window.loadMore;
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    renderGrid(visibleResults);
    updateChips(term, selectedCats, minPrice, maxPrice, dateStart);
}

function renderGrid(items) {
    const grid = document.getElementById('results-grid');
    if (items.length === 0) {
        grid.innerHTML = `<div class="no-results"><i class="fa-solid fa-magnifying-glass" style="font-size:3rem; margin-bottom:1rem;"></i><h3>No matches found</h3><p>Try adjusting your filters.</p></div>`;
        return;
    }

    grid.innerHTML = items.map(item => {
        const types = item.transactionTypes || ['rent'];

        // Dynamic Badge
        let badge = '';
        if (types.includes('donate')) badge = '<span style="position:absolute; top:10px; left:10px; background:#e11d48; color:white; padding:4px 10px; border-radius:6px; font-size:0.7rem; font-weight:700;">FREE</span>';
        else if (types.includes('sell') && !types.includes('rent')) badge = '<span style="position:absolute; top:10px; left:10px; background:#16a34a; color:white; padding:4px 10px; border-radius:6px; font-size:0.7rem; font-weight:700;">KEEP</span>';
        else if (types.includes('rent')) badge = '<span style="position:absolute; top:10px; left:10px; background:#0284c7; color:white; padding:4px 10px; border-radius:6px; font-size:0.7rem; font-weight:700;">RENT</span>';

        // Dynamic Price
        let priceDisplay = '';
        if (types.includes('rent')) {
            const daily = item.rates?.daily || item.price || 0;
            priceDisplay = `₹${daily} <span style="font-size:0.8rem; color:var(--gray); font-weight:400;">/day</span>`;
        } else if (types.includes('sell')) {
            priceDisplay = `₹${item.salePrice} <span style="font-size:0.8rem; color:var(--gray); font-weight:400;">to buy</span>`;
        } else if (types.includes('donate')) {
            priceDisplay = `<span style="color: #e11d48;">Free</span>`;
        }

        return `
        <a href="/product.html?id=${item.id}" class="listing-card" style="text-decoration:none; color:inherit; display:block;">
            <div class="card-image" style="height:200px; width:100%; overflow:hidden; position:relative;">
                <img src="${item.image || 'https://placehold.co/400'}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
                ${badge}
                ${item.rating ? `<span class="rating-badge" style="position:absolute; top:10px; right:10px; background:white; padding: 2px 8px; border-radius:10px; font-size:0.8rem; font-weight:600;">⭐ ${item.rating}</span>` : ''}
            </div>
            <div class="card-content" style="padding:1rem;">
                <h3 style="font-size:1.1rem; margin-bottom:0.5rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</h3>
                <div style="color:var(--gray); font-size:0.9rem; margin-bottom:0.5rem;"><i class="fa-solid fa-location-dot"></i> ${item.location}</div>
                <div style="font-weight:700; font-size:1.2rem; color:var(--primary);">${priceDisplay}</div>
            </div>
            <div class="listing-footer" style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 1rem 1rem;">
                 <span style="font-size: 0.8rem; color: var(--gray);">${types.length > 1 ? types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' • ') : types[0].charAt(0).toUpperCase() + types[0].slice(1)}</span>
                <div style="display:flex; align-items:center;">
                    <button class="btn-icon" onclick="event.preventDefault(); toggleSaved(this)" style="background:none; border:none; cursor:pointer; font-size:1.2rem; color:var(--gray);">
                        <i class="fa-regular fa-bookmark"></i>
                    </button>
                    ${item.userPhoto ? `<img src="${item.userPhoto}" referrerpolicy="no-referrer" style="width:30px; height:30px; border-radius:50%; margin-left:0.5rem;">` : ''}
                </div>
            </div>
        </a>
    `}).join('');
}

function updateChips(term, cats, min, max, date) {
    // Optional: Render chips logic
}
