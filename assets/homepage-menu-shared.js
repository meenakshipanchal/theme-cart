/**
 * Homepage Menu Shared Functionality
 * Extracted common code from oil, ghee, and collection menu sections
 */

(function() {
  'use strict';

  // ========================================
  // SHARED UTILITIES
  // ========================================

  function debounce(func, wait) {
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

  // ========================================
  // SLIDING INDICATOR CLASS
  // ========================================

  class SlidingIndicator {
    constructor(containerSelector, indicatorSelector) {
      this.container = document.querySelector(containerSelector);
      this.indicator = document.querySelector(indicatorSelector);
      this.isInitialized = false;
      this.animationFrame = null;

      if (this.container && this.indicator) {
        this.init();
      }
    }

    init() {
      // Keep hidden initially
      this.indicator.style.opacity = '0';

      // Set initial position FIRST (while hidden)
      const activeItem = this.container.querySelector('.menu-nav-item.active');
      if (activeItem) {
        // Calculate position without animation
        const containerRect = this.container.getBoundingClientRect();
        const targetRect = activeItem.getBoundingClientRect();
        const leftPosition = targetRect.left - containerRect.left + this.container.scrollLeft;
        const width = targetRect.width;

        // Set position immediately (no transition)
        this.indicator.style.transition = 'none';
        this.indicator.style.transform = `translateX(${leftPosition}px)`;
        this.indicator.style.width = `${width}px`;

        // Force reflow, then show with fade
        this.indicator.offsetHeight;
        this.indicator.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease';
        this.indicator.style.opacity = '1';
        this.indicator.classList.add('active');
        this.isInitialized = true;
      }
    }

    updatePosition(targetItem, animate = true) {
      if (!this.indicator || !targetItem) return;

      // Cancel any pending animation frame
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }

      // Use requestAnimationFrame for smooth updates
      this.animationFrame = requestAnimationFrame(() => {
        const containerRect = this.container.getBoundingClientRect();
        const targetRect = targetItem.getBoundingClientRect();

        const leftPosition = targetRect.left - containerRect.left + this.container.scrollLeft;
        const width = targetRect.width;

        // Batch style updates
        if (animate && this.isInitialized) {
          this.indicator.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          this.indicator.style.transform = `translateX(${leftPosition}px)`;
        } else {
          this.indicator.style.transition = 'none';
          this.indicator.style.transform = `translateX(${leftPosition}px)`;
        }

        this.indicator.style.width = `${width}px`;

        if (!this.indicator.classList.contains('active')) {
          this.indicator.classList.add('active');
        }

        this.animationFrame = null;
      });
    }
  }

  // ========================================
  // CUSTOM SCROLLBAR CLASS
  // ========================================

  class CustomScrollbar {
    constructor(gridId, trackId, thumbId, rowId) {
      this.grid = document.getElementById(gridId);
      this.track = document.getElementById(trackId);
      this.thumb = document.getElementById(thumbId);
      this.row = document.getElementById(rowId);

      if (this.grid && this.track && this.thumb) {
        this.init();
      }
    }

    init() {
      const updateScrollbar = () => {
        const scrollLeft = this.grid.scrollLeft;
        const scrollWidth = this.grid.scrollWidth;
        const clientWidth = this.grid.clientWidth;

        const trackWidth = this.track.clientWidth;
        const thumbWidth = Math.max((clientWidth / scrollWidth) * trackWidth, 30);
        const maxScrollLeft = scrollWidth - clientWidth;

        const thumbPosition = maxScrollLeft > 0
          ? (scrollLeft / maxScrollLeft) * (trackWidth - thumbWidth)
          : 0;

        this.thumb.style.width = `${thumbWidth}px`;
        this.thumb.style.left = `${Math.max(0, Math.min(thumbPosition, trackWidth - thumbWidth))}px`;

        const hasOverflow = scrollWidth > clientWidth + 5;
        if (this.row) {
          this.row.style.display = hasOverflow ? 'flex' : 'none';
        }
      };

      const debouncedUpdate = debounce(updateScrollbar, 10);
      this.grid.addEventListener('scroll', debouncedUpdate, { passive: true });

      // Drag functionality
      let isDragging = false;
      let startX = 0;
      let startScrollLeft = 0;

      this.thumb.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;

        isDragging = true;
        startX = e.clientX;
        startScrollLeft = this.grid.scrollLeft;

        const handleMouseMove = (e) => {
          if (!isDragging) return;

          const deltaX = e.clientX - startX;
          const trackWidth = this.track.clientWidth;
          const thumbWidth = this.thumb.clientWidth;
          const scrollRatio = deltaX / (trackWidth - thumbWidth);
          const maxScrollLeft = this.grid.scrollWidth - this.grid.clientWidth;

          this.grid.scrollLeft = startScrollLeft + (scrollRatio * maxScrollLeft);
        };

        const handleMouseUp = () => {
          isDragging = false;
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseup', handleMouseUp, { passive: true });

        e.preventDefault();
      });

      updateScrollbar();
    }

    update() {
      // Trigger a scroll event to update the scrollbar
      this.grid.dispatchEvent(new Event('scroll'));
    }
  }

  // ========================================
  // EXPORT TO WINDOW
  // ========================================

  window.HomepageMenuShared = {
    SlidingIndicator,
    CustomScrollbar,
    debounce
  };

})();
