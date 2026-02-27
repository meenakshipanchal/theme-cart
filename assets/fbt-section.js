/**
 * FBT Section - Optimized for Core Web Vitals (LCP, INP, FCP, TBT, TTFB)
 */
(function() {
  'use strict';

  const RANK_LABELS = { 1: '⭐ 1st', 2: '⭐ 2nd', 3: '⭐ 3rd' };
  const PLACEHOLDER_IMG = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';

  window.initFbtSection = function(config) {
    const { apiUrl, sectionType, gaEventName, containerId } = config;
    let isCurrentlyFetching = false;
    let initialized = false;

    function initialize() {
      if (initialized || isCurrentlyFetching) return;
      const container = document.getElementById(containerId);
      if (!container || container.dataset.initialized === 'true') return;

      // Quick fetch with minimal delay to not block main thread (CWV safe)
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => fetchProducts(), { timeout: 100 });
      } else {
        setTimeout(fetchProducts, 0);
      }
    }

    async function fetchProducts() {
      const container = document.getElementById(containerId);
      if (!container || isCurrentlyFetching) return;
      isCurrentlyFetching = true;

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        const products = data.products || [];

        if (products.length === 0) {
          container.innerHTML = '<div class="fbt-section-message">No products available.</div>';
        } else {
          renderProducts(products, container);
        }
        container.dataset.initialized = 'true';
        initialized = true;
      } catch (e) {
        container.innerHTML = '<div class="fbt-section-message">Could not load products.</div>';
      } finally {
        isCurrentlyFetching = false;
      }
    }

    function renderProducts(products, container) {
      const html = products.map((p, i) => {
        if (!p.handle) return '';
        const title = p.variant_title && p.variant_title !== 'Default Title'
          ? `${p.title} - ${p.variant_title}`
          : (p.title || 'Product');
        const rank = i + 1;
        const badge = rank <= 3 ? `<div class="fbt-section-rank-badge rank-${rank}">${RANK_LABELS[rank]}</div>` : '';
        const isOOS = p.available === false || p.inventory_quantity === 0;
        const btnHtml = isOOS
          ? `<span class="fbt-section-oos">Out of Stock</span>`
          : `<button class="fbt-section-btn" data-vid="${p.variant_id}" data-title="${title}" data-price="${parseFloat(p.price||0).toFixed(2)}" data-handle="${p.handle}"><span class="btn-text">Add</span><span class="btn-loader"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z"><animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite"/></path></svg></span></button>`;

        return `<div class="fbt-section-card">${badge}<div class="fbt-section-image"><a href="/products/${p.handle}"><img src="${p.image || PLACEHOLDER_IMG}" alt="${title}" loading="lazy" decoding="async"></a></div><div class="fbt-section-info"><div class="fbt-section-name"><a href="/products/${p.handle}">${title}</a></div><div class="fbt-section-bottom"><span class="fbt-section-price">₹${parseFloat(p.price||0).toFixed(2)}</span>${btnHtml}</div></div></div>`;
      }).join('');

      container.innerHTML = html;

      // Event delegation - single listener instead of multiple
      container.onclick = handleClick;
    }

    function handleClick(e) {
      const btn = e.target.closest('.fbt-section-btn');
      if (!btn) return;
      e.preventDefault();
      const { vid, title, price, handle } = btn.dataset;
      if (vid) addToCart(vid, title, price, handle, btn);
    }

    async function addToCart(variantId, title, price, handle, btn) {
      btn.classList.add('loading');

      try {
        const numericId = parseInt(variantId, 10);
        if (!numericId) {
          console.error('Invalid variant ID:', variantId);
          markAsOOS(btn);
          return;
        }

        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ id: numericId, quantity: 1 }] }),
        });

        if (!response.ok) {
          // 422 = product unavailable/OOS
          if (response.status === 422) {
            markAsOOS(btn);
          }
          return;
        }

        // GA4 event - non-blocking
        if (typeof gtag !== 'undefined') {
          requestAnimationFrame(() => {
            gtag('event', gaEventName, {
              method: `FBT ${sectionType} Section`,
              content_type: 'product',
              item_id: variantId,
              item_name: title,
              price: price,
              product_handle: handle,
              event_category: 'cart_drawer',
              event_label: title
            });
          });
        }

        await updateCartDrawer();
        openCartDrawer();
      } catch (e) {
        console.error('Add to cart failed');
      } finally {
        btn.classList.remove('loading');
      }
    }

    function markAsOOS(btn) {
      const oosSpan = document.createElement('span');
      oosSpan.className = 'fbt-section-oos';
      oosSpan.textContent = 'Out of Stock';
      btn.replaceWith(oosSpan);
    }

    async function updateCartDrawer() {
      try {
        const [sectionRes, cartRes] = await Promise.all([
          fetch('?section_id=cart-drawer'),
          fetch('/cart.js')
        ]);
        const [html, cart] = await Promise.all([sectionRes.text(), cartRes.json()]);

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const oldContent = document.querySelector('#CartDrawer .drawer__inner');
        const newContent = doc.querySelector('#CartDrawer .drawer__inner');

        if (oldContent && newContent) {
          oldContent.innerHTML = newContent.innerHTML;
          initialized = false;
          initialize();
        }

        const bubble = document.querySelector('#cart-icon-bubble .cart-count-bubble span[aria-hidden="true"]');
        if (bubble) bubble.textContent = cart.item_count;
      } catch (e) {}
    }

    function openCartDrawer() {
      const drawer = document.querySelector('cart-drawer');
      if (drawer) {
        drawer.classList.add('active', 'is-open');
        document.body.style.overflow = 'hidden';
      }
    }

    // Instant initialization on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
      initialize();
    }

    // Debounced cart update listener
    let cartUpdateTimeout;
    document.addEventListener('cart:updated', () => {
      clearTimeout(cartUpdateTimeout);
      cartUpdateTimeout = setTimeout(() => {
        initialized = false;
        initialize();
      }, 150);
    });

    // Optimized MutationObserver - only observe when drawer exists
    const setupObserver = () => {
      const drawer = document.getElementById('CartDrawer');
      if (!drawer) return;

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.addedNodes.length || m.removedNodes.length) {
            initialized = false;
            initialize();
            break;
          }
        }
      });

      observer.observe(drawer, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupObserver, { once: true });
    } else {
      setupObserver();
    }

    return initialize;
  };
})();
