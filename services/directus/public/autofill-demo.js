// Auto-fill demo credentials on login page
(function() {
  // Check if we're on the login page
  if (window.location.pathname.includes('/login')) {
    // Wait for DOM to be ready
    const checkAndFill = () => {
      const emailInput = document.querySelector('input[type="email"]');
      const passwordInput = document.querySelector('input[type="password"]');

      if (emailInput && passwordInput) {
        // Only fill if fields are empty
        if (!emailInput.value && !passwordInput.value) {
          emailInput.value = 'demo@synthstack.app';
          passwordInput.value = 'DemoUser2024!';

          // Trigger input events for Vue reactivity
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    // Try immediately and after delay
    checkAndFill();
    setTimeout(checkAndFill, 500);
    setTimeout(checkAndFill, 1000);
  }
})();
