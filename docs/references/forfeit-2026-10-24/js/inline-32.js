
    (function() {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // Disable on touch / mobile devices - the JS smooth-scroll fights iOS
      // momentum scrolling and produces a jumpy "couple-pixel" wobble inside
      // the dark Introducing Overlord section. Desktop only.
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
      if (window.innerWidth < 900) return;
      var wrap = document.querySelector('.section-wrapper');
      if (!wrap) return;

      var didSnap = false;
      var lastY = window.scrollY;
      var idleTimer = null;

      function maybeSnap() {
        var r = wrap.getBoundingClientRect();
        var vh = window.innerHeight;
        var y = window.scrollY;
        var goingDown = y >= lastY;
        lastY = y;

        if (didSnap) {
          // Reset once user has clearly scrolled away in either direction.
          if (r.top > vh * 0.6 || r.bottom < 0) didSnap = false;
          return;
        }
        if (!goingDown) return;
        // Trigger zone: section top is between 0 and 22% of viewport from top.
        if (r.top > 0 && r.top < vh * 0.22) {
          didSnap = true;
          window.scrollTo({ top: y + r.top, behavior: 'smooth' });
        }
      }

      window.addEventListener('scroll', function() {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(maybeSnap, 120);
      }, { passive: true });
    })();
    