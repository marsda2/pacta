
            (function(){
                var root = document.getElementById('flxv-ov-cycle');
                if (!root) return;
                var msgs = root.querySelectorAll('.flxv-ov-cycle-msg');
                if (!msgs.length) return;
                var i = 0, timer = null, inView = false;
                function show(n) {
                    msgs.forEach(function(m, idx) { m.classList.toggle('active', idx === n); });
                }
                function tick() { i = (i + 1) % msgs.length; show(i); }
                function start() { if (!timer && inView) timer = setInterval(tick, 3200); }
                function stop() { if (timer) { clearInterval(timer); timer = null; } }
                if ('IntersectionObserver' in window) {
                    new IntersectionObserver(function(entries) {
                        entries.forEach(function(e) {
                            inView = e.isIntersecting;
                            if (inView) start(); else stop();
                        });
                    }, { threshold: 0.25 }).observe(root);
                } else { inView = true; start(); }
            })();
            