
export function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const header = document.querySelector('.app-header');
    const navLinks = document.querySelector('.nav-links');

    if (!menuBtn || !navLinks) return;

    // 1. Create Backdrop if it doesn't exist
    let backdrop = document.querySelector('.nav-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'nav-backdrop';
        document.body.appendChild(backdrop);
    }

    const toggleMenu = (forceClose = false) => {
        const isOpen = forceClose ? true : navLinks.classList.contains('active');

        if (isOpen) {
            // Close
            navLinks.classList.remove('active');
            backdrop.classList.remove('active');
            menuBtn.classList.remove('active');
            document.body.classList.remove('menu-open');
            if (header) header.classList.remove('active');
        } else {
            // Open
            navLinks.classList.add('active');
            backdrop.classList.add('active');
            menuBtn.classList.add('active');
            document.body.classList.add('menu-open');
            if (header) header.classList.add('active');
        }
    };

    menuBtn.addEventListener('click', () => toggleMenu());
    backdrop.addEventListener('click', () => toggleMenu(true));

    // Close menu when clicking a link
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', () => toggleMenu(true));
    });
}
