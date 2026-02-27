class CartApplyDiscountButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent default button behavior
      if(event.target.id != 'apply-discount-btn') {
        return;
      }

      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      
      const discountInput = cartItems.querySelector('#discount-code-input');
      const feedbackMessage = cartItems.querySelector('#discount-feedback');

      if (!discountInput || !feedbackMessage) {
        console.error('Required elements not found in the cart container');
        return;
      }

      const discountCode = discountInput.value.trim();

      if (!discountCode) {
        feedbackMessage.textContent = 'Please enter a discount code.';
        return;
      }

      // Call to apply the discount
      this.applyDiscount(discountCode, feedbackMessage);
    });
  }

  applyDiscount(discountCode, feedbackMessage) {
    fetch(`/discount/${discountCode}`, { method: 'GET' })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to apply discount.');
        // return response.json();
        //console.log('error');
        return;
      })
      .then((data) => {
        //feedbackMessage.textContent = 'Discount applied!';
        // console.log('Discount applied:', data);
        this.updateCartContents();
      })
      .catch((error) => {
        feedbackMessage.textContent = error.message;
        console.error('Error applying discount:', error);
      });
  }

  removeDiscount(discountCode, feedbackMessage) {
    fetch(`/discount/NO_DISCOUNT`, { method: 'GET' })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to apply discount.');
        // return response.json();
        //console.log('error');
        return;
      })
      .then((data) => {
        //feedbackMessage.textContent = 'Discount applied!';
        // console.log('Discount Removed');
        this.updateCartContents();
      })
      .catch((error) => {
        feedbackMessage.textContent = error.message;
        console.error('Error applying discount:', error);
      });
  }

  updateCartContents() {
    fetch(`${routes.cart_url}?section_id=cart-drawer`)
      .then((response) => response.text())
      .then((responseText) => {
        const parser = new DOMParser();
        const newDocument = parser.parseFromString(responseText, 'text/html');

        // Elements to update
        const selectors = ['cart-drawer-items', '.cart-drawer__footer', '.cart__ctas'];
        for (const selector of selectors) {
          const oldElement = document.querySelector(selector);
          const newElement = newDocument.querySelector(selector);

          if (oldElement && newElement) {
            oldElement.replaceWith(newElement);
          }
        }
        // alert('Cart contents updated successfully!');
      })
      .catch((error) => {
        console.error('Error updating cart contents:', error);
      });
  }
}
customElements.define('cart-discount-button', CartApplyDiscountButton);

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }
  setHeaderCartIconAccessibility() {
    const setupCartLink = (selector) => {
      const cartLink = document.querySelector(selector);
      if (!cartLink) {
        console.warn(`Element with selector "${selector}" not found.`);
        return;
      }
  
      cartLink.setAttribute('role', 'button');
      cartLink.setAttribute('aria-haspopup', 'dialog');
      cartLink.addEventListener('click', (event) => {
        event.preventDefault();
        this.open(cartLink);
      });
      cartLink.addEventListener('keydown', (event) => {
        if (event.code.toUpperCase() === 'SPACE') {
          event.preventDefault();
          this.open(cartLink);
        }
      });
    };
  
    // Apply the function to both selectors
    setupCartLink('#cart-icon-bubble');
    setupCartLink('#cart-icon--bubble');
    setupCartLink('#cart-notification-button'); // notification popup view cart click
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
    document.querySelector('button#pop-club-quick-buy3')?.classList.add('hidden');
    typeof(renderPopPrices)==='function' && renderPopPrices(true);

    // Animate rewards progress bar slider on drawer open
    if (typeof window.animateRewardsSlider === 'function') {
      setTimeout(window.animateRewardsSlider, 150);
    }
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
    document.querySelector('button#pop-club-quick-buy3')?.classList.remove('hidden');

    const cartCountBubble = document.querySelector('.cart-count-bubble span:first-child');
    const cartCount = cartCountBubble ? cartCountBubble.textContent.trim() : null;
    const cartBubble = document.querySelector('#cart--bubble');
    if (cartBubble) cartBubble.innerText = cartCount;
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}
customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}
customElements.define('cart-drawer-items', CartDrawerItems);
