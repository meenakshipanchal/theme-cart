/**
 * Auto-Freebie System (Optimized)
 * Automatically adds/removes free gift products based on cart total.
 * Uses event cart data for instant UI updates — no extra fetch.
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

  /** Instantly hide freebie items from DOM */
  function hideFreebieItems() {
    var els = document.querySelectorAll('[data-freebie]');
    for (var i = 0; i < els.length; i++) {
      els[i].style.display = 'none';
    }
  }

  /** Apply section HTML from API response */
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

  /**
   * Process cart data and determine what freebie action is needed.
   * Returns null if no change needed, or action object.
   * Updates progress bar and hides freebie items INSTANTLY.
   */
  function processCartData(cart) {
    if (!cart.items || cart.items.length === 0) return null;

    var realTotal = 0;
    var existingFreebie = null;

    cart.items.forEach(function (item) {
      if (item.properties && item.properties._freebie) {
        existingFreebie = item;
      } else {
        realTotal += item.final_line_price;
      }
    });

    // Update progress bar INSTANTLY
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

    // Already correct → no action needed
    if (existingVid === neededVid) return null;

    // Freebie needs removal or swap → hide it INSTANTLY from UI
    if (existingFreebie) {
      hideFreebieItems();
    }

    return {
      existingFreebie: existingFreebie,
      qualifiedFreebie: qualifiedFreebie,
      realTotal: realTotal
    };
  }

  /** Execute the freebie add/remove API calls in background */
  function executeFreebieChange(action) {
    if (_processing) return;
    _processing = true;

    var chain = Promise.resolve();
    var lastResponse = null;

    if (action.existingFreebie && action.qualifiedFreebie) {
      chain = chain
        .then(function () { return removeItem(action.existingFreebie.key); })
        .then(function () { return addItem(action.qualifiedFreebie.variantId); })
        .then(function (resp) { lastResponse = resp; });
    } else if (action.existingFreebie) {
      chain = chain
        .then(function () { return removeItem(action.existingFreebie.key); })
        .then(function (resp) { lastResponse = resp; });
    } else if (action.qualifiedFreebie) {
      chain = chain
        .then(function () { return addItem(action.qualifiedFreebie.variantId); })
        .then(function (resp) { lastResponse = resp; });
    }

    chain
      .then(function () {
        if (lastResponse) {
          applySectionHTML(lastResponse);
          if (typeof window.updateCartRewards === 'function') {
            window.updateCartRewards(action.realTotal);
          }
        }
      })
      .catch(function (err) {
        console.error('[Auto-Freebie]', err);
      })
      .then(function () {
        _processing = false;
      });
  }

  /** Full flow: fetch cart → process → execute (used on initial load) */
  function manageFreebie() {
    if (_processing) return;
    _processing = true;

    getCart()
      .then(function (cart) {
        var action = processCartData(cart);
        if (action) {
          _processing = false;
          executeFreebieChange(action);
        } else {
          _processing = false;
        }
      })
      .catch(function (err) {
        console.error('[Auto-Freebie]', err);
        _processing = false;
      });
  }

  // Run on initial load
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(manageFreebie, 80);
  });

  // Hook into Shopify PubSub — use event data directly (NO extra fetch)
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, function (event) {
      if (event.source === 'auto-freebie') return;

      // Use cart data from event INSTANTLY — no network delay
      if (event.cartData && event.cartData.items) {
        var action = processCartData(event.cartData);
        if (action) {
          executeFreebieChange(action);
        }
        return;
      }

      // Fallback: fetch cart if event has no data
      setTimeout(manageFreebie, 50);
    });
  }

  window.manageCartFreebie = manageFreebie;
})();
