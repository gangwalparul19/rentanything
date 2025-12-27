/**
 * Footer Manager
 * Injects a simple footer (Copyright + Social) on pages where the full footer is not needed.
 * Also sets the dynamic copyright year.
 * Usage: Import initFooter and call it.
 */

export function initFooter() {
    const footer = document.querySelector('footer.app-footer');
    if (!footer) return;

    // Check if we are on the home page
    const isHomePage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');

    if (!isHomePage) {
        footer.innerHTML = `
            <div class="container" style="text-align: center;">
                 <div class="footer-bottom" style="border-top: none; padding-top: 0; margin-top: 0;">
                    <p>&copy; <span id="copyright-year"></span> RentAnything. All rights reserved.</p>
                    <div class="social-links" style="justify-content: center; margin-top: 1rem;">
                        <a href="https://wa.me/919372776019?text=Hello%20RentAnything!" aria-label="WhatsApp" target="_blank"><i class="fa-brands fa-whatsapp fa-lg"></i></a>
                        <a href="https://www.facebook.com/profile.php?id=61585500416022" aria-label="Facebook" target="_blank"><i class="fa-brands fa-facebook fa-lg"></i></a>
                    </div>
                </div>
            </div>
        `;
    }

    // Set the current year for copyright
    setCopyrightYear();
}

/**
 * Sets the current year in the copyright span
 */
function setCopyrightYear() {
    const yearSpan = document.getElementById('copyright-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}
