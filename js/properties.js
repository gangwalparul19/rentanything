/**
 * Properties Browse Page
 */

import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { initHeader } from './header-manager.js';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initFooter } from './footer-manager.js';
import { showLoader, hideLoader } from './loader.js';

// Pagination variables
let currentPage = 1;
const ITEMS_PER_PAGE = 8;
let allFilteredProperties = [];

document.addEventListener('DOMContentLoaded', () => {
    initHeader();      // 1. Inject links and setup UI auth
    initMobileMenu();  // 2. Make hamburger menu clickable
    initTheme();       // 3. Setup light/dark mode
    initAuth();        // 4. Setup login button listeners
    initFooter();
    loadSocieties(); // Load society dropdown
    loadProperties();
});

/**
 * Load Societies dropdown from Firestore
 */
/**
 * Load Societies into Custom Typeahead Dropdown
 */
async function loadSocieties() {
    try {
        const q = query(collection(db, "societies"), where("isActive", "!=", false));
        const querySnapshot = await getDocs(q);
        const approvedSocieties = [];
        querySnapshot.forEach((doc) => {
            approvedSocieties.push(doc.data().name);
        });

        // Elements
        const wrapper = document.getElementById('society-select-wrapper');
        const selectBox = document.getElementById('society-select-box');
        const optionsContainer = document.getElementById('society-options');
        const searchInput = document.getElementById('society-search-input');
        const optionsList = document.getElementById('society-list');
        const hiddenInput = document.getElementById('search-society');
        const selectedText = selectBox.querySelector('.selected-text');

        // Populate List
        function populateList(filter = "") {
            // Keep the "All Societies" option
            optionsList.innerHTML = `<li class="option" data-value="">All Societies</li>`;

            const filtered = approvedSocieties.filter(name =>
                name.toLowerCase().includes(filter.toLowerCase())
            ).sort();

            filtered.forEach(name => {
                const li = document.createElement('li');
                li.className = 'option';
                li.dataset.value = name;
                li.textContent = name;
                if (hiddenInput.value === name) li.classList.add('selected');
                optionsList.appendChild(li);
            });

            attachOptionListeners();
        }

        function attachOptionListeners() {
            const options = optionsList.querySelectorAll('.option');
            options.forEach(option => {
                option.addEventListener('click', () => {
                    hiddenInput.value = option.dataset.value;
                    selectedText.textContent = option.textContent;
                    wrapper.classList.remove('open');
                    optionsContainer.classList.add('hidden');

                    // Update selected class
                    optionsList.querySelectorAll('.option').forEach(el => el.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });
        }

        // Initial Populate
        populateList();

        // Toggle Dropdown
        selectBox.addEventListener('click', () => {
            wrapper.classList.toggle('open');
            optionsContainer.classList.toggle('hidden');
            if (!optionsContainer.classList.contains('hidden')) {
                searchInput.focus();
            }
        });

        // Search Filter
        searchInput.addEventListener('input', (e) => {
            populateList(e.target.value);
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
                optionsContainer.classList.add('hidden');
            }
        });

    } catch (error) {
        console.error("Error loading societies:", error);
    }
}

// ... helper render functions ...

window.applyFilters = () => {
    // Get value from hidden input for society
    const societyVal = document.getElementById('search-society').value;

    const filters = {
        society: societyVal,
        bedrooms: document.getElementById('filter-bedrooms').value,
        type: document.getElementById('filter-type').value
    };

    loadProperties(filters);
};
