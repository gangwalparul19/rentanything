/**
 * Header Manager
 * Standardizes the navigation links across all pages (except admin).
 * Usage: Import initHeader and call it in DOMContentLoaded.
 */

export function initHeader() {
    const navContainer = document.querySelector('.nav-links');
    if (!navContainer) return;

    // Standard Links Configuration
    // derived from index.html
    const links = [
        { text: 'Home', href: 'index.html/#home' },
        { text: 'Requests', href: '/requests.html' },
        { text: 'Categories', href: 'index.html/#categories' },
        { text: 'How it Works', href: 'index.html/#how-it-works' }
    ];

    // Clear existing content (if any)
    navContainer.innerHTML = '';

    // Generate Links
    links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.text;

        // Optional: Highlight active link based on URL
        // Simple check: if current path ends with the link href (excluding anchors for now)
        if (window.location.pathname === link.href && !link.href.includes('#')) {
            a.classList.add('active');
        }

        navContainer.appendChild(a);
    });
}
