/**
 * Global Loader Utility
 * Creates a compact, non-blocking loader in bottom-right corner
 */

export function showLoader(message = "Loading...") {
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 9999;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            max-width: 300px;
            border: 1px solid #e2e8f0;
        `;
        loader.innerHTML = `
            <div class="loader-spinner" style="
                width: 24px;
                height: 24px;
                border: 3px solid #e2e8f0;
                border-top-color: #4f46e5;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            "></div>
            <div class="loader-text" style="
                font-size: 0.95rem;
                color: #334155;
                font-weight: 500;
            ">${message}</div>
        `;

        // Add spin animation if not exists
        if (!document.getElementById('loader-animation-style')) {
            const style = document.createElement('style');
            style.id = 'loader-animation-style';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(loader);
    } else {
        loader.querySelector('.loader-text').textContent = message;
    }

    // Show with animation
    requestAnimationFrame(() => {
        loader.style.opacity = '1';
        loader.style.transform = 'translateY(0)';
    });
}

export function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.transform = 'translateY(20px)';
        // Remove after animation
        setTimeout(() => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        }, 300);
    }
}
