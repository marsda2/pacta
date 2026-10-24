
            (function(){
                // Replay the staggered bento fade-in each time a grid enters the viewport.
                var grids = document.querySelectorAll('.olp-pitch .olp-bento');
                if (!grids.length) return;
                if (!('IntersectionObserver' in window)) {
                    grids.forEach(function(g){ g.classList.add('go'); });
                    return;
                }
                var io = new IntersectionObserver(function(entries){
                    entries.forEach(function(e){
                        if (e.isIntersecting) {
                            // Force reflow then re-add .go to retrigger the cascade animation.
                            e.target.classList.remove('go');
                            void e.target.offsetWidth;
                            e.target.classList.add('go');
                        } else {
                            e.target.classList.remove('go');
                        }
                    });
                }, { threshold: 0.1 });
                grids.forEach(function(g){ io.observe(g); });
            })();
            