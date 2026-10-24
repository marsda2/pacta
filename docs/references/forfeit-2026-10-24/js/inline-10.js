
        /* ============================================================
           window.OverlordUI - shared bubble + action widget helper.
           Use this to render an action widget anywhere on the page:

             var card = OverlordUI.buildAction({
               kind: 'charge',           // phone_call | text_friend | charge |
                                         // screen_block | approve_goal |
                                         // fail_goal | edit_goal | skip_goal
               title: '$25 charged',
               body: 'For disconnecting Screen Time against your rules.'
             });
             container.appendChild(card);

           Returns an <div class="olc-action">. Styling lives in the
           global CSS rule above (tokens on :root, .olc-action + alias
           .l12hp-aw). Both class names produce identical visuals.
           ============================================================ */
        window.OverlordUI = window.OverlordUI || (function () {
            // SVG glyphs keyed by the 8 Overlord action kinds + fallback info.
            var ICONS = {
                phone_call:   '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
                text_friend:  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
                charge:       '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
                screen_block: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><line x1="11" y1="18" x2="13" y2="18"/>',
                approve_goal: '<polyline points="20 6 9 17 4 12"/>',
                fail_goal:    '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
                edit_goal:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/>',
                skip_goal:    '<polyline points="9 18 15 12 9 6"/>',
                info:         '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
            };

            function buildAction(action) {
                var iconKey = ICONS[action.kind] ? action.kind : 'info';
                var card = document.createElement('div');
                card.className = 'olc-action';

                var top = document.createElement('div');
                top.className = 'olc-action-top';

                var iconWrap = document.createElement('div');
                iconWrap.className = 'olc-action-icon';
                iconWrap.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[iconKey] + '</svg>';

                var textWrap = document.createElement('div');
                textWrap.className = 'olc-action-text';
                var titleEl = document.createElement('div');
                titleEl.className = 'olc-action-title';
                titleEl.textContent = action.title;
                textWrap.appendChild(titleEl);
                if (action.body) {
                    var bodyEl = document.createElement('div');
                    bodyEl.className = 'olc-action-body';
                    bodyEl.textContent = action.body;
                    textWrap.appendChild(bodyEl);
                }

                top.appendChild(iconWrap);
                top.appendChild(textWrap);
                card.appendChild(top);

                return card;
            }

            return { ICONS: ICONS, buildAction: buildAction };
        })();

        /* Hero chip auto-cycle (added 2026-05-06; rewritten 2026-05-08 to swap L12 thread contents).
           Bug before: JS toggled .hidden on legacy .message-container divs, but (a) those are killed
           by `display:none !important;` on .right-content > .iphone-preview > .iphone-screen
           .message-container (~line 6459), and (b) there was no .hidden CSS rule defined anywhere.
           So nothing visible ever changed when the chip cycled. The visible chat is the L12 overlay
           (.l12hp-thread). Fix: rebuild .l12hp-thread bubbles per active chip. */
        document.addEventListener('DOMContentLoaded', function () {
            var rightCol = document.querySelector('.right-content');
            if (!rightCol) return;
            var thread = document.querySelector('.right-content .l12hp-thread');
            var chatDay = document.querySelector('.right-content .l12hp-chat-day');
            if (!thread) return;

            // One conversation per chip. who = 'them' (Overlord, left) or 'me' (user, right).
            // Bubbles with action: { kind, title, body } render as Iteration-05
            // action widget cards. Plain text bubbles stay as chat bubbles.
            // action.kind is one of the 8 Overlord actions: phone_call, text_friend,
            // charge, screen_block, approve_goal, fail_goal, edit_goal, skip_goal.
            var conversations = {
                pushups: {
                    day: 'Today, 9:32 AM',
                    bubbles: [
                        { who: 'them', text: 'Your 7 AM run is due. $20 on the line.' },
                        { who: 'me',   text: 'had a meeting' },
                        { who: 'them', text: 'Nothing on your calendar at 7. Deadline passed, no photo.' },
                        { who: 'them', action: { kind: 'charge', title: '$20 captured', body: 'Missed your morning run.' } }
                    ]
                },
                gps: {
                    day: 'Today, 9:14 AM',
                    bubbles: [
                        { who: 'them', text: 'Gym by 9 or you lose $20. Check in when you get there.' },
                        { who: 'me',   text: 'on the couch. give me 10 min' },
                        { who: 'them', text: 'Deadline is 9:00. GPS confirms you are within 100m.' },
                        { who: 'me',   text: 'fine. heading out' },
                        { who: 'them', action: { kind: 'approve_goal', title: 'Checked in', body: 'GPS puts you at the gym. Forfeit cleared.' } }
                    ]
                },
                heart: {
                    day: 'Today, 7:15 AM',
                    bubbles: [
                        { who: 'me',   text: 'heading out for a run, tracking on Apple Health' },
                        { who: 'them', text: '30 active minutes today or $15 is gone.' },
                        { who: 'them', action: { kind: 'approve_goal', title: 'Goal hit', body: 'Apple Health logged 32 active minutes. Forfeit cleared.' } },
                        { who: 'me',   text: 'easy' }
                    ]
                },
                mac: {
                    day: 'Today, 5:01 PM',
                    bubbles: [
                        { who: 'me',   text: 'finished my workout, sending the photo' },
                        { who: 'them', text: 'Checking it now.' },
                        { who: 'them', action: { kind: 'approve_goal', title: 'Photo approved', body: 'Verified by AI. $25 stays in your pocket.' } },
                        { who: 'me',   text: 'love it' }
                    ]
                },
                cal: {
                    day: 'Today, 11:05 AM',
                    bubbles: [
                        { who: 'me',   text: 'recording a timelapse of my study session' },
                        { who: 'them', text: 'Two focused hours by 1 PM or you lose $30.' },
                        { who: 'me',   text: 'on it' },
                        { who: 'them', action: { kind: 'approve_goal', title: 'Timelapse verified', body: 'Two hours of focus confirmed. Forfeit cleared.' } }
                    ]
                },
                /* === NEW EXAMPLES, pulled from production overlord.app === */
                screentime: {
                    day: 'Today, 4:21 PM',
                    bubbles: [
                        { who: 'me',   text: 'can I get just 1 minute on Instagram?' },
                        { who: 'them', text: 'Your limit is 30 min a day and you are at it.' },
                        { who: 'me',   text: 'just turned screen time off' },
                        { who: 'them', action: { kind: 'charge', title: '$50 captured', body: 'Disconnected tracking against your rules.' } }
                    ]
                },
                wakeup: {
                    day: 'Today, 6:30 AM',
                    bubbles: [
                        { who: 'them', text: 'Up and out the door by 6:45 or you lose $15. Photo proof.' },
                        { who: 'me',   text: 'I\'m up' },
                        { who: 'them', text: 'Send a photo of your toothbrush by 6:50, then your clean desk by 7:00.' },
                        { who: 'me',   text: '6:48 AM', image: '/assets/ToothbrushPhoto.jpg' },
                        { who: 'them', text: 'Toothbrush verified. Clean desk photo by 7:00 now.' },
                        { who: 'me',   text: '6:57 AM', image: '/assets/CleanDesk.png' },
                        { who: 'them', action: { kind: 'approve_goal', title: 'Routine complete', body: 'Both photos verified in time. $15 stays yours.' } }
                    ]
                },
                workout: {
                    day: 'Today, 7:42 AM',
                    bubbles: [
                        { who: 'them', text: 'Screen Time says 48 min on Reddit today. Your limit is 30.' },
                        { who: 'me',   text: 'oops' },
                        { who: 'them', action: { kind: 'charge', title: '$15 captured', body: 'Went over your web limit.' } }
                    ]
                },
                bedtime: {
                    day: 'Tonight, 9:00 PM',
                    bubbles: [
                        { who: 'them', text: '1 hour until your 10 PM bedtime. Non-essential apps blocked in 30 min.' },
                        { who: 'them', action: { kind: 'screen_block', title: 'Bedtime apps blocked', body: 'Entertainment and social locked. Reading and meditation still available.' } },
                        { who: 'me',   text: 'Can I get 10 more on YouTube? Wanna finish this video.' },
                        { who: 'them', action: { kind: 'screen_block', title: 'YouTube unblocked', body: '10 extra minutes. No more after that.' } },
                        { who: 'them', action: { kind: 'screen_block', title: 'All apps locked', body: 'Until 7 AM. Sweet dreams.' } }
                    ]
                }
            };

            var chipSelectors = [
                { chip: '.hero-chip-pushups',    key: 'pushups' },
                { chip: '.hero-chip-gps',        key: 'gps' },
                { chip: '.hero-chip-wakeup',     key: 'wakeup' },
                { chip: '.hero-chip-screentime', key: 'screentime' },
                { chip: '.hero-chip-heart',      key: 'heart' },
                { chip: '.hero-chip-mac',        key: 'mac' },
                { chip: '.hero-chip-workout',    key: 'workout' },
                { chip: '.hero-chip-cal',        key: 'cal' }
            ];
            var entries = chipSelectors.map(function (s) {
                return { chip: document.querySelector(s.chip), key: s.key };
            }).filter(function (e) { return e.chip && conversations[e.key]; });
            if (!entries.length) return;

            // Action widget builder lives globally on window.OverlordUI so
            // any section on the page can render the same card. See the
            // helper definition near the top of this <script> block.
            var buildActionWidget = window.OverlordUI.buildAction;

            function renderThread(convo) {
                if (!convo) return;
                if (chatDay) chatDay.textContent = convo.day;
                // Build all bubbles into a fragment, then swap in one shot (no flicker, no double-shown).
                var frag = document.createDocumentFragment();
                convo.bubbles.forEach(function (b) {
                    var row = document.createElement('div');
                    row.className = 'l12hp-cb ' + (b.who === 'me' ? 'l12hp-cb-me' : 'l12hp-cb-them');
                    if (b.action) {
                        row.classList.add('l12hp-cb-aw');
                        row.appendChild(buildActionWidget(b.action));
                    } else {
                        var inner = document.createElement('div');
                        inner.className = 'l12hp-cb-inner';
                        if (b.image) {
                            inner.classList.add('l12hp-cb-inner-img');
                            var img = document.createElement('img');
                            img.src = b.image;
                            img.alt = '';
                            img.loading = 'lazy';
                            img.className = 'l12hp-cb-img';
                            inner.appendChild(img);
                        } else {
                            inner.textContent = b.text;
                        }
                        row.appendChild(inner);
                    }
                    frag.appendChild(row);
                });
                thread.innerHTML = '';
                thread.appendChild(frag);
                thread.scrollTop = thread.scrollHeight;
            }

            function show(idx) {
                entries.forEach(function (e, i) { e.chip.classList.toggle('active', i === idx); });
                renderThread(conversations[entries[idx].key]);
            }

            var idx = 0;
            show(idx);
            var interval = null;
            // On /signup, slow this cycle so people can actually read each
            // conversation. 1500ms barely lets the chip-active highlight
            // register before the whole thread re-renders.
            var isSignupVariant = document.documentElement.classList.contains('is-signup-page');
            var cycleMs = isSignupVariant ? 5500 : 4500;
            function start() {
                if (interval) clearInterval(interval);
                interval = setInterval(function () {
                    idx = (idx + 1) % entries.length;
                    show(idx);
                }, cycleMs);
            }
            start();
            entries.forEach(function (e, i) {
                e.chip.addEventListener('click', function () { idx = i; show(idx); start(); });
            });
            rightCol.addEventListener('mouseenter', function () { if (interval) { clearInterval(interval); interval = null; } });
            rightCol.addEventListener('mouseleave', function () { start(); });
        });
    