/**
 * Saved Filters Component
 * Allow users to save and quickly apply filter combinations
 */
import { showToast } from './toast-enhanced.js';

class SavedFilters {
    constructor(options = {}) {
        this.options = {
            storageKey: 'savedFilters',
            maxSaved: 10,
            containerselId: 'saved-filters-container',
            ...options
        };

        this.filters = this.loadFilters();
        this.init();
    }

    init() {
        this.createUI();
        this.renderSavedFilters();
    }

    createUI() {
        // Find or create container
        let container = document.getElementById(this.options.containerId);

        if (!container) {
            container = document.createElement('div');
            container.id = this.options.containerId;
            container.className = 'saved-filters-section';

            // Insert before search filters
            const filtersSection = document.querySelector('.filters-sidebar') ||
                document.querySelector('.search-filters');
            if (filtersSection) {
                filtersSection.insertBefore(container, filtersSection.firstChild);
            }
        }

        this.container = container;
    }

    renderSavedFilters() {
        if (this.filters.length === 0) {
            this.container.innerHTML = '';
            return;
        }

        let html = `
            <div class="saved-filters-header">
                <h4><i class="fa-solid fa-bookmark"></i> Saved Filters</h4>
            </div>
            <div class="saved-filters-list">
        `;

        this.filters.forEach((filter, index) => {
            html += `
                <div class="saved-filter-item">
                    <button class="saved-filter-btn" data-index="${index}">
                        <span class="filter-name">${filter.name}</span>
                        <span class="filter-count">${this.getFilterCount(filter)}</span>
                    </button>
                    <button class="delete-filter-btn" data-index="${index}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        });

        html += '</div>';

        this.container.innerHTML = html;
        this.attachListeners();
    }

    attachListeners() {
        // Apply saved filter
        this.container.querySelectorAll('.saved-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.applyFilter(this.filters[index]);
            });
        });

        // Delete saved filter
        this.container.querySelectorAll('.delete-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.deleteFilter(index);
            });
        });
    }

    /**
     * Save current filters with a name
     */
    saveCurrentFilters(name) {
        const currentFilters = this.getCurrentFilters();

        if (!currentFilters || Object.keys(currentFilters).length === 0) {
            showToast('No filters applied to save', 'warning');
            return false;
        }

        // Check if name already exists
        const existingIndex = this.filters.findIndex(f => f.name === name);

        if (existingIndex >= 0) {
            // Update existing
            this.filters[existingIndex] = { name, filters: currentFilters, date: new Date().toISOString() };
        } else {
            // Add new
            this.filters.push({ name, filters: currentFilters, date: new Date().toISOString() });

            // Limit to max
            if (this.filters.length > this.options.maxSaved) {
                this.filters.shift();
            }
        }

        this.persist();
        this.renderSavedFilters();
        return true;
    }

    /**
     * Get currently applied filters
     */
    getCurrentFilters() {
        const filters = {};

        // Search term
        const searchInput = document.getElementById('search-input');
        if (searchInput?.value) {
            filters.search = searchInput.value;
        }

        // Category checkboxes
        const selectedCategories = Array.from(
            document.querySelectorAll('#category-filters input:checked')
        ).map(cb => cb.value);
        if (selectedCategories.length > 0) {
            filters.categories = selectedCategories;
        }

        // Transaction types
        const selectedTypes = Array.from(
            document.querySelectorAll('#transaction-filters input:checked')
        ).map(cb => cb.value);
        if (selectedTypes.length > 0) {
            filters.types = selectedTypes;
        }

        // Price range
        const minPrice = document.getElementById('min-price')?.value;
        const maxPrice = document.getElementById('max-price')?.value;
        if (minPrice || maxPrice) {
            filters.priceRange = { min: minPrice || 0, max: maxPrice || 100000 };
        }

        // Verified only
        const verifiedOnly = document.getElementById('verified-only')?.checked;
        if (verifiedOnly) {
            filters.verifiedOnly = true;
        }

        return filters;
    }

    /**
     * Apply a saved filter
     */
    applyFilter(savedFilter) {
        const { filters } = savedFilter;

        // Search term
        if (filters.search) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = filters.search;
        }

        // Categories
        if (filters.categories) {
            document.querySelectorAll('#category-filters input').forEach(cb => {
                cb.checked = filters.categories.includes(cb.value);
            });
        }

        // Transaction types
        if (filters.types) {
            document.querySelectorAll('#transaction-filters input').forEach(cb => {
                cb.checked = filters.types.includes(cb.value);
            });
        }

        // Price range
        if (filters.priceRange) {
            const minPrice = document.getElementById('min-price');
            const maxPrice = document.getElementById('max-price');
            if (minPrice) minPrice.value = filters.priceRange.min;
            if (maxPrice) maxPrice.value = filters.priceRange.max;
        }

        // Verified only
        if (filters.verifiedOnly) {
            const verifiedCheckbox = document.getElementById('verified-only');
            if (verifiedCheckbox) verifiedCheckbox.checked = true;
        }

        // Trigger search
        if (typeof window.filterAndRender === 'function') {
            window.filterAndRender();
        }
    }

    deleteFilter(index) {
        if (confirm('Delete this saved filter?')) {
            this.filters.splice(index, 1);
            this.persist();
            this.renderSavedFilters();
        }
    }

    getFilterCount(filter) {
        let count = 0;
        if (filter.filters.search) count++;
        if (filter.filters.categories) count += filter.filters.categories.length;
        if (filter.filters.types) count += filter.filters.types.length;
        if (filter.filters.priceRange) count++;
        if (filter.filters.verifiedOnly) count++;
        return count;
    }

    loadFilters() {
        try {
            return JSON.parse(localStorage.getItem(this.options.storageKey) || '[]');
        } catch {
            return [];
        }
    }

    persist() {
        localStorage.setItem(this.options.storageKey, JSON.stringify(this.filters));
    }

    /**
     * Show save dialog
     */
    showSaveDialog() {
        const name = prompt('Enter a name for this filter combination:');
        if (name) {
            this.saveCurrentFilters(name.trim());
        }
    }
}

// Create save filter button
function addSaveFilterButton() {
    const filtersSection = document.querySelector('.filters-sidebar') ||
        document.querySelector('.search-filters');
    if (!filtersSection) return;

    if (!document.getElementById('save-filter-btn')) {
        const btn = document.createElement('button');
        btn.id = 'save-filter-btn';
        btn.className = 'btn btn-outline save-filter-btn';
        btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Save Current Filters';
        btn.style.width = '100%';
        btn.style.marginTop = '1rem';

        btn.addEventListener('click', () => {
            if (window.savedFiltersInstance) {
                window.savedFiltersInstance.showSaveDialog();
            }
        });

        filtersSection.appendChild(btn);
    }
}

// Export
window.SavedFilters = SavedFilters;
export { SavedFilters };

// Auto-initialize on search pages
if (window.location.pathname.includes('search')) {
    window.savedFiltersInstance = new SavedFilters();
    addSaveFilterButton();
}
