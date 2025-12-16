/**
 * Global Loader Utility
 * Dynamically creates and toggles a full-screen loader.
 */

export function showLoader(message = "Loading...") {
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = `
            <div class="loader-spinner"></div>
            <div class="loader-text">${message}</div>
        `;
        document.body.appendChild(loader);
    } else {
        loader.querySelector('.loader-text').textContent = message;
    }

    // Force reflow
    requestAnimationFrame(() => {
        loader.classList.add('visible');
    });
}

export function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.remove('visible');
    }
}
