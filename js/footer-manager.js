/**
 * Footer Manager
 * Injects a simple footer (Copyright + Social) on pages where the full footer is not needed.
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
                    <p>Designed by Parul Gangwal</p>
                    <div class="social-links" style="justify-content: center; margin-top: 1rem;">
                        <a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram fa-lg"></i></a>
                        <a href="#" aria-label="Twitter"><i class="fa-brands fa-twitter fa-lg"></i></a>
                        <a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook fa-lg"></i></a>
                    </div>
                </div>
            </div>
        `;
    }
}
