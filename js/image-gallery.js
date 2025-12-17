/**
 * Image Gallery Lightbox
 * Full-screen image viewer with zoom and navigation
 */

export class ImageGallery {
    constructor() {
        this.currentIndex = 0;
        this.images = [];
        this.lightbox = null;
        this.init();
    }

    init() {
        // Create lightbox HTML
        this.lightbox = document.createElement('div');
        this.lightbox.className = 'lightbox';
        this.lightbox.innerHTML = `
            <div class="lightbox-overlay"></div>
            <div class="lightbox-content">
                <button class="lightbox-close" aria-label="Close gallery">&times;</button>
                <button class="lightbox-prev" aria-label="Previous image">&larr;</button>
                <button class="lightbox-next" aria-label="Next image">&rarr;</button>
                <img class="lightbox-image" src="" alt="" loading="lazy">
                <div class="lightbox-counter"></div>
            </div>
        `;
        document.body.appendChild(this.lightbox);

        this.setupEventListeners();
    }

    open(images, startIndex = 0) {
        if (!images || images.length === 0) return;

        this.images = images;
        this.currentIndex = startIndex;
        this.showImage();
        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    showImage() {
        const img = this.lightbox.querySelector('.lightbox-image');
        const counter = this.lightbox.querySelector('.lightbox-counter');
        const prevBtn = this.lightbox.querySelector('.lightbox-prev');
        const nextBtn = this.lightbox.querySelector('.lightbox-next');

        img.src = this.images[this.currentIndex];
        counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;

        // Hide prev/next buttons if only one image
        if (this.images.length === 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
        }
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.showImage();
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.showImage();
    }

    setupEventListeners() {
        this.lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.close());
        this.lightbox.querySelector('.lightbox-next').addEventListener('click', () => this.next());
        this.lightbox.querySelector('.lightbox-prev').addEventListener('click', () => this.prev());
        this.lightbox.querySelector('.lightbox-overlay').addEventListener('click', () => this.close());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.lightbox.classList.contains('active')) return;

            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'ArrowLeft') this.prev();
        });

        // Touch swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        this.lightbox.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        this.lightbox.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });

        this.handleSwipe = () => {
            if (touchEndX < touchStartX - 50) this.next(); // Swipe left
            if (touchEndX > touchStartX + 50) this.prev(); // Swipe right
        };
    }
}

// Create and export global instance
export const gallery = new ImageGallery();
