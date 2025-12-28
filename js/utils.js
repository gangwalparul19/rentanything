/**
 * Utility Functions for RentAnything
 * Common helper functions used across the application
 */

/**
 * Debounce function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Debounce for async functions with AbortController support
 */
export function debounceAsync(asyncFunc, wait = 300) {
    let timeout;
    let abortController = null;

    return function executedFunction(...args) {
        if (abortController) {
            abortController.abort();
        }
        clearTimeout(timeout);

        abortController = new AbortController();
        const signal = abortController.signal;

        return new Promise((resolve, reject) => {
            timeout = setTimeout(async () => {
                try {
                    // Pass signal as last argument
                    const result = await asyncFunc(...args, signal);
                    resolve(result);
                } catch (error) {
                    if (error.name === 'AbortError') {
                        resolve(null);
                    } else {
                        reject(error);
                    }
                }
            }, wait);
        });
    };
}

/**
 * Simple in-memory cache
 */
class SimpleCache {
    constructor(ttlMs = 60000) {
        this.cache = new Map();
        this.ttl = ttlMs;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + this.ttl
        });
    }

    clear() {
        this.cache.clear();
    }
}

export const dataCache = new SimpleCache(5 * 60 * 1000);

export function throttle(func, wait = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

export function formatDate(date) {
    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}

export function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

export function scrollToElement(target) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        return false;
    }
}

export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const pendingRequests = new Map();

export async function dedupedFetch(key, fetchFn) {
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
    }

    const promise = fetchFn().finally(() => {
        pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
}

export async function batchPromises(promiseFns, concurrency = 5) {
    const results = [];
    const executing = new Set();

    for (const promiseFn of promiseFns) {
        const promise = promiseFn().then(result => {
            executing.delete(promise);
            return result;
        });

        executing.add(promise);
        results.push(promise);

        if (executing.size >= concurrency) {
            await Promise.race(executing);
        }
    }

    return Promise.all(results);
}

export function chunkArray(array, size = 10) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

export async function retryOperation(operation, retries = 3, delay = 1000, backoff = 2) {
    try {
        return await operation();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryOperation(operation, retries - 1, delay * backoff, backoff);
    }
}
