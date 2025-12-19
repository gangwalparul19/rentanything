/**
 * Enhanced Search Autocomplete
 * Adds recent searches, popular items, and rich previews
 */

class EnhancedSearch {
    constructor(inputId, options = {}) {
        this.input = document.getElementById(inputId);
        if (!this.input) return;

        this.options = {
            showRecent: true,
            showPopular: true,
            showRichPreview: true,
            maxRecent: 5,
            maxSuggestions: 8,
            debounceMs: 300,
            ...options
        };

        this.recentSearches = this.loadRecentSearches();
        this.isOpen = false;
        this.selectedIndex = -1;
        this.debounceTimer = null;

        this.init();
    }

    init() {
        // Create dropdown container
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'search-autocomplete-dropdown';
        this.dropdown.style.display = 'none';
        this.input.parentElement.style.position = 'relative';
        this.input.parentElement.appendChild(this.dropdown);

        // Event listeners
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('focus', () => this.handleFocus());
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.input.parentElement.contains(e.target)) {
                this.close();
            }
        });
    }

    handleInput(e) {
        const query = e.target.value.trim();

        // Debounce
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (query.length > 0) {
                this.showSuggestions(query);
            } else {
                this.showRecentAndPopular();
            }
        }, this.options.debounceMs);
    }

    handleFocus() {
        if (this.input.value.trim().length > 0) {
            this.showSuggestions(this.input.value.trim());
        } else {
            this.showRecentAndPopular();
        }
    }

    handleKeydown(e) {
        if (!this.isOpen) return;

        const items = this.dropdown.querySelectorAll('.autocomplete-item');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
                this.updateSelection(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection(items);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                    items[this.selectedIndex].click();
                } else {
                    this.performSearch(this.input.value);
                }
                break;
            case 'Escape':
                this.close();
                break;
        }
    }

    updateSelection(items) {
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    showRecentAndPopular() {
        let html = '';

        // Recent searches
        if (this.options.showRecent && this.recentSearches.length > 0) {
            html += '<div class="autocomplete-section">';
            html += '<div class="autocomplete-section-title">Recent Searches</div>';
            this.recentSearches.slice(0, this.options.maxRecent).forEach(search => {
                html += `
                    <div class="autocomplete-item" data-query="${search}">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        <span>${search}</span>
                        <button class="remove-recent" data-query="${search}" title="Remove">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Popular searches (mock data - replace with real data)
        if (this.options.showPopular) {
            const popularItems = ['Camera', 'Laptop', 'Bicycle', 'Furniture'];
            html += '<div class="autocomplete-section">';
            html += '<div class="autocomplete-section-title">Popular</div>';
            popularItems.forEach(item => {
                html += `
                    <div class="autocomplete-item" data-query="${item}">
                        <i class="fa-solid fa-fire"></i>
                        <span>${item}</span>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (html) {
            this.dropdown.innerHTML = html;
            this.open();
            this.attachItemListeners();
        }
    }

    async showSuggestions(query) {
        // Here you would fetch real suggestions from your database
        // For now, showing a simple implementation

        let html = '<div class="autocomplete-section">';
        html += `<div class="autocomplete-section-title">Results for "${query}"</div>`;

        // Mock suggestions - replace with real search
        const mockResults = [
            { title: 'Camera Equipment', category: 'Electronics', price: 500 },
            { title: 'Camera Tripod', category: 'Electronics', price: 150 }
        ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));

        if (mockResults.length > 0) {
            mockResults.forEach(result => {
                html += `
                    <div class="autocomplete-item rich" data-query="${result.title}">
                        <div class="autocomplete-item-content">
                            <div class="autocomplete-item-title">${result.title}</div>
                            <div class="autocomplete-item-meta">
                                <span class="category">${result.category}</span>
                                <span class="price">₹${result.price}/day</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<div class="autocomplete-no-results">No results found</div>';
        }

        html += '</div>';

        this.dropdown.innerHTML = html;
        this.open();
        this.attachItemListeners();
    }

    attachItemListeners() {
        // Click on autocomplete item
        this.dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const query = item.dataset.query;
                this.performSearch(query);
            });
        });

        // Remove recent search
        this.dropdown.querySelectorAll('.remove-recent').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const query = btn.dataset.query;
                this.removeRecentSearch(query);
            });
        });
    }

    performSearch(query) {
        this.saveRecentSearch(query);
        this.input.value = query;
        this.close();

        // Trigger search (call your existing search function)
        if (typeof window.filterAndRender === 'function') {
            window.filterAndRender();
        }
    }

    saveRecentSearch(query) {
        // Remove if already exists
        this.recentSearches = this.recentSearches.filter(s => s !== query);
        // Add to beginning
        this.recentSearches.unshift(query);
        // Limit size
        this.recentSearches = this.recentSearches.slice(0, 10);
        // Save to localStorage
        localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
    }

    removeRecentSearch(query) {
        this.recentSearches = this.recentSearches.filter(s => s !== query);
        localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
        this.showRecentAndPopular();
    }

    loadRecentSearches() {
        try {
            return JSON.parse(localStorage.getItem('recentSearches') || '[]');
        } catch {
            return [];
        }
    }

    open() {
        this.dropdown.style.display = 'block';
        this.isOpen = true;
        this.selectedIndex = -1;
    }

    close() {
        this.dropdown.style.display = 'none';
        this.isOpen = false;
        this.selectedIndex = -1;
    }
}

// Export
window.EnhancedSearch = EnhancedSearch;
export { EnhancedSearch };

// Auto-initialize on search pages
if (document.getElementById('search-input')) {
    new EnhancedSearch('search-input');
}
