
    // Toggle dark navbar while the dark "Introducing Overlord" section is in view.
    (function(){
      const topbar = document.querySelector('.ol-topbar');
      const darkSection = document.querySelector('.section-wrapper');
      if (!topbar || !darkSection) return;
      function check() {
        const rect = darkSection.getBoundingClientRect();
        const navHeight = topbar.getBoundingClientRect().height || 0;
        // Only flip dark once the section has scrolled fully under the nav -
        // i.e. its top is at/above viewport top AND its bottom is still below
        // the nav's bottom. Avoids triggering at the boundary moments.
        const overlaps = rect.top <= 0 && rect.bottom >= navHeight;
        topbar.classList.toggle('is-dark', overlaps);
      }
      check();
      window.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', check);
    })();
    