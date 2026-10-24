
                        (function () {
                            function go() { window.NewForfeitWidget.mount('#hero-newforfeit', { cycleMs: 4200 }); }
                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', go);
                            } else {
                                go();
                            }
                        })();
                        