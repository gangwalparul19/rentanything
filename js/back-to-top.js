/**
 * Back to Top Button Component
 * Appears after scrolling 300px down the page
 */

let backToTopButton = null;
let scrollProgress = 0;

// Initialize back-to-top button
function initBackToTop() {
    // Create button if it doesn't exist
    if (!document.getElementById('back-to-top')) {
        backToTopButton = document.createElement('button');
        backToTopButton.id = 'back-to-top';
        backToTopButton.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        backToTopButton.setAttribute('aria-label', 'Back to top');
        backToTopButton.title = 'Back to top';

        backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        document.body.appendChild(backToTopButton);
    }

    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Calculate scroll progress
        scrollProgress = (scrolled / (documentHeight - windowHeight)) * 100;

        // Show button after scrolling 300px
        if (scrolled > 300) {
            backToTopButton?.classList.add('visible');

            // Update progress ring
            if (backToTopButton) {
                const progressRing = scrollProgress * 3.6; // Convert to degrees
                backToTopButton.style.setProperty('--progress', `${progressRing}deg`);
            }
        } else {
            backToTopButton?.classList.remove('visible');
        }
    });
}

// Export for use in other modules
export { initBackToTop };

// Auto-initialize if imported directly
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackToTop);
    } else {
        initBackToTop();
    }
}
