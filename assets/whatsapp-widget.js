(function() {
  'use strict';

  let whatsappInitialized = false;

  function initWhatsApp() {
    if (whatsappInitialized) return;
    whatsappInitialized = true;

    const widget = document.getElementById('whatsapp-widget');
    const button = document.getElementById('whatsapp-button');
    const popup = document.getElementById('whatsapp-popup');
    const chatBtn = document.getElementById('chat-btn');
    const greetingMessage = document.getElementById('greeting-message');
    const questionBtns = document.querySelectorAll('.question-btn');
    const statusText = document.getElementById('status');
    const closeBtn = document.getElementById('close-popup');

    const phoneNumber = '919220900257';

    function getGreeting() {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'Good morning! ☀️';
      if (hour >= 12 && hour < 17) return 'Good afternoon! 👋';
      return 'Good evening! 🌙';
    }

    function setStatus() {
      widget.style.display = 'block';
      statusText.textContent = "Online now";
    }

    greetingMessage.innerHTML = `${getGreeting()} Welcome to Anveshan Customer Support. Please click on the below button to connect with our team`;
    setStatus();

    button.addEventListener('click', function () {
      popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
    });

    closeBtn.addEventListener('click', function () {
      popup.style.display = 'none';
    });

    questionBtns.forEach((btn) => {
      btn.addEventListener('click', function () {
        chatBtn.click();
      });
    });

    chatBtn.addEventListener('click', function () {
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    });

    document.addEventListener('click', function(e) {
      if (!widget.contains(e.target)) {
        popup.style.display = 'none';
      }
    });
  }

  window.addEventListener('load', () => {
    setTimeout(initWhatsApp, 2000);

    let scrollTriggered = false;
    const handleScroll = () => {
      if (scrollTriggered) return;

      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 30) {
        scrollTriggered = true;
        initWhatsApp();
        window.removeEventListener('scroll', handleScroll);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    document.addEventListener('click', initWhatsApp, { once: true });
  });
})();
