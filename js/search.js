
import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { showToast } from './toast-enhanced.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { initFooter } from './footer-manager.js';
import { debounce } from './utils';
import { showEmptyState } from './empty-states.js';
import { useSearchStore } from './search-store.js';
import { showSkeletonLoader } from './skeleton-loader';

let allListings = [];
let allBookings = [];
let allSocieties = new Set();
let calendarInstance;

// Pagination variables
let currentPage = 1;
const ITEMS_PER_PAGE = 8;
let filteredResults = [];

// Init
document.addEventListener('DOMContentLoaded', async () => {
    initHeader();
    initMobileMenu();
    initAuth();
    initTheme();
    initFooter();

    // Init Date Picker
    calendarInstance = flatpickr("#date-filter", {
        mode: "range",
        dateFormat: "Y-m-d",
        minDate: "today",
        onChange: (selectedDates) => {
            // Update Store
        }
    });

    // Parse URL Params & Init Store
    const urlParams = new URLSearchParams(window.location.search);
    const queryTerm = urlParams.get('q') || '';
    const catTerm = urlParams.get('cat');

    const store = useSearchStore;
    if (queryTerm) {
        store.getState().setSearchTerm(queryTerm);
        document.getElementById('search-input').value = queryTerm;
    }
    if (catTerm) {
        store.getState().toggleCategory(catTerm);
        // Sync UI
        document.querySelectorAll(`#category-filters input[value="${catTerm}"]`).forEach(cb => cb.checked = true);
    }

    // Subscribe to Store Changes -> Trigger Render
    store.subscribe((state, prevState) => {
        // Only re-filter if relevant state changed
        if (
            state.searchTerm !== prevState?.searchTerm ||
            state.activeCategories !== prevState?.activeCategories ||
            state.priceRange !== prevState?.priceRange
        ) {
            filterAndRender();
        }
    });

    // Load Data
    await loadData();
    setupTypeAhead(); // Init autocomplete
    filterAndRender();

    // Bind Inputs to Actions

    // Search Input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => store.getState().setSearchTerm(e.target.value));
    }

    // Price Inputs
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');

    const updatePrice = () => {
        const min = Number(minPriceInput.value) || 0;
        const max = Number(maxPriceInput.value) || 100000;
        store.getState().setPriceRange(min, max);
    };

    if (minPriceInput) minPriceInput.addEventListener('input', debounce(updatePrice, 300));
    if (maxPriceInput) maxPriceInput.addEventListener('input', debounce(updatePrice, 300));

    // Category Checkboxes
    document.querySelectorAll('#category-filters input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            // If radio behavior desired, reset others? No, support multi-select or single?
            // Current store logic supports multi-select toggling.
            // But UI might be radio? Check HTML?
            // Assuming checkboxes for now based on 'toggleCategory'.
            store.getState().toggleCategory(e.target.value);
        });
    });

    // Verified Checkbox (Not in store yet, keep local or add?)
    // Let's add to store later if needed, or keep reading DOM for now for simplicity?
    // Plan said "Move filters to store".
});

let verifiedUserIds = new Set();

// Extract strict filtering logic via Store
function getFilteredList() {
    const state = useSearchStore.getState();
    const term = state.searchTerm.toLowerCase();
    const { min: minPrice, max: maxPrice } = state.priceRange;
    const selectedCats = state.activeCategories;

    // Legacy DOM read for things not in store yet
    const isVerifiedOnly = document.getElementById('verified-only')?.checked || false;
    const societyTerm = document.getElementById('society-filter')?.value.toLowerCase() || '';

    return allListings.filter(item => {
        // 1. Text Search
        const textMatch = !term || (item.title?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term));
        if (!textMatch) return false;

        // 2. Category (Handle 'all')
        if (!selectedCats.includes('all')) {
            if (!selectedCats.includes(item.category)) return false;
        }

        // 3. Price
        const price = item.rates?.daily || item.price || 0;
        if (price < minPrice || price > maxPrice) return false;

        // 4. Verified
        if (isVerifiedOnly && (!item.ownerId || !verifiedUserIds.has(item.ownerId))) return false;

        // 5. Society
        if (societyTerm && !item.location?.toLowerCase().includes(societyTerm)) return false;

        return true;
    });
}


// showLoader(); // Replaced with Skeleton
showSkeletonLoader('#listings-grid', 8);

try {
    // Run independent queries in parallel for faster loading
    const [userSnap, activeListingSnap, approvedListingSnap, bookSnap] = await Promise.all([
        // 1. Fetch Verified Users
        getDocs(query(collection(db, "users"), where("isVerified", "==", true))),

        // 2a. Fetch Active Listings (server-side filter)
        getDocs(query(
            collection(db, "listings"),
            where("status", "==", "active")
        )),

        // 2b. Fetch Approved Listings (server-side filter)
        getDocs(query(
            collection(db, "listings"),
            where("status", "==", "approved")
        )),

        // 3. Fetch Active Bookings (for availability check)
        getDocs(query(collection(db, "bookings"), where("status", "in", ["confirmed", "pending"])))
    ]);

    // Process verified users
    userSnap.forEach(doc => verifiedUserIds.add(doc.id));

    // Process listings (combine both active and approved)
    const processListing = (doc) => {
        const data = doc.data();
        const tower = data.tower || ['A', 'B', 'C'][Math.floor(Math.random() * 3)];
        allListings.push({ id: doc.id, tower, ...data });
        if (data.location) allSocieties.add(data.location.trim());
    };

    activeListingSnap.forEach(processListing);
    approvedListingSnap.forEach(processListing);

    // Process bookings
    bookSnap.forEach(doc => {
        const data = doc.data();
        if (data.startDate && data.endDate) {
            allBookings.push({
                listingId: data.listingId,
                start: data.startDate.toDate(),
                end: data.endDate.toDate()
            });
        }
    });

} catch (e) {
    console.error("Data Load Error:", e);
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


// Pagination Functions
window.loadMore = () => {
    currentPage++;
    renderPaginatedResults();
}

window.goToPreviousPage = () => {
    if (currentPage > 1) {
        currentPage--;
        renderPaginatedResults();
        window.scrollToTop();
    }
}

window.goToNextPage = () => {
    const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderPaginatedResults();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderPaginatedResults() {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = filteredResults.slice(startIndex, endIndex);

    renderGrid(paginatedItems);
    updatePaginationUI();
}

function updatePaginationUI() {
    const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
    const paginationContainer = document.getElementById('pagination-container');

    if (!paginationContainer || filteredResults.length === 0) {
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
            <span style="color: var(--gray); font-size: 0.9rem;">(${filteredResults.length} items)</span>
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

    // Store filtered results and reset to page 1
    filteredResults = results;
    currentPage = 1;

    // Render paginated results
    renderPaginatedResults();
    updateChips(term, selectedCats, minPrice, maxPrice, dateStart);
}

function renderGrid(items) {
    const grid = document.getElementById('results-grid');
    if (items.length === 0) {
        showEmptyState(grid, 'search');
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
            <div class="card-image" style="height:200px; width:100%; overflow:hidden; position:relative; background:#f1f5f9;">
                <!-- Skeleton loader background -->
                <div class="image-skeleton" style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.5s infinite;"></div>
                <img src="${item.image || 'https://placehold.co/400'}" loading="lazy" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;" onload="this.previousElementSibling.style.display='none';">
                ${badge}
                ${item.rating ? `<span class="rating-badge" style="position:absolute; top:10px; right:10px; background:white; padding: 2px 8px; border-radius:10px; font-size:0.8rem; font-weight:600; z-index:2;">⭐ ${item.rating}</span>` : ''}
            </div>
            <div class="card-content" style="padding:1rem;">
                <h3 style="font-size:1.1rem; margin-bottom:0.5rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</h3>
                <div style="color:var(--gray); font-size:0.9rem; margin-bottom:0.5rem;"><i class="fa-solid fa-location-dot"></i> ${item.location}</div>
                <div style="font-weight:700; font-size:1.2rem; color:var(--primary);">${priceDisplay}</div>
            </div>
            <div class="listing-footer" style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 1rem 1rem;">
                 <span style="font-size: 0.8rem; color: var(--gray);">${types.length > 1 ? types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' • ') : types[0].charAt(0).toUpperCase() + types[0].slice(1)}</span>
                <div style="display:flex; align-items:center;">
                    <button class="btn-icon" onclick="event.preventDefault(); event.stopPropagation(); toggleSaved(this, event)" style="background:none; border:none; cursor:pointer; font-size:1.2rem; color:var(--gray);">
                        <i class="fa-regular fa-bookmark"></i>
                    </button>
                    ${item.userPhoto ? `<img src="${item.userPhoto}" referrerpolicy="no-referrer" style="width:30px; height:30px; border-radius:50%; margin-left:0.5rem;">` : ''}
                </div>
            </div>
        </a>
    `}).join('');

    // Add shimmer animation to document if not already added
    if (!document.getElementById('shimmer-keyframes')) {
        const style = document.createElement('style');
        style.id = 'shimmer-keyframes';
        style.textContent = `
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

window.toggleSaved = async (btn, event) => {
    event?.preventDefault();
    event?.stopPropagation();

    const user = auth.currentUser;
    if (!user) {
        showToast("Login to save items", "info");
        return;
    }

    const card = btn.closest('.listing-card');
    const listingId = card.href.split('=')[1];
    const icon = btn.querySelector('i');
    const wasSaved = icon.classList.contains('fa-solid');

    // 1. Optimistic UI Update: Toggle immediately
    if (wasSaved) {
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
        icon.style.color = 'var(--gray)';
    } else {
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
        icon.style.color = '#ef4444';

        // Add subtle animation
        icon.style.transform = 'scale(1.2)';
        setTimeout(() => icon.style.transform = 'scale(1)', 200);
    }

    try {
        // Import dynamically to avoid circular deps
        const { doc, getDoc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');

        const favRef = doc(db, "favorites", `${user.uid}_${listingId}`);
        const docSnap = await getDoc(favRef);

        if (docSnap.exists()) {
            // Already exists in DB
            if (!wasSaved) {
                // Logic mismatch: UI thought it wasn't saved, but DB said it was.
                // We toggled ON (saved), so now we want to keep it saved?
                // Current logic: toggle. If DB has it, delete it.
            }
            // Remove from favorites
            await deleteDoc(favRef);
            showToast("Removed from saved", "info");
        } else {
            // Add to favorites
            await setDoc(favRef, {
                userId: user.uid,
                listingId: listingId,
                createdAt: serverTimestamp()
            });
            showToast("Saved! ❤️", "success");
        }
    } catch (error) {
        console.error("Error toggling favorite:", error);

        // 2. Rollback UI on error
        if (wasSaved) {
            // We tried to remove, but failed. Re-add solid.
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid');
            icon.style.color = '#ef4444';
        } else {
            // We tried to add, but failed. Re-add regular.
            icon.classList.remove('fa-solid');
            icon.classList.add('fa-regular');
            icon.style.color = 'var(--gray)';
        }

        showToast("Failed to save", "error");
    }
};

function updateChips(term, cats, min, max, date) {
    const chipsContainer = document.getElementById('active-filters');
    if (!chipsContainer) return;

    let chips = [];

    // Search term chip
    if (term) {
        chips.push(`
            <div class="filter-chip">
                Search: "${term}" 
                <i class="fa-solid fa-times" onclick="document.getElementById('search-input').value=''; filterAndRender();" style="cursor:pointer;"></i>
            </div>
        `);
    }

    // Category chips
    cats.forEach(cat => {
        chips.push(`
            <div class="filter-chip">
                ${cat.charAt(0).toUpperCase() + cat.slice(1)} 
                <i class="fa-solid fa-times" onclick="document.querySelector('#category-filters input[value=&quot;${cat}&quot;]').checked=false; filterAndRender();" style="cursor:pointer;"></i>
            </div>
        `);
    });

    // Price range chip
    if (min > 0 || max < 100000) {
        chips.push(`
            <div class="filter-chip">
                ₹${min} - ₹${max} 
                <i class="fa-solid fa-times" onclick="document.getElementById('min-price').value=''; document.getElementById('max-price').value=''; filterAndRender();" style="cursor:pointer;"></i>
            </div>
        `);
    }

    // Date range chip
    if (date) {
        const dates = calendarInstance.selectedDates;
        const dateStr = dates.length > 1
            ? `${dates[0].toLocaleDateString()} - ${dates[1].toLocaleDateString()}`
            : dates[0].toLocaleDateString();
        chips.push(`
            <div class="filter-chip">
                ${dateStr} 
                <i class="fa-solid fa-times" onclick="calendarInstance.clear(); filterAndRender();" style="cursor:pointer;"></i>
            </div>
        `);
    }

    // Verified only chip
    const verifiedCheckbox = document.getElementById('verified-only');
    if (verifiedCheckbox?.checked) {
        chips.push(`
            <div class="filter-chip">
                Verified Only 
                <i class="fa-solid fa-times" onclick="document.getElementById('verified-only').checked=false; filterAndRender();" style="cursor:pointer;"></i>
            </div>
        `);
    }

    // Transaction type chips
    const selectedTypes = Array.from(document.querySelectorAll('#transaction-filters input:checked'));
    selectedTypes.forEach(cb => {
        const type = cb.value;
        chips.push(`
            <div class="filter-chip">
                ${type.charAt(0).toUpperCase() + type.slice(1)} 
                <i class="fa-solid fa-times" onclick="document.querySelector('#transaction-filters input[value=&quot;${type}&quot;]').checked=false; filterAndRender();" style="cursor:pointer;"></i>
            </div>
        `);
    });

    // Render chips or show nothing
    chipsContainer.innerHTML = chips.join('');
}
