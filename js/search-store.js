import { createStore } from './store';

/**
 * Search Store - Manages state for the Search Page
 */
export const useSearchStore = createStore((set, get) => ({
    // State
    searchTerm: '',
    activeCategories: ['all'],
    priceRange: { min: 0, max: 5000 },
    dateRange: { start: null, end: null },
    results: [],
    loading: false,

    // Actions
    setSearchTerm: (term) => set({ searchTerm: term }),

    toggleCategory: (category) => set((state) => {
        const cats = new Set(state.activeCategories);
        if (category === 'all') {
            return { activeCategories: ['all'] };
        }

        cats.delete('all');
        if (cats.has(category)) {
            cats.delete(category);
        } else {
            cats.add(category);
        }

        if (cats.size === 0) return { activeCategories: ['all'] };
        return { activeCategories: Array.from(cats) };
    }),

    setPriceRange: (min, max) => set({ priceRange: { min, max } }),

    setResults: (results) => set({ results, loading: false }),

    setLoading: (loading) => set({ loading }),

    resetFilters: () => set({
        activeCategories: ['all'],
        priceRange: { min: 0, max: 5000 },
        dateRange: { start: null, end: null },
        searchTerm: ''
    })
}));
