
export function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const header = document.querySelector('.app-header');
    const navLinks = document.querySelector('.nav-links'); // Assuming .nav-links is the element that needs 'active' class

    if (menuBtn && header && navLinks) {
        menuBtn.addEventListener('click', () => {
            header.classList.toggle('active');
            navLinks.classList.toggle('active'); // Toggle active on navLinks as well
            menuBtn.classList.toggle('active'); // Toggle active on menuBtn for styling

            // Optional: Animate hamburger to X
            const spans = menuBtn.querySelectorAll('span');
            if (header.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });

        // Close menu when clicking a link
        const links = document.querySelectorAll('.nav-links a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                header.classList.remove('active');
                // Reset hamburger
                const spans = menuBtn.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            });
        });
    }
}
