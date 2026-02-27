/**
 * Qty Sold Badge - Fetches weekly sales data from FBT API
 * Shows "🔥 X sold" badge on variant cards
 */
(function() {
  'use strict';

  const CONFIG = {
    API_URL: 'https://fbt-api.anveshan.farm/api/public/trending/week',
    CACHE_KEY: 'anv_qty_sold_data',
    CACHE_DURATION: 30 * 60 * 1000 // 30 minutes
  };

  let salesDataMap = new Map();

  // Get cached data
  function getCachedData() {
    try {
      const cached = sessionStorage.getItem(CONFIG.CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CONFIG.CACHE_DURATION) return data;
      sessionStorage.removeItem(CONFIG.CACHE_KEY);
    } catch (e) {
      sessionStorage.removeItem(CONFIG.CACHE_KEY);
    }
    return null;
  }

  // Save to cache
  function setCachedData(data) {
    try {
      sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
        data: data,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  // Build lookup map from API data
  function buildSalesMap(products) {
    salesDataMap.clear();
    // console.log('Qty Sold Badge: Building sales map from', products.length, 'products');

    // Log first 5 products from API to see the ID format
    products.slice(0, 5).forEach((p, i) => {
      // console.log('Qty Sold Badge: API product', i, '- variant_id:', p.variant_id, 'product_id:', p.product_id, 'sales:', p.sales_count);
    });

    products.forEach(product => {
      if (product.variant_id) {
        salesDataMap.set(String(product.variant_id), product.sales_count || 0);
      }
      if (product.product_id) {
        const key = `p_${product.product_id}`;
        if (!salesDataMap.has(key)) {
          salesDataMap.set(key, product.sales_count || 0);
        }
      }
    });

    // console.log('Qty Sold Badge: Sales map built with', salesDataMap.size, 'entries');
    // Log first 5 entries from the map
    let count = 0;
    salesDataMap.forEach((value, key) => {
      if (count < 5) {
        // console.log('Qty Sold Badge: Map entry', count, '- key:', key, 'value:', value);
        count++;
      }
    });
  }

  // Update all badges on page
  function updateBadges() {
    const badges = document.querySelectorAll('.qty-sold-badge[data-variant-id]');
    // console.log('Qty Sold Badge: Found', badges.length, 'badges on page');
    // console.log('Qty Sold Badge: Sales map has', salesDataMap.size, 'entries');

    // Log first 5 badge IDs from the page
    Array.from(badges).slice(0, 5).forEach((badge, i) => {
      // console.log('Qty Sold Badge: Page badge', i, '- variantId:', badge.dataset.variantId, 'productId:', badge.dataset.productId);
    });

    let matchCount = 0;
    badges.forEach((badge, index) => {
      const variantId = badge.dataset.variantId;
      const productId = badge.dataset.productId;

      // Try variant ID first, then product ID
      let salesCount = salesDataMap.get(variantId);
      if (!salesCount && productId) {
        salesCount = salesDataMap.get(`p_${productId}`);
      }

      if (index < 5) {
        const hasInMap = salesDataMap.has(variantId) || salesDataMap.has(`p_${productId}`);
        // console.log('Qty Sold Badge: Badge', index, '- variantId:', variantId, 'productId:', productId, 'inMap:', hasInMap, 'salesCount:', salesCount);
      }

      if (salesCount && salesCount > 0) {
        // Add 1000, divide by 1000 to get "Xk+" format
        const totalCount = salesCount + 1000;
        const kValue = (totalCount / 1000).toFixed(1);
        // Remove .0 if whole number (e.g., 1.0 -> 1, but keep 1.5)
        const displayCount = kValue.endsWith('.0') ? kValue.slice(0, -2) : kValue;
        const countSpan = badge.querySelector('.sold-count');
        if (countSpan) {
          countSpan.textContent = displayCount + 'k+';
        }
        badge.classList.add('show');
        badge.style.removeProperty('display');
        matchCount++;
      } else {
        badge.classList.remove('show');
      }
    });

    // console.log('Qty Sold Badge: Total matches found:', matchCount, 'out of', badges.length, 'badges');
  }

  // Fetch data from API
  async function fetchSalesData() {
    // Check cache first
    const cached = getCachedData();
    if (cached) {
      buildSalesMap(cached);
      updateBadges();
      return;
    }

    try {
      console.log('Qty Sold Badge: Fetching from API...');
      const response = await fetch(CONFIG.API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      // console.log('Qty Sold Badge: API response status:', response.status);

      if (response.status === 429) {
        // console.warn('Qty Sold Badge: Rate limited');
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const products = data.products || [];
      // console.log('Qty Sold Badge: Got', products.length, 'products');

      // Cache the data
      setCachedData(products);

      // Build map and update badges
      buildSalesMap(products);
      updateBadges();

    } catch (error) {
      // console.error('Qty Sold Badge: Failed to fetch data', error);
    }
  }

  // Initialize
  function init() {
    // Delay to not block page load
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => fetchSalesData(), { timeout: 200 });
    } else {
      setTimeout(fetchSalesData, 100);
    }

    // Watch for new cards (infinite scroll, AJAX)
    const observer = new MutationObserver((mutations) => {
      let hasNewBadges = false;
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 &&
              (node.querySelector?.('.qty-sold-badge') || node.classList?.contains('qty-sold-badge'))) {
            hasNewBadges = true;
          }
        });
      });
      if (hasNewBadges && salesDataMap.size > 0) {
        updateBadges();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Re-update on cart changes
    document.addEventListener('cart:updated', () => {
      if (salesDataMap.size > 0) {
        setTimeout(updateBadges, 200);
      }
    });
  }

  // Export for manual refresh
  window.QtySoldBadge = {
    refresh: fetchSalesData,
    update: updateBadges
  };

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
