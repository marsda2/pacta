
    (function () {
      var section = document.querySelector('.section-wrapper');
      var topEl = document.getElementById('darknessFadeTop');
      if (!section || !topEl) return;
      if (window.matchMedia('(max-width: 992px), (pointer: coarse)').matches) return;
      // On mobile, lock the overlay to 100vh once and only animate opacity.
      // Resizing height + opacity together on every scroll frame fought iOS
      // Safari's URL-bar collapse and produced the jarring stutter.
      var isMobile = window.innerWidth < 900;
      if (isMobile) {
        topEl.style.height = '100vh';
      }
      function setPanel(h, op) {
        if (!isMobile) topEl.style.height = h + 'px';
        topEl.style.opacity = op.toFixed(3);
      }
      function update() {
        var rect = section.getBoundingClientRect();
        var vh = window.innerHeight;
        // Shorter fade window on mobile so the transition completes quickly
        // instead of stretching across the whole approach.
        var fadeDist = isMobile ? vh * 0.4 : vh * 0.85;
        var overlap = 120;
        if (rect.top > vh) {
          setPanel(vh, Math.max(0, Math.min(1, 1 - (rect.top - vh) / fadeDist)));
        } else if (rect.top > -overlap) {
          setPanel(rect.top + overlap, 1);
        } else {
          setPanel(0, 0);
        }
      }
      var ticking = false;
      function schedule() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { ticking = false; update(); });
      }
      update();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
    })();
    