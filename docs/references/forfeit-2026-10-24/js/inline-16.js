
          (function () {
            var card = document.querySelector('[data-apsl]');
            if (!card) return;
            var STOPS = [
              'Accept everything.',
              'Accept anything with an explanation.',
              'Accept with photo proof.',
              'No appeals allowed.',
              'Whatever you want.'
            ];
            var quoteEl = card.querySelector('[data-apsl-quote]');
            var fillEl  = card.querySelector('[data-apsl-fill]');
            var thumbEl = card.querySelector('[data-apsl-thumb]');
            var dots    = Array.prototype.slice.call(card.querySelectorAll('[data-apsl-dot]'));
            var idx = 0;
            var timer = null;
            var inView = true;
            var DUR = 3200;

            function apply(i, animate) {
              var text = STOPS[i];
              var pct = (i / (STOPS.length - 1)) * 100;
              function setText() {
                quoteEl.textContent = text;
              }
              if (animate) {
                card.classList.add('is-swap');
                setTimeout(function () {
                  setText();
                  requestAnimationFrame(function () { card.classList.remove('is-swap'); });
                }, 200);
              } else {
                setText();
              }
              if (thumbEl) thumbEl.style.left = pct + '%';
              if (fillEl)  fillEl.style.width = pct + '%';
              dots.forEach(function (d, di) { d.classList.toggle('is-passed', di <= i); });
            }

            function tick() {
              idx = (idx + 1) % STOPS.length;
              apply(idx, true);
            }
            function start() { stop(); if (inView) timer = setInterval(tick, DUR); }
            function stop()  { if (timer) { clearInterval(timer); timer = null; } }

            apply(0, false);

            if ('IntersectionObserver' in window) {
              var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                  inView = e.isIntersecting;
                  if (inView) start(); else stop();
                });
              }, { threshold: 0.05, rootMargin: '0px 0px -10% 0px' });
              io.observe(card);
            } else { start(); }

            dots.forEach(function (d) {
              d.addEventListener('click', function () {
                idx = parseInt(d.getAttribute('data-i'), 10) || 0;
                apply(idx, true);
                start();
              });
            });
          })();
          