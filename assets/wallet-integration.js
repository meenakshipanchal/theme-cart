// Wallet Integration JavaScript - Updated for Vercel
class WalletManager {
  constructor() {
    this.apiBase = 'https://puritycoins.anveshan.farm/api/v1/shiprocket';
    this.currentUser = this.getCurrentUser();
  }

  // Get current user from Shopify
  getCurrentUser() {
    return {
      id: window.customer?.id || null,
      email: window.customer?.email || null,
      phone: this.cleanPhone(window.customer?.phone) || null
    };
  }

  cleanPhone(phone) {
    if (!phone) return null;
    let cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.length === 10) return '+91' + cleaned;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return '+' + cleaned;
    if (cleaned.length === 11 && cleaned.startsWith('0')) return '+91' + cleaned.slice(1);
    return cleaned.length >= 10 ? '+91' + cleaned.slice(-10) : null;
  }

  // Get wallet balance
  async getWalletBalance(userId = null) {
    try {
      const user = userId || this.currentUser.id || this.currentUser.email;
      if (!user) {
        console.log('No user found');
        return null;
      }

      const response = await fetch(`${this.apiBase}/wallet-balance?user_id=${encodeURIComponent(user)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return null;
    }
  }

  // Display balance in header
  async displayBalance() {
    const walletData = await this.getWalletBalance();
    if (walletData) {
      const balanceElement = document.getElementById('coin-balance');
      if (balanceElement) {
        balanceElement.textContent = walletData.anveshan_coins || 0;
        balanceElement.style.color = '#28a745';
      }
    } else {
      const balanceElement = document.getElementById('coin-balance');
      if (balanceElement) {
        balanceElement.textContent = '0';
      }
    }
  }

  // Redeem coins during checkout
  async redeemCoins(coinsToRedeem, orderId) {
    try {
      const user = this.currentUser.id || this.currentUser.email;
      if (!user) {
        return { success: false, error: 'User not identified' };
      }

      const response = await fetch(`${this.apiBase}/redeem-coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user,
          coins_to_redeem: parseInt(coinsToRedeem),
          order_id: orderId,
          order_amount: this.getCartTotal()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error redeeming coins:', error);
      return { success: false, error: error.message };
    }
  }

  // Setup checkout integration
  async setupCheckoutIntegration() {
    const useCoinsCheckbox = document.getElementById('use-coins');
    const availableCoinsSpan = document.getElementById('available-coins');
    
    if (useCoinsCheckbox && availableCoinsSpan) {
      // Load available balance
      const walletData = await this.getWalletBalance();
      if (walletData && walletData.anveshan_coins > 0) {
        availableCoinsSpan.textContent = walletData.anveshan_coins;
        
        // Show the redemption section
        useCoinsCheckbox.parentElement.style.display = 'block';
      } else {
        // Hide if no coins
        useCoinsCheckbox.parentElement.style.display = 'none';
      }

      // Handle checkbox change
      useCoinsCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.calculateDiscount();
        } else {
          this.removeDiscount();
        }
      });
    }
  }

  // Calculate discount based on coins
  calculateDiscount() {
    const cartTotal = this.getCartTotal();
    const availableCoins = parseInt(document.getElementById('available-coins').textContent) || 0;
    const maxRedeemable = Math.min(availableCoins, Math.floor(cartTotal));
    
    // Create discount element if doesn't exist
    let discountElement = document.getElementById('coins-discount');
    if (!discountElement) {
      discountElement = document.createElement('div');
      discountElement.id = 'coins-discount';
      discountElement.className = 'coins-discount-display';
      document.querySelector('.coin-redemption').appendChild(discountElement);
    }
    
    discountElement.innerHTML = `
      <p><strong>Discount Applied: -₹${maxRedeemable}</strong></p>
      <p>Using ${maxRedeemable} Anveshan Coins</p>
    `;
    discountElement.style.display = 'block';

    // Store for order processing
    window.coinsToRedeem = maxRedeemable;
  }

  // Remove discount
  removeDiscount() {
    const discountElement = document.getElementById('coins-discount');
    if (discountElement) {
      discountElement.style.display = 'none';
    }
    window.coinsToRedeem = 0;
  }

  // Get current cart total
  getCartTotal() {
    // Try multiple selectors for cart total
    const selectors = [
      '[data-cart-total]',
      '.cart-total',
      '.total-price',
      '#cart-total',
      '.subtotal'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.innerText;
        const amount = Math.round(parseFloat(text.replace(/[^0-9.]/g, '')) * 100) / 100;
        if (!isNaN(amount)) {
          return amount;
        }
      }
    }
    
    return 0;
  }

  // Get transaction history
  async getTransactionHistory() {
    const walletData = await this.getWalletBalance();
    return walletData ? walletData.transaction_history || [] : [];
  }
}

// Initialize wallet manager
document.addEventListener('DOMContentLoaded', function() {
  window.walletManager = new WalletManager();
  
  // Display balance if on main pages
  if (document.getElementById('coin-balance')) {
    window.walletManager.displayBalance();
  }
  
  // Setup checkout if on checkout page
  if (document.getElementById('use-coins')) {
    window.walletManager.setupCheckoutIntegration();
  }
});

// Auto-refresh balance every 30 seconds
setInterval(() => {
  if (document.getElementById('coin-balance') && window.walletManager) {
    window.walletManager.displayBalance();
  }
}, 30000);