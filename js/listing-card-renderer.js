/**
 * Listing Card Renderer Utility
 * Shared function for rendering listing cards consistently across the app
 */

import { CURRENCY_SYMBOL } from './constants.js';

/**
 * Generates transaction type badges for a listing
 * @param {string[]} transactionTypes - Array of transaction types ('rent', 'sell', 'donate')
 * @returns {string} HTML string of badges
 */
function generateBadges(transactionTypes) {
    if (!transactionTypes || transactionTypes.length === 0) {
        return '<span style="background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right:4px;">RENT</span>';
    }

    const badges = [];
    if (transactionTypes.includes('rent')) {
        badges.push('<span style="background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right:4px;">RENT</span>');
    }
    if (transactionTypes.includes('sell')) {
        badges.push('<span style="background: #dcfce7; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right:4px;">BUY</span>');
    }
    if (transactionTypes.includes('donate')) {
        badges.push('<span style="background: #ffe4e6; color: #e11d48; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right:4px;">FREE</span>');
    }

    return badges.join('');
}

/**
 * Formats pricing information for display
 * @param {Object} item - Listing item
 * @param {Object} item.rates - Pricing rates object
 * @param {number} item.rates.daily - Daily rental rate
 * @param {number} item.salePrice - Sale price for buy listings
 * @param {string[]} item.transactionTypes - Transaction types array
 * @returns {string} Formatted price string
 */
function formatPrice(item) {
    const types = item.transactionTypes || ['rent'];

    if (types.includes('donate')) {
        return 'FREE';
    }

    if (types.includes('rent') && item.rates?.daily) {
        return `${CURRENCY_SYMBOL}${item.rates.daily}/day`;
    }

    if (types.includes('sell') && item.salePrice) {
        return `${CURRENCY_SYMBOL}${item.salePrice}`;
    }

    return `${CURRENCY_SYMBOL}${item.rates?.daily || item.price || 0}/day`;
}

/**
 * Renders a listing card with consistent styling
 * @param {Object} item - Listing data object
 * @param {string} item.id - Listing ID
 * @param {string} item.title - Listing title
 * @param {string} item.image - Image URL
 * @param {string} item.category - Category name
 * @param {string} item.location - Location string
 * @param {string[]} item.transactionTypes - Transaction types array
 * @returns {string} HTML string for the listing card
 */
export function renderListingCard(item) {
    const badges = generateBadges(item.transactionTypes);
    const price = formatPrice(item);

    return `
        <div class="product-card" onclick="window.location.href='/product.html?id=${item.id}'">
            <div class="product-img-wrapper">
                <img src="${item.image || 'https://placehold.co/400x300'}" alt="${item.title}">
                <div class="category-badge">${item.category}</div>
            </div>
            <div class="product-info">
                <div style="margin-bottom: 0.5rem;">
                    ${badges}
                </div>
                <h3 class="product-title">${item.title}</h3>
                <div class="product-price">${price}</div>
                <div class="product-location">
                    <i class="fa-solid fa-location-dot"></i> ${item.location || 'Location not specified'}
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders a simplified listing card for recommendations/related items
 * @param {Object} product - Product data object
 * @returns {string} HTML string for simplified card
 */
export function renderSimpleListingCard(product) {
    const price = formatPrice(product);

    return `
        <div class="product-card" onclick="window.location.href='/product.html?id=${product.id}'">
            <div class="product-img-wrapper" style="height: 180px;">
                <img src="${product.image}" alt="${product.title}">
                <div class="category-badge">${product.category}</div>
            </div>
            <div class="product-info">
                <h3 class="product-title" style="font-size: 1rem;">${product.title}</h3>
                <div class="product-price">${price}</div>
            </div>
        </div>
    `;
}
