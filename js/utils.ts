/**
 * Utility Functions for RentAnything
 * Common helper functions used across the application
 */

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number = 300): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return function executedFunction(...args: Parameters<T>) {
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
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(asyncFunc: T, wait: number = 300): (...args: Parameters<T>) => Promise<ReturnType<T> | null> {
    let timeout: ReturnType<typeof setTimeout>;
    let abortController: AbortController | null = null;

    return function executedFunction(...args: any[]): Promise<any> {
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
                } catch (error: any) {
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
class SimpleCache<T = any> {
    private cache: Map<string, { value: T; expiry: number }>;
    private ttl: number;

    constructor(ttlMs: number = 60000) {
        this.cache = new Map();
        this.ttl = ttlMs;
    }

    get(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    set(key: string, value: T): void {
        this.cache.set(key, {
            value,
            expiry: Date.now() + this.ttl
        });
    }

    clear(): void {
        this.cache.clear();
    }
}

export const dataCache = new SimpleCache(5 * 60 * 1000);

export function throttle(func: Function, wait: number = 300): Function {
    let inThrottle: boolean;
    return function executedFunction(...args: any[]) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

export function formatDate(date: Date | number | string): string {
    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}

export function truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function isInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

export function scrollToElement(target: string | HTMLElement): void {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        return false;
    }
}

export function escapeHtml(unsafe: string | any): string {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const pendingRequests = new Map<string, Promise<any>>();

export async function dedupedFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key) as Promise<T>;
    }

    const promise = fetchFn().finally(() => {
        pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
}

export async function batchPromises<T>(promiseFns: (() => Promise<T>)[], concurrency: number = 5): Promise<T[]> {
    const results: Promise<T>[] = [];
    const executing = new Set<Promise<T>>();

    for (const promiseFn of promiseFns) {
        const promise = promiseFn().then(result => {
            executing.delete(promise);
            return result;
        }) as Promise<T>;

        executing.add(promise);
        results.push(promise);

        if (executing.size >= concurrency) {
            await Promise.race(executing);
        }
    }

    return Promise.all(results);
}

export function chunkArray<T>(array: T[], size: number = 10): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

export async function retryOperation<T>(operation: () => Promise<T>, retries: number = 3, delay: number = 1000, backoff: number = 2): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryOperation(operation, retries - 1, delay * backoff, backoff);
    }
}
