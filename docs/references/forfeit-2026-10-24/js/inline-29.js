
    // Testimonial stats: per-digit slot-machine reel animation on scroll-in.
    // Each digit becomes a vertical strip 0->9 repeated N times, then transform:
    // translateY slides it to land on the final digit. Leftmost digit stops first,
    // each next digit spins a bit longer for that satisfying lock-in cascade.
    (function(){
      const stats = document.querySelectorAll('#tg-stats .tg-stat-num[data-final]');
      if (!stats.length) return;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function setupStat(el) {
        const final = el.dataset.final;
        if (!final) return null;
        el.textContent = '';
        const reels = [];
        let digitIndex = 0;
        for (const ch of final) {
          if (/\d/.test(ch)) {
            const target = parseInt(ch, 10);
            // More spins for digits further right = staggered landing left -> right.
            const spins = 3 + digitIndex;
            const totalSteps = spins * 10 + target;
            const reel = document.createElement('span');
            reel.className = 'reel';
            const track = document.createElement('span');
            track.className = 'reel-track';
            for (let i = 0; i <= totalSteps; i++) {
              const d = document.createElement('span');
              d.className = 'reel-digit';
              d.textContent = String(i % 10);
              track.appendChild(d);
            }
            reel.appendChild(track);
            el.appendChild(reel);
            reels.push({ track, totalSteps, duration: 2400 + digitIndex * 350 });
            digitIndex++;
          } else {
            const s = document.createElement('span');
            s.className = 'reel-static';
            s.textContent = ch;
            el.appendChild(s);
          }
        }
        return reels;
      }

      function spin(reels) {
        reels.forEach(r => {
          // Force a frame so the transition picks up the change from translateY(0).
          r.track.style.transition = 'none';
          r.track.style.transform = 'translateY(0)';
          // eslint-disable-next-line no-unused-expressions
          r.track.offsetHeight;
          r.track.style.transition = `transform ${r.duration}ms cubic-bezier(.16, .68, .12, 1)`;
          r.track.style.transform = `translateY(-${r.totalSteps}em)`;
        });
      }

      if (reduceMotion) {
        stats.forEach(el => { el.textContent = el.dataset.final; });
        return;
      }

      const map = new Map();
      stats.forEach(el => {
        const reels = setupStat(el);
        if (reels) map.set(el, reels);
      });

      const seen = new WeakSet();
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (seen.has(el)) return;
          seen.add(el);
          const reels = map.get(el);
          if (reels) setTimeout(() => spin(reels), 80);
          io.unobserve(el);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
      stats.forEach(el => io.observe(el));
    })();
    