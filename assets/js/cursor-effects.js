// Custom Cursor and Click Effects - Yeşil Çember + Normal Cursor
(function() {
  'use strict';

  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

  if (!isMobile) {
    // Desktop: Custom Cursor Ring
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.classList.add('active');
    });

    // Track mouse over iframe (for maps) - keep cursor visible
    let isOverIframe = false;
    
    document.addEventListener('mouseover', (e) => {
      if (e.target.tagName === 'IFRAME') {
        isOverIframe = true;
        cursor.classList.add('active');
      }
    });
    
    document.addEventListener('mouseout', (e) => {
      if (e.target.tagName === 'IFRAME') {
        isOverIframe = false;
      }
    });

    // Keep cursor position updating even over iframe
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    const originalMouseMove = document.addEventListener;
    document.addEventListener('mousemove', (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    // Fallback: update cursor position when mouse is over iframe
    setInterval(() => {
      if (isOverIframe) {
        cursor.classList.add('active');
      }
    }, 50);

    // Smooth cursor follow with slight delay
    function animateCursor() {
      const speed = 0.15; // Smooth follow
      cursorX += (mouseX - cursorX) * speed;
      cursorY += (mouseY - cursorY) * speed;
      
      cursor.style.left = cursorX + 'px';
      cursor.style.top = cursorY + 'px';
      
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      cursor.classList.remove('active');
    });

    document.addEventListener('mouseenter', () => {
      cursor.classList.add('active');
    });

    // Hover effect on interactive elements
    const interactiveElements = 'a, button, input[type="submit"], input[type="button"], .btn, .dropdown-item, .nav-link, .card, .service-option, .education-option, .service-card, .language-selector';
    
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveElements)) {
        cursor.classList.add('hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveElements)) {
        cursor.classList.remove('hover');
      }
    });

    // Click effect
    document.addEventListener('mousedown', () => {
      cursor.classList.add('click');
    });

    document.addEventListener('mouseup', () => {
      cursor.classList.remove('click');
    });

    // Click ripple effect
    document.addEventListener('click', (e) => {
      createRipple(e.clientX, e.clientY);
    });
  }

  // Create desktop click ripple
  function createRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.transform = 'translate(-50%, -50%)';
    
    document.body.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // Log initialization
  console.log('🎯 AgroAeroTech Cursor Effects Loaded');
})();
