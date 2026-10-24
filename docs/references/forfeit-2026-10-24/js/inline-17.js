
                (function() {
                    var ARCHETYPES = [
                        { id: 'nsfw', title: 'NSFW spiral', url: 'imgur.com/r/random', favicon: '!', faviconColor: '#b03040', intervention: "This is the second time NSFW has been flagged on your machine in the last ten minutes. I've bricked your phone and Mac for the next 20 minutes. If you don't leave the house and get some fresh air, it'll be 1 hour.", site: 'this site', chips: ["I'll go for a walk", 'Bring me back online in 20 min', 'Lock me out for the hour'] },
                        { id: 'x-repeat', title: 'Refreshing X', url: 'x.com/home', favicon: 'X', faviconColor: '#0b0b0c', intervention: "Tell me a good reason you need to be on X right now. If it's legit, I'll check in every minute to make sure you're using it for that reason.", site: 'X (Twitter)', chips: ['Researching a specific thread', 'Replying to a customer', 'No reason, close it'] },
                        { id: 'rabbit', title: 'Multiple tabs', url: 'en.wikipedia.org/wiki/List_of_cognitive_biases', favicon: 'W', faviconColor: '#0b0b0c', intervention: "You're in a rabbit hole now. I'm blocking Wikipedia until you get back to work.", site: 'Wikipedia', chips: ['Back to the PR', 'Block til the end of the day', 'Just one more tab'] },
                        { id: 'hn', title: 'Fake productivity', url: 'news.ycombinator.com/front', favicon: 'Y', faviconColor: '#ff6600', intervention: "22 minutes 'researching' on HN. The PR is still open. I'm closing this until you ship.", site: 'Hacker News', chips: ['I really am researching', "You're right, close it", 'Block til the PR merges'] },
                        { id: 'mail', title: 'Checking email repeatedly', url: 'mail.google.com/u/0/#inbox', favicon: 'M', faviconColor: '#ea4335', intervention: "8th inbox check in 30 minutes. Nothing new. You're in deep-work til 11. Closing.", site: 'Gmail', chips: ['Just one quick check', 'Block til lunch', 'Batch-check at 11'] },
                        { id: 'youtube-ratio', title: '5 min break, 45 min work', url: 'youtube.com/watch?v=dQw4w9WgXcQ', favicon: 'Y', faviconColor: '#ff0000', intervention: "You're allowed 1 minute of YouTube for every 5 minutes of work. You're at 35 minutes of work, so your 7 minutes of free time is over.", site: 'YouTube', chips: ['Back to work', "Trade tomorrow's break", 'Show me my ratio'] },
                        { id: 'reddit', title: 'Reddit when stuck', url: 'reddit.com/r/all', favicon: 'r', faviconColor: '#ff4500', intervention: "Reddit at 2:14 PM. You opened the migration PR three minutes ago. That's the pattern, reddit when the work gets uncomfortable. Closing.", site: 'Reddit', chips: ['Back to the PR', 'I need 10 min away from the code', "Block til it's merged"] },
                        { id: 'tiktok', title: '1am TikTok', url: 'tiktok.com/foryou', favicon: 'T', faviconColor: '#ff0050', intervention: "11:42 PM. We agreed laptop and phone off after 11. Bricking both for 6 hours.", site: 'TikTok', chips: ['Lock everything til 7am', 'Just 5 min', 'Brick til morning'] },
                        { id: 'day-ended', title: 'After work', url: 'youtube.com/watch?v=Y0kBpfPpFfM', favicon: 'Y', faviconColor: '#ff0000', intervention: "It's 7:14 PM. Your day-rules ended at 6. YouTube is unblocked. Go enjoy your evening.", site: 'YouTube', titleOverride: 'Overlord stood down', chips: ['Re-arm at 11pm', 'Keep unblocked til morning', 'Re-enable strict mode now'] }
                    ];
                    var active = 0;
                    var sideList = document.getElementById('macblock-side-list');
                    var favicon = document.getElementById('macblock-favicon');
                    var tabTitle = document.getElementById('macblock-tab-title');
                    var urlEl = document.getElementById('macblock-url');
                    var page = document.getElementById('macblock-page');
                    var modalTitle = document.getElementById('macblock-modal-title');
                    var bubble = document.getElementById('macblock-bubble');
                    var chipsEl = document.getElementById('macblock-chips');
                    if (!sideList) return;

                    function pad(n) { return n < 10 ? '0' + n : '' + n; }
                    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

                    function renderSide() {
                        sideList.innerHTML = ARCHETYPES.map(function(a, i) {
                            return '<button type="button" class="macblock-side-row' + (i === active ? ' macblock-side-row-active' : '') + '" data-idx="' + i + '">' +
                                '<span class="macblock-side-num">' + pad(i + 1) + '</span>' +
                                '<span class="macblock-side-meta">' +
                                    '<span class="macblock-side-title">' + esc(a.title) + '</span>' +
                                    '<span class="macblock-side-url">' + esc(a.url) + '</span>' +
                                '</span>' +
                            '</button>';
                        }).join('');
                        sideList.querySelectorAll('button').forEach(function(b) {
                            b.addEventListener('click', function() {
                                active = parseInt(b.getAttribute('data-idx'), 10);
                                render();
                            });
                        });
                    }

                    function renderStage() {
                        var a = ARCHETYPES[active];
                        favicon.textContent = a.favicon;
                        favicon.style.background = a.faviconColor;
                        tabTitle.textContent = a.site;
                        urlEl.textContent = a.url;
                        if (page) page.style.background = (a.faviconColor || '#0b0b0c') + '14';
                        modalTitle.textContent = a.titleOverride || ('Overlord blocked ' + a.site);
                        bubble.textContent = a.intervention;
                        chipsEl.innerHTML = a.chips.map(function(c) { return '<button type="button" class="macblock-chip">' + esc(c) + '</button>'; }).join('');
                    }

                    function render() { renderSide(); renderStage(); }
                    render();
                })();
                