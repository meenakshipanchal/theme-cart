class AnveshanCoinsShiprocket {
  constructor() {
    this.USER_API = 'https://puritycoins.anveshan.farm/api/v1/user';

    this.userPhone = null;
    this.currentBalance = 0;
    this.maxRedeemable = 0;
    this.appliedCoins = 0;
    this.isLoading = false;
    this.isNewUser = false;
    this.userData = {};

    this.init();
  }

  async init() {
    console.log('🪙 Anveshan Coins: Shiprocket Integration Starting...');
    this.waitForShiprocket();
  }

  waitForShiprocket() {
    const checkShiprocket = () => {
      if (window.shiprocketCheckoutEvents || document.querySelector('.shiprocket-headless')) {
        console.log('✅ Shiprocket detected, initializing coins...');
        this.setup();
      } else {
        setTimeout(checkShiprocket, 500);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkShiprocket);
    } else {
      checkShiprocket();
    }
  }

  async setup() {
    this.userPhone = await this.getUserPhone();

    if (this.userPhone) {
      console.log('📱 Phone detected:', this.userPhone);
      await this.handleUserLogin();
      this.addCoinsWidget();
      this.hookShiprocketCheckoutSafely();
      this.setupEventListeners();
    } else {
      console.log('❌ No phone found');
      this.addPhonePromptWidget();
    }
  }

  hookShiprocketCheckoutSafely() {
    const checkoutButton = document.querySelector('.sr-headless-checkout');

    if (!checkoutButton) {
      console.log('⚠️ Shiprocket checkout button not found');
      return;
    }

    console.log('🔗 Hooking into Shiprocket checkout button...');

    checkoutButton.addEventListener('click', async (e) => {
      console.log('🚀 Checkout button clicked');

      if (this.appliedCoins > 0) {
        console.log(`⚠️ ${this.appliedCoins} coins already applied in cart widget`);

        const shouldClearCoins = confirm(
          `You have ${this.appliedCoins} coins applied in cart.\n\n` +
          `These will be cleared and you can apply coins again in checkout.\n\n` +
          `Continue?`
        );

        if (!shouldClearCoins) {
          e.preventDefault();
          e.stopPropagation();
          console.log('❌ User cancelled checkout');
          return false;
        }

        console.log('🧹 Clearing cart coins...');
        await this.clearCartCoins();
        this.appliedCoins = 0;
        this.resetCoinsUI();
      }

      console.log('✅ Proceeding to Shiprocket checkout');
    }, true);
  }

  async clearCartCoins() {
    try {
      await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributes: {
            'anveshan_coins_used': '',
            'anveshan_discount_amount': '',
            'anveshan_redemption_order_id': '',
            'anveshan_user_phone': this.userPhone
          }
        })
      });
      console.log('✅ Cart coins cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear cart coins:', error);
    }
  }

  async getUserPhone() {
    if (window.customer?.phone) {
      return this.cleanPhone(window.customer.phone);
    }

    if (window.cart?.attributes) {
      const phoneFromCart = window.cart.attributes.phone || window.cart.attributes.customer_phone;
      if (phoneFromCart) return this.cleanPhone(phoneFromCart);
    }

    const savedPhone = localStorage.getItem('anveshan_user_phone');
    if (savedPhone) return savedPhone;

    const phoneInputs = document.querySelectorAll('input[type="tel"], input[name*="phone"], input[id*="phone"]');
    for (let input of phoneInputs) {
      if (input.value && input.value.length >= 10) {
        return this.cleanPhone(input.value);
      }
    }

    return null;
  }

  cleanPhone(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = '+91' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('+') && cleaned.length >= 10) cleaned = '+91' + cleaned.slice(-10);

    return cleaned;
  }

  async handleUserLogin() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const response = await fetch(`${this.USER_API}/get-wallet/${this.userPhone}`);
      const data = await response.json();

      console.log('🔍 User Balance Check:', data);

      if (data.success && data.currentBalance !== undefined) {
        this.isNewUser = false;
        this.currentBalance = data.currentBalance;
        this.userData = data.userData || {};
        console.log('👤 Existing User Balance:', this.currentBalance);
      } else {
        this.isNewUser = true;
        await this.creditSignupBonus();
      }

      this.maxRedeemable = Math.floor(this.currentBalance * 0.25);
      this.updateBalanceDisplay();

    } catch (error) {
      console.error('❌ User login processing failed:', error);
      this.currentBalance = 0;
      this.maxRedeemable = 0;
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  async creditSignupBonus() {
    try {
      const signupBonus = 100;

      const response = await fetch(`${this.USER_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: this.userPhone
        })
      });

      const data = await response.json();

      if (data.success) {
        this.currentBalance = data.newBalance || signupBonus;
        console.log('🎉 New User Signup Bonus Credited:', this.currentBalance);
        this.showWelcomeMessage(this.currentBalance);
      }

    } catch (error) {
      console.error('❌ Failed to credit signup bonus:', error);
      this.currentBalance = 0;
    }
  }

  addPhonePromptWidget() {
    const shiprocketContainer = document.querySelector('.shiprocket-headless');
    if (!shiprocketContainer) return;

    const phonePrompt = document.createElement('div');
    phonePrompt.id = 'anveshan-phone-prompt';
    phonePrompt.style.cssText = `
      background: linear-gradient(135deg, #fff3cd, #ffeaa7);
      border: 2px solid #f39c12;
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 15px;
      text-align: center;
    `;

    phonePrompt.innerHTML = `
      <div style="margin-bottom: 10px;">
        <span style="font-size: 24px;">🪙</span>
        <strong style="color: #d68910; margin-left: 8px;">Get ₹100 Free Coins!</strong>
      </div>
      <input type="tel" id="anveshan-phone-input" placeholder="+91 XXXXX XXXXX"
             style="width: 100%; max-width: 250px; padding: 10px; border: 2px solid #f39c12; border-radius: 6px; margin-bottom: 10px;">
      <br>
      <button onclick="window.anveshanCoins.submitPhone()"
              style="background: #f39c12; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-weight: 500;">
        Check Balance & Get Bonus
      </button>
    `;

    shiprocketContainer.parentNode.insertBefore(phonePrompt, shiprocketContainer);
  }

  async submitPhone() {
    const phoneInput = document.getElementById('anveshan-phone-input');
    const phone = this.cleanPhone(phoneInput.value);

    if (!phone || phone.length < 12) {
      alert('Please enter a valid phone number');
      return;
    }

    this.userPhone = phone;
    localStorage.setItem('anveshan_user_phone', phone);

    const phonePrompt = document.getElementById('anveshan-phone-prompt');
    if (phonePrompt) phonePrompt.remove();

    await this.handleUserLogin();
    this.addCoinsWidget();
    this.hookShiprocketCheckoutSafely();
    this.setupEventListeners();
  }

  addCoinsWidget() {
    const shiprocketContainer = document.querySelector('.shiprocket-headless');
    if (!shiprocketContainer || document.getElementById('anveshan-coins-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'anveshan-coins-widget';
    widget.style.cssText = `
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      border: 2px solid #235A49;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 15px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    widget.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <span style="font-size: 24px; margin-right: 10px;">🪙</span>
        <h3 style="margin: 0; color: #235A49; font-size: 18px;">Anveshan Coins</h3>
      </div>

      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 13px;">
        <strong>💡 Note:</strong> You can apply coins on the checkout page
      </div>

      <div class="balance-section" style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #235A49;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #666;">Current Balance:</span>
          <span class="current-balance" style="font-weight: 600; color: #235A49; font-size: 16px;">₹0</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #666; font-size: 14px;">Available to Use (25%):</span>
          <span class="max-redeemable" style="font-weight: 500; color: #28a745; font-size: 14px;">₹0</span>
        </div>
      </div>

      <div class="coins-loading" style="display: none; text-align: center; padding: 20px;">
        <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #235A49; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin: 10px 0 0 0; color: #666;">Loading...</p>
      </div>

      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    shiprocketContainer.parentNode.insertBefore(widget, shiprocketContainer);
  }

  setupEventListeners() {
    // Keep for future use if needed
  }

  updateBalanceDisplay() {
    const balanceEl = document.querySelector('.current-balance');
    const maxRedeemableEl = document.querySelector('.max-redeemable');

    if (balanceEl) balanceEl.textContent = `₹${this.currentBalance}`;
    if (maxRedeemableEl) maxRedeemableEl.textContent = `₹${this.maxRedeemable}`;
  }

  showLoading() {
    const loading = document.querySelector('.coins-loading');
    if (loading) loading.style.display = 'block';
  }

  hideLoading() {
    const loading = document.querySelector('.coins-loading');
    if (loading) loading.style.display = 'none';
  }

  showWelcomeMessage(bonus) {
    const welcome = document.createElement('div');
    welcome.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #235A49, #2d6e5b);
      color: white;
      padding: 30px;
      border-radius: 15px;
      z-index: 10001;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      max-width: 400px;
      width: 90%;
    `;

    welcome.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
      <h3 style="margin: 0 0 10px 0; font-size: 24px;">Welcome to Anveshan!</h3>
      <p style="margin: 0 0 20px 0; font-size: 16px; opacity: 0.9;">You've received ₹${bonus} Free Coins!</p>
      <button onclick="this.parentElement.remove()" style="background: white; color: #235A49; border: none; padding: 12px 24px; border-radius: 25px; font-weight: 600; cursor: pointer;">Start Shopping</button>
    `;

    document.body.appendChild(welcome);

    setTimeout(() => {
      if (document.body.contains(welcome)) {
        document.body.removeChild(welcome);
      }
    }, 5000);
  }

  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 500;
      box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);
      max-width: 350px;
      word-wrap: break-word;
    `;
    successDiv.textContent = message;

    document.body.appendChild(successDiv);

    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 4000);
  }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Starting Anveshan Coins for Shiprocket...');
  window.anveshanCoins = new AnveshanCoinsShiprocket();
});

if (document.readyState !== 'loading') {
  console.log('🚀 Starting Anveshan Coins for Shiprocket (immediate)...');
  window.anveshanCoins = new AnveshanCoinsShiprocket();
}
// // Enhanced Anveshan Coins for Shiprocket Headless Checkout
// class AnveshanCoinsShiprocket {
//   constructor() {
//     this.API_BASE = 'https://puritycoins.anveshan.farm/api/v1/shiprocket';

//     this.userPhone = null;
//     this.currentBalance = 0;
//     this.maxRedeemable = 0;
//     this.appliedCoins = 0;
//     this.isLoading = false;
//     this.isNewUser = false;
//     this.userData = {};
    
//     this.init();
//   }

//   async init() {
//     console.log('🪙 Anveshan Coins: Shiprocket Integration Starting...');
    
//     // Wait for Shiprocket to load
//     this.waitForShiprocket();
//   }

//   waitForShiprocket() {
//     const checkShiprocket = () => {
//       if (window.shiprocketCheckoutEvents || document.querySelector('.shiprocket-headless')) {
//         console.log('✅ Shiprocket detected, initializing coins...');
//         this.setup();
//       } else {
//         setTimeout(checkShiprocket, 500);
//       }
//     };
    
//     if (document.readyState === 'loading') {
//       document.addEventListener('DOMContentLoaded', checkShiprocket);
//     } else {
//       checkShiprocket();
//     }
//   }

//   async setup() {
//     // Get user phone from multiple sources
//     this.userPhone = await this.getUserPhone();
    
//     if (this.userPhone) {
//       console.log('📱 Phone detected:', this.userPhone);
      
//       // Handle user login and check for bonus
//       await this.handleUserLogin();
      
//       // Add coins widget before Shiprocket checkout button
//       this.addCoinsWidget();
      
//       // Hook into Shiprocket checkout process
//       this.hookShiprocketCheckout();
      
//       // Setup event listeners
//       this.setupEventListeners();
//     } else {
//       console.log('❌ No phone found, will prompt during checkout');
//       this.addPhonePromptWidget();
//     }
//   }

//   async getUserPhone() {
//     // Method 1: From Shopify customer
//     if (window.customer && window.customer.phone) {
//       return this.cleanPhone(window.customer.phone);
//     }

//     // Method 2: From cart data
//     if (window.cart && window.cart.attributes) {
//       const phoneFromCart = window.cart.attributes.phone || window.cart.attributes.customer_phone;
//       if (phoneFromCart) return this.cleanPhone(phoneFromCart);
//     }

//     // Method 3: From localStorage
//     const savedPhone = localStorage.getItem('anveshan_user_phone');
//     if (savedPhone) {
//       return savedPhone;
//     }

//     // Method 4: From form inputs
//     const phoneInputs = document.querySelectorAll('input[type="tel"], input[name*="phone"], input[id*="phone"]');
//     for (let input of phoneInputs) {
//       if (input.value && input.value.length >= 10) {
//         return this.cleanPhone(input.value);
//       }
//     }

//     return null;
//   }

//   cleanPhone(phone) {
//     if (!phone) return null;
//     let cleaned = phone.replace(/\D/g, '');
    
//     if (cleaned.length === 10) {
//       cleaned = '91' + cleaned;
//     }
    
//     return cleaned;
//   }

//   async handleUserLogin() {
//     if (this.isLoading) return;
    
//     this.isLoading = true;
//     this.showLoading();
    
//     try {
//       const response = await fetch(`${this.API_BASE}/coins/balance/${this.userPhone}`);
//       const data = await response.json();
      
//       console.log('🔍 User Balance Check:', data);
      
//       if (data.success && data.currentBalance !== undefined) {
//         // Existing user
//         this.isNewUser = false;
//         this.currentBalance = data.currentBalance;
//         this.userData = data.userData || {};
        
//         console.log('👤 Existing User Balance:', this.currentBalance);
        
//       } else {
//         // New user - credit signup bonus
//         this.isNewUser = true;
//         await this.creditSignupBonus();
//       }
      
//       this.maxRedeemable = Math.floor(this.currentBalance * 0.25);
//       this.updateBalanceDisplay();
      
//     } catch (error) {
//       console.error('❌ User login processing failed:', error);
//       this.currentBalance = 0;
//       this.maxRedeemable = 0;
//     } finally {
//       this.isLoading = false;
//       this.hideLoading();
//     }
//   }

//   async creditSignupBonus() {
//     try {
//       const signupBonus = 100;
      
//       const response = await fetch(`${this.API_BASE}/coins/signup-bonus`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           phone: this.userPhone,
//           bonusAmount: signupBonus,
//           userType: 'new_signup'
//         })
//       });
      
//       const data = await response.json();
      
//       if (data.success) {
//         this.currentBalance = signupBonus;
//         console.log('🎉 New User Signup Bonus Credited:', signupBonus);
//         this.showWelcomeMessage(signupBonus);
//       }
      
//     } catch (error) {
//       console.error('❌ Failed to credit signup bonus:', error);
//       this.currentBalance = 0;
//     }
//   }

//   addPhonePromptWidget() {
//     const shiprocketContainer = document.querySelector('.shiprocket-headless');
//     if (!shiprocketContainer) return;

//     const phonePrompt = document.createElement('div');
//     phonePrompt.id = 'anveshan-phone-prompt';
//     phonePrompt.style.cssText = `
//       background: linear-gradient(135deg, #fff3cd, #ffeaa7);
//       border: 2px solid #f39c12;
//       border-radius: 12px;
//       padding: 15px;
//       margin-bottom: 15px;
//       text-align: center;
//     `;
    
//     phonePrompt.innerHTML = `
//       <div style="margin-bottom: 10px;">
//         <span style="font-size: 24px;">🪙</span>
//         <strong style="color: #d68910; margin-left: 8px;">Get ₹100 Free Coins!</strong>
//       </div>
//       <input type="tel" id="anveshan-phone-input" placeholder="+91 XXXXX XXXXX" 
//              style="width: 100%; max-width: 250px; padding: 10px; border: 2px solid #f39c12; border-radius: 6px; margin-bottom: 10px;">
//       <br>
//       <button onclick="window.anveshanCoins.submitPhone()" 
//               style="background: #f39c12; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-weight: 500;">
//         Check Balance & Get Bonus
//       </button>
//     `;
    
//     shiprocketContainer.parentNode.insertBefore(phonePrompt, shiprocketContainer);
//   }

//   async submitPhone() {
//     const phoneInput = document.getElementById('anveshan-phone-input');
//     const phone = this.cleanPhone(phoneInput.value);
    
//     if (!phone || phone.length < 10) {
//       alert('Please enter a valid phone number');
//       return;
//     }
    
//     this.userPhone = phone;
//     localStorage.setItem('anveshan_user_phone', phone);
    
//     // Remove phone prompt and show coins widget
//     const phonePrompt = document.getElementById('anveshan-phone-prompt');
//     if (phonePrompt) phonePrompt.remove();
    
//     await this.handleUserLogin();
//     this.addCoinsWidget();
//     this.hookShiprocketCheckout();
//     this.setupEventListeners();
//   }

//   addCoinsWidget() {
//     const shiprocketContainer = document.querySelector('.shiprocket-headless');
//     if (!shiprocketContainer || document.getElementById('anveshan-coins-widget')) return;

//     const widget = document.createElement('div');
//     widget.id = 'anveshan-coins-widget';
//     widget.style.cssText = `
//       background: linear-gradient(135deg, #f8f9fa, #e9ecef);
//       border: 2px solid #235A49;
//       border-radius: 12px;
//       padding: 20px;
//       margin-bottom: 15px;
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//     `;
    
//     widget.innerHTML = `
//       <div style="display: flex; align-items: center; margin-bottom: 15px;">
//         <span style="font-size: 24px; margin-right: 10px;">🪙</span>
//         <h3 style="margin: 0; color: #235A49; font-size: 18px;">Anveshan Coins</h3>
//       </div>
      
//       <!-- Balance Display -->
//       <div class="balance-section" style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #235A49;">
//         <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
//           <span style="color: #666;">Current Balance:</span>
//           <span class="current-balance" style="font-weight: 600; color: #235A49; font-size: 16px;">0</span>
//         </div>
//         <div style="display: flex; justify-content: space-between;">
//           <span style="color: #666; font-size: 14px;">Available to Use (25%):</span>
//           <span class="max-redeemable" style="font-weight: 500; color: #28a745; font-size: 14px;">0</span>
//         </div>
//       </div>
      
//       <!-- Coins Usage Section -->
//       <div class="coins-input-section" style="display: none;">
//         <div style="margin-bottom: 15px;">
//           <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">Coins to Use:</label>
//           <input type="number" id="coins-to-redeem" min="0" max="0" value="0" 
//                  style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; box-sizing: border-box;">
//         </div>
        
//         <div style="display: flex; gap: 10px;">
//           <button id="apply-coins-btn" style="flex: 1; background: #235A49; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 500;">
//             Apply Coins
//           </button>
//           <button id="remove-coins-btn" style="flex: 1; background: #dc3545; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 500; display: none;">
//             Remove Coins
//           </button>
//         </div>
//       </div>
      
//       <!-- Applied Discount Display -->
//       <div class="coins-discount" style="display: none; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 12px; margin-top: 15px;">
//         <div style="display: flex; justify-content: space-between; align-items: center;">
//           <span style="color: #155724; font-weight: 500;">Coins Applied:</span>
//           <span id="coins-discount-amount" style="color: #155724; font-weight: 600;">0</span>
//         </div>
//       </div>
      
//       <!-- Loading State -->
//       <div class="coins-loading" style="display: none; text-align: center; padding: 20px;">
//         <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #235A49; border-radius: 50%; animation: spin 1s linear infinite;"></div>
//         <p style="margin: 10px 0 0 0; color: #666;">Processing...</p>
//       </div>
      
//       <style>
//         @keyframes spin {
//           0% { transform: rotate(0deg); }
//           100% { transform: rotate(360deg); }
//         }
//       </style>
//     `;
    
//     shiprocketContainer.parentNode.insertBefore(widget, shiprocketContainer);
//   }

//   hookShiprocketCheckout() {
//     // Override Shiprocket's buyCart function
//     const originalShiprocketEvents = window.shiprocketCheckoutEvents;
    
//     if (originalShiprocketEvents && originalShiprocketEvents.buyCart) {
//       const originalBuyCart = originalShiprocketEvents.buyCart.bind(originalShiprocketEvents);
      
//       window.shiprocketCheckoutEvents.buyCart = async (event) => {
//         console.log('🚀 Shiprocket checkout intercepted');
        
//         // Check if coins are applied
//         if (this.appliedCoins > 0) {
//           try {
//             // First redeem coins in our system
//             await this.processCoinsRedemption();
            
//             // Then proceed with Shiprocket checkout
//             return originalBuyCart(event);
            
//           } catch (error) {
//             console.error('❌ Coins redemption failed:', error);
//             alert('Failed to apply coins. Please try again.');
//             return;
//           }
//         } else {
//           // No coins applied, proceed normally
//           return originalBuyCart(event);
//         }
//       };
//     }
    
//     // Also hook into the button click directly
//     const checkoutButton = document.querySelector('.sr-headless-checkout');
//     if (checkoutButton) {
//       checkoutButton.addEventListener('click', async (e) => {
//         if (this.appliedCoins > 0) {
//           e.preventDefault();
//           e.stopPropagation();
          
//           try {
//             await this.processCoinsRedemption();
            
//             // Manually trigger Shiprocket checkout after coins are processed
//             setTimeout(() => {
//               if (window.shiprocketCheckoutEvents && window.shiprocketCheckoutEvents.buyCart) {
//                 window.shiprocketCheckoutEvents.buyCart(e);
//               }
//             }, 500);
            
//           } catch (error) {
//             console.error('❌ Checkout process failed:', error);
//             alert('Failed to process coins. Please try again.');
//           }
//         }
//       }, true);
//     }
//   }

//   async processCoinsRedemption() {
//     if (!this.appliedCoins || this.appliedCoins <= 0) return;
    
//     console.log('💰 Processing coins redemption:', this.appliedCoins);
    
//     const orderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//     const cartTotal = this.getCartTotal();
    
//     const response = await fetch(`${this.API_BASE}/coins/redeem/${this.userPhone}`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         orderId: orderId,
//         totalAmount: cartTotal,
//         coinsToRedeem: this.appliedCoins
//       })
//     });
    
//     const result = await response.json();
    
//     if (!result.success) {
//       throw new Error(result.message || 'Failed to redeem coins');
//     }
    
//     // Update cart attributes for Shiprocket
//     await this.updateCartWithCoinsData(orderId);
    
//     console.log('✅ Coins redeemed successfully');
//     return result;
//   }

//   getCartTotal() {
//     // Try to get cart total from various sources
//     if (window.cart && window.cart.total_price) {
//       return Math.round(window.cart.total_price) / 100; // Convert from cents with proper rounding
//     }
    
//     // Fallback: try to parse from DOM
//     const priceElements = document.querySelectorAll('[data-cart-total], .cart-total, .total-price');
//     for (let element of priceElements) {
//       const priceText = element.textContent || element.innerHTML;
//       const price = Math.round(parseFloat(priceText.replace(/[^0-9.]/g, '')) * 100) / 100;
//       if (price > 0) return price;
//     }
    
//     return 1000; // Fallback amount
//   }

//   async updateCartWithCoinsData(orderId) {
//     try {
//       const cartData = {
//         attributes: {
//           'anveshan_coins_used': this.appliedCoins.toString(),
//           'anveshan_user_phone': this.userPhone,
//           'anveshan_discount_amount': this.appliedCoins.toString(),
//           'anveshan_redemption_order_id': orderId,
//           'anveshan_user_balance_before': this.currentBalance.toString()
//         }
//       };

//       await fetch('/cart/update.js', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(cartData)
//       });
      
//       console.log('✅ Cart updated with coins data');
//     } catch (error) {
//       console.error('❌ Failed to update cart:', error);
//     }
//   }

//   setupEventListeners() {
//     setTimeout(() => {
//       const applyBtn = document.getElementById('apply-coins-btn');
//       const removeBtn = document.getElementById('remove-coins-btn');
//       const coinsInput = document.getElementById('coins-to-redeem');

//       if (applyBtn) {
//         applyBtn.addEventListener('click', () => this.applyCoins());
//       }

//       if (removeBtn) {
//         removeBtn.addEventListener('click', () => this.removeCoins());
//       }

//       if (coinsInput) {
//         coinsInput.addEventListener('input', (e) => {
//           const value = parseInt(e.target.value) || 0;
//           if (value > this.maxRedeemable) {
//             e.target.value = this.maxRedeemable;
//           }
//           if (value < 0) {
//             e.target.value = 0;
//           }
//         });
//       }
//     }, 500);
//   }

//   async applyCoins() {
//     const coinsInput = document.getElementById('coins-to-redeem');
//     const coinsToRedeem = parseInt(coinsInput.value) || 0;

//     if (coinsToRedeem <= 0) {
//       alert('Please enter a valid coin amount');
//       return;
//     }

//     if (coinsToRedeem > this.maxRedeemable) {
//       alert(`You can only use up to ${this.maxRedeemable} coins (25% of your balance)`);
//       return;
//     }

//     this.appliedCoins = coinsToRedeem;
//     this.showAppliedDiscount(coinsToRedeem);
//     this.showSuccessMessage(`${coinsToRedeem} coins applied! ₹${coinsToRedeem} discount will be applied at checkout.`);
//   }

//   removeCoins() {
//     this.appliedCoins = 0;
//     this.resetCoinsUI();
//     this.showSuccessMessage('Coins removed successfully!');
//   }

//   showAppliedDiscount(amount) {
//     const discountSection = document.querySelector('.coins-discount');
//     const discountAmount = document.getElementById('coins-discount-amount');
//     const removeBtn = document.getElementById('remove-coins-btn');
//     const applyBtn = document.getElementById('apply-coins-btn');
//     const coinsInput = document.getElementById('coins-to-redeem');

//     if (discountSection) discountSection.style.display = 'block';
//     if (discountAmount) discountAmount.textContent = `${amount} coins (₹${amount})`;
//     if (removeBtn) removeBtn.style.display = 'inline-block';
//     if (applyBtn) applyBtn.style.display = 'none';
//     if (coinsInput) coinsInput.disabled = true;
//   }

//   resetCoinsUI() {
//     const discountSection = document.querySelector('.coins-discount');
//     const removeBtn = document.getElementById('remove-coins-btn');
//     const applyBtn = document.getElementById('apply-coins-btn');
//     const coinsInput = document.getElementById('coins-to-redeem');

//     if (discountSection) discountSection.style.display = 'none';
//     if (removeBtn) removeBtn.style.display = 'none';
//     if (applyBtn) applyBtn.style.display = 'inline-block';
//     if (coinsInput) {
//       coinsInput.disabled = false;
//       coinsInput.value = 0;
//     }
//   }

//   updateBalanceDisplay() {
//     const balanceEl = document.querySelector('.current-balance');
//     const maxRedeemableEl = document.querySelector('.max-redeemable');
//     const coinsInput = document.getElementById('coins-to-redeem');
//     const inputSection = document.querySelector('.coins-input-section');

//     if (balanceEl) balanceEl.textContent = this.currentBalance;
//     if (maxRedeemableEl) maxRedeemableEl.textContent = this.maxRedeemable;
    
//     if (coinsInput) {
//       coinsInput.max = this.maxRedeemable;
//       coinsInput.value = 0;
//     }

//     if (this.maxRedeemable > 0 && inputSection) {
//       inputSection.style.display = 'block';
//     }
//   }

//   showLoading() {
//     const loading = document.querySelector('.coins-loading');
//     if (loading) loading.style.display = 'block';
//   }

//   hideLoading() {
//     const loading = document.querySelector('.coins-loading');
//     if (loading) loading.style.display = 'none';
//   }

//   showWelcomeMessage(bonus) {
//     const welcome = document.createElement('div');
//     welcome.style.cssText = `
//       position: fixed;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       background: linear-gradient(135deg, #235A49, #2d6e5b);
//       color: white;
//       padding: 30px;
//       border-radius: 15px;
//       z-index: 10001;
//       text-align: center;
//       box-shadow: 0 20px 40px rgba(0,0,0,0.3);
//       max-width: 400px;
//       width: 90%;
//     `;
    
//     welcome.innerHTML = `
//       <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
//       <h3 style="margin: 0 0 10px 0; font-size: 24px;">Welcome to Anveshan!</h3>
//       <p style="margin: 0 0 20px 0; font-size: 16px; opacity: 0.9;">You've received ${bonus} Free Coins as a welcome bonus!</p>
//       <button onclick="this.parentElement.remove()" style="background: white; color: #235A49; border: none; padding: 12px 24px; border-radius: 25px; font-weight: 600; cursor: pointer;">Start Shopping</button>
//     `;
    
//     document.body.appendChild(welcome);
    
//     setTimeout(() => {
//       if (document.body.contains(welcome)) {
//         document.body.removeChild(welcome);
//       }
//     }, 5000);
//   }

//   showSuccessMessage(message) {
//     const successDiv = document.createElement('div');
//     successDiv.style.cssText = `
//       position: fixed;
//       top: 20px;
//       right: 20px;
//       background: #28a745;
//       color: white;
//       padding: 15px 20px;
//       border-radius: 8px;
//       z-index: 10000;
//       font-weight: 500;
//       box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);
//       max-width: 350px;
//       word-wrap: break-word;
//     `;
//     successDiv.textContent = message;
    
//     document.body.appendChild(successDiv);
    
//     setTimeout(() => {
//       if (document.body.contains(successDiv)) {
//         document.body.removeChild(successDiv);
//       }
//     }, 4000);
//   }
// }

// // Auto-initialize
// document.addEventListener('DOMContentLoaded', () => {
//   console.log('🚀 Starting Anveshan Coins for Shiprocket...');
//   window.anveshanCoins = new AnveshanCoinsShiprocket();
// });

// if (document.readyState !== 'loading') {
//   console.log('🚀 Starting Anveshan Coins for Shiprocket (immediate)...');
//   window.anveshanCoins = new AnveshanCoinsShiprocket();
// }
