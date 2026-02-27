/**
 * Auto-Freebie System
 * Automatically adds/removes free gift products based on cart total.
 */
(function () {
  'use strict';

  var FREEBIES = [
    { threshold: 149900, variantId: '47070925095104' },   // Jaggery  (₹1499+)
    { threshold: 299900, variantId: '47503774187712' }    // Festive Duo (₹2999+)
  ];

  var _processing = false;
  var SECTION_ID = 'cart-drawer';

  function getCart() {
    return fetch('/cart.js', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); });
  }

  function addItem(variantId) {
    return fetch('/cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Number(variantId),
        quantity: 1,
        properties: { _freebie: 'true' },
        sections: SECTION_ID
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed to add freebie');
      return r.json();
    });
  }

  function removeItem(lineKey) {
    return fetch('/cart/change.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: lineKey,
        quantity: 0,
        sections: SECTION_ID
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed to remove freebie');
      return r.json();
    });
  }

  function hideFreebieItems() {
    var els = document.querySelectorAll('[data-freebie]');
    for (var i = 0; i < els.length; i++) {
      els[i].style.display = 'none';
    }
  }

  function applySectionHTML(response) {
    var html = response && response.sections && response.sections[SECTION_ID];
    if (!html) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var oldDrawer = document.querySelector('#CartDrawer');
    var newDrawer = doc.querySelector('#CartDrawer');
    if (oldDrawer && newDrawer) {
      oldDrawer.innerHTML = newDrawer.innerHTML;
      var cartDrawerEl = document.querySelector('cart-drawer');
      var newCartDrawerEl = doc.querySelector('cart-drawer');
      if (cartDrawerEl && newCartDrawerEl) {
        var wasActive = cartDrawerEl.classList.contains('active');
        var wasAnimate = cartDrawerEl.classList.contains('animate');
        cartDrawerEl.className = newCartDrawerEl.className;
        if (wasActive) cartDrawerEl.classList.add('active');
        if (wasAnimate) cartDrawerEl.classList.add('animate');
      }
      var overlay = document.querySelector('#CartDrawer-Overlay');
      if (overlay && cartDrawerEl) {
        overlay.addEventListener('click', function () { cartDrawerEl.close(); });
      }
    }
  }

  function manageFreebie(cartData) {
    if (_processing) return;
    _processing = true;

    var cartPromise = cartData ? Promise.resolve(cartData) : getCart();

    cartPromise
      .then(function (cart) {
        if (!cart.items || cart.items.length === 0) {
          _processing = false;
          return;
        }

        var realTotal = 0;
        var existingFreebie = null;

        cart.items.forEach(function (item) {
          if (item.properties && item.properties._freebie) {
            existingFreebie = item;
          } else {
            realTotal += item.final_line_price;
          }
        });

        // Update progress bar immediately
        if (typeof window.updateCartRewards === 'function') {
          window.updateCartRewards(realTotal);
        }

        // Determine which freebie qualifies (highest threshold met)
        var qualifiedFreebie = null;
        for (var i = FREEBIES.length - 1; i >= 0; i--) {
          if (realTotal >= FREEBIES[i].threshold) {
            qualifiedFreebie = FREEBIES[i];
            break;
          }
        }

        var existingVid = existingFreebie ? String(existingFreebie.variant_id) : null;
        var neededVid = qualifiedFreebie ? qualifiedFreebie.variantId : null;

        // Already correct → done
        if (existingVid === neededVid) {
          _processing = false;
          return;
        }

        // Hide freebie from UI instantly before API call
        if (existingFreebie) {
          hideFreebieItems();
        }

        // Build chain: remove old → add new
        var chain = Promise.resolve();
        var lastResponse = null;

        if (existingFreebie && qualifiedFreebie) {
          chain = chain
            .then(function () { return removeItem(existingFreebie.key); })
            .then(function () { return addItem(qualifiedFreebie.variantId); })
            .then(function (resp) { lastResponse = resp; });
        } else if (existingFreebie) {
          chain = chain
            .then(function () { return removeItem(existingFreebie.key); })
            .then(function (resp) { lastResponse = resp; });
        } else if (qualifiedFreebie) {
          chain = chain
            .then(function () { return addItem(qualifiedFreebie.variantId); })
            .then(function (resp) { lastResponse = resp; });
        }

        return chain.then(function () {
          if (lastResponse) {
            applySectionHTML(lastResponse);
            if (typeof window.updateCartRewards === 'function') {
              window.updateCartRewards(realTotal);
            }
          }
        });
      })
      .catch(function (err) {
        console.error('[Auto-Freebie]', err);
      })
      .then(function () {
        _processing = false;
      });
  }

  // Run on load — handle both cases: before and after DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(manageFreebie, 80);
    });
  } else {
    setTimeout(manageFreebie, 80);
  }

  // Hook into Shopify PubSub cart updates
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, function (event) {
      if (event.source === 'auto-freebie') return;
      // Use event cart data directly when available (instant, no fetch)
      var cart = (event.cartData && event.cartData.items) ? event.cartData : null;
      setTimeout(function () { manageFreebie(cart); }, 50);
    });
  }

  window.manageCartFreebie = manageFreebie;
})();
