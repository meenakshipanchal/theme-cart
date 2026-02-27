(function() {
  'use strict';

  // Config will be set from theme.liquid
  const CONFIG = window.RV_CONFIG || {
    API_URL: 'https://recently-viewed.anveshan.farm/api/recently-viewed',
    API_KEY: '',
    DEBUG: false
  };

  const PRODUCT_DATA = window.RV_PRODUCT_DATA || {};

  function getCurrentVariant() {
    const urlParams = new URLSearchParams(window.location.search);
    const variantIdFromUrl = urlParams.get('variant');

    if (variantIdFromUrl) {
      const variant = PRODUCT_DATA.variants.find(v => String(v.id) === String(variantIdFromUrl));
      if (variant) return variant;
    }

    const variantInput = document.querySelector('form[action*="/cart/add"] input[name="id"]');
    if (variantInput && variantInput.value) {
      const variant = PRODUCT_DATA.variants.find(v => String(v.id) === String(variantInput.value));
      if (variant) return variant;
    }

    const variantSelector = document.querySelector('select[name="id"]');
    if (variantSelector && variantSelector.value) {
      const variant = PRODUCT_DATA.variants.find(v => String(v.id) === String(variantSelector.value));
      if (variant) return variant;
    }

    const selectedOptions = [];
    const optionSelectors = document.querySelectorAll('input[name^="options"]:checked, select[name^="options"]');
    optionSelectors.forEach(selector => selectedOptions.push(selector.value));

    if (selectedOptions.length > 0) {
      const variant = PRODUCT_DATA.variants.find(v => {
        return selectedOptions.every((opt, idx) => v.options[idx] === opt);
      });
      if (variant) return variant;
    }

    return PRODUCT_DATA.variants[0];
  }

  function buildProductData() {
    const variant = getCurrentVariant();
    if (!variant) return null;

    const data = {
      product_id: PRODUCT_DATA.id,
      product_handle: PRODUCT_DATA.handle,
      product_title: PRODUCT_DATA.title,
      product_image: PRODUCT_DATA.image,
      product_price: PRODUCT_DATA.price,
      product_url: PRODUCT_DATA.url,
      viewed_at: Date.now(),
      variant_id: String(variant.id),
      variant_title: variant.title || variant.name || 'Default Title',
      variant_price: variant.price ? `₹${(variant.price / 100).toFixed(0)}` : PRODUCT_DATA.price,
      variant_sku: variant.sku || null,
      variant_available: variant.available || false
    };

    if (variant.featured_image && variant.featured_image.src) {
      data.variant_image = variant.featured_image.src;
    } else if (variant.image) {
      data.variant_image = variant.image;
    } else {
      data.variant_image = data.product_image;
    }

    data.product_url = `${PRODUCT_DATA.url}?variant=${variant.id}`;
    data.display_title = data.variant_title !== 'Default Title'
      ? `${data.product_title} - ${data.variant_title}`
      : data.product_title;

    return data;
  }

  function getVisitorId() {
    try {
      let visitorId = localStorage.getItem('rv_visitor_id');
      if (!visitorId) {
        visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('rv_visitor_id', visitorId);
      }
      return visitorId;
    } catch (error) {
      return 'visitor_' + Date.now();
    }
  }

  function storeLocalView(product) {
    try {
      let recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

      if (product.variant_id) {
        recent = recent.filter(p => p.variant_id !== product.variant_id);
      } else {
        recent = recent.filter(p => p.product_id !== product.product_id);
      }

      recent.unshift(product);
      if (recent.length > 20) recent = recent.slice(0, 20);

      localStorage.setItem('recentlyViewed', JSON.stringify(recent));
    } catch (error) {
      // Silent fail
    }
  }

  async function syncToAPI(productData) {
    const customerId = window.RV_CUSTOMER_ID || getVisitorId();

    const doSync = async () => {
      try {
        await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CONFIG.API_KEY,
          },
          body: JSON.stringify({
            customer_id: customerId,
            ...productData
          }),
          keepalive: true
        });
      } catch (error) {
        // Silent fail
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(doSync, { timeout: 5000 });
    } else {
      setTimeout(doSync, 1000);
    }
  }

  function trackVariantChanges() {
    const selectors = document.querySelectorAll(
      'select[name="id"], input[name="id"], [data-variant-selector], input[name^="options"], select[name^="options"]'
    );

    selectors.forEach(selector => {
      selector.addEventListener('change', function() {
        setTimeout(() => {
          const updatedData = buildProductData();
          if (updatedData) {
            storeLocalView(updatedData);
            syncToAPI(updatedData);
          }
        }, 200);
      });
    });

    // URL change tracking
    let lastUrl = window.location.href;
    window.addEventListener('popstate', () => {
      if (window.location.href !== lastUrl && window.location.href.includes('variant=')) {
        lastUrl = window.location.href;
        setTimeout(() => {
          const updatedData = buildProductData();
          if (updatedData) {
            storeLocalView(updatedData);
            syncToAPI(updatedData);
          }
        }, 200);
      }
    });
  }

  function init() {
    const productData = buildProductData();
    if (!productData) return;

    storeLocalView(productData);
    syncToAPI(productData);
    trackVariantChanges();
  }

  // Delay initialization
  const doInit = () => setTimeout(init, 2000);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInit);
  } else {
    doInit();
  }
})();
