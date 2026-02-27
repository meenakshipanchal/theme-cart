class CartFreebies extends HTMLElement {
  constructor() {
    super();

    // Listen for a change event on the radio buttons
    this.addEventListener('change', (event) => {
      // Only proceed if the event is from a radio button input in the freebie section
      if (event.target.name === 'freebie-option') {
        const selectedFreebie = event.target;
        const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
        const feedbackMessage = cartItems.querySelector('#freebie-feedback');

        if (!selectedFreebie || !feedbackMessage) {
          console.error('Required elements not found in the cart container');
          return;
        }

        const freebieId = selectedFreebie.value.trim();
        const discountCode = selectedFreebie.dataset.discount;

        if (!freebieId) {
          feedbackMessage.textContent = 'Please select a freebie option.';
          return;
        }

        // Call to apply the freebie
        this.applyFreebie(freebieId, feedbackMessage, discountCode);
      }
    });
    // Create an instance of CartApplyDiscountButton
    this.discountButton = new CartApplyDiscountButton();
  }

  // Apply the freebie to the cart
  applyFreebie(freebieId, feedbackMessage, discountCode) {
    feedbackMessage.innerHTML = '<div class="spinner"></div>';
    feedbackMessage.classList.add('loading');
    
    fetch(`/cart/add.js`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: freebieId,
        quantity: 1,
        properties: {
          _freebie: true       // Adding the 'freebie' custom property
        }
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to apply freebie.');
        return response.json();
      })
      .then((data) => {
        // feedbackMessage.textContent = '';
        // console.log('Freebie added:', data);
        this.discountButton.applyDiscount(discountCode, 'Freebie added to your cart!');
      })
      .catch((error) => {
        feedbackMessage.textContent = error.message;
        console.error('Error applying freebie:', error);
      });
  }
}

// Define the custom element
customElements.define('cart-freebies', CartFreebies);
