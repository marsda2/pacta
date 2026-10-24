
            (function () {
                // Each method drives the left-column steps text AND the
                // right-column phone (via NewForfeitWidget.setPair). The
                // phone form's verb/desc/time/consequence/note all come
                // from the matching pair in HIW2_PAIRS below.
                var METHODS = [
                    {
                        tab: 'Photo',
                        steps: ['Set a Photo Forfeit', 'Submit photo evidence', 'AI or a human verifies it'],
                        bodies: [
                            "Set the description of the photo you need to send in, how much money you'll lose if you don't send it, and what time it needs to be submitted by.",
                            'Send the photo of what you said you were going to do, before the deadline.',
                            "Once submitted, Forfeit's AI will verify it. If it isn't certain, or if it thinks it's wrong, it'll get sent to a human verifier. If the evidence doesn't match the description, you lose your money."
                        ],
                        note: "Forfeit's AI compares the photo to your description. Anything borderline goes to a human verifier."
                    },
                    {
                        tab: 'Timelapse',
                        steps: ['Set a Timelapse Forfeit', 'Submit your timelapse', 'AI or a human verifies it'],
                        bodies: [
                            "Set the description of the timelapse you need to send in, how much money you'll lose if you don't send it, and the deadline. Eg, \"30 mins meditation\".",
                            'Record a timelapse of what you said you were going to do, and send it before the deadline.',
                            "Forfeit's AI analyses your timelapse. If it can't immediately approve it, it'll get sent to a human verifier. If the evidence doesn't match, you lose your money."
                        ],
                        note: "Forfeit's AI analyses the timelapse end-to-end. Anything borderline goes to a human verifier."
                    },
                    {
                        tab: 'Apple Health',
                        steps: ['Set an Apple Health Forfeit', 'Sync to Apple Health', 'Forfeit auto-verifies it'],
                        bodies: [
                            "Pick which Apple Health marker you want to track (steps, sleep, exercise minutes, mindful minutes), whether you need to be above or below it, the deadline, and how much you'll lose if you miss. Eg, \"10,000 steps before 9pm\".",
                            'Connect Forfeit to Apple Health. One permission tap and we read the marker straight from your phone, no screenshots or manual proof needed.',
                            "Forfeit checks the marker at your deadline. Hit it and you keep your money. Miss it and you lose it. No photo, no human in the loop."
                        ],
                        note: "Forfeit reads the marker straight from Apple Health. No photo, no human in the loop."
                    },
                    {
                        tab: 'Web Tracking',
                        steps: ["Install Forfeit's Mac app", 'Set limits on sites and apps', 'Stay under the limit'],
                        bodies: [
                            "Install Forfeit's Mac app. It's a tiny menu-bar app, native to your Mac, free, and built by us. No browser extensions or third-party trackers.",
                            "Set how long you're allowed on the sites and apps that drain you, and the deadline. Eg, \"Reddit under 30 minutes\" or \"Twitter blocked entirely\".",
                            "The Mac app reports your usage live and auto-verifies it against the limit you set. Cross the limit and you lose your money automatically."
                        ],
                        note: "Forfeit's Mac app reports your usage and auto-verifies it against the limit."
                    },
                    {
                        tab: 'Self-Verify',
                        steps: ['Set a Self-Verify Forfeit', 'If you did it, approve it', "If you didn't, deny it"],
                        bodies: [
                            "Set the description of what you said you'd do, the deadline, and how much you'll lose if you don't. For things a camera can't catch. Eg, \"Read for 30 minutes\" or \"Call Mum\".",
                            'When the deadline hits, tap Approve if you did it. Forfeit takes you at your word and keeps the money in your account.',
                            "If you didn't do it, tap Deny and you lose your money. The only person you cheat by lying is yourself."
                        ],
                        note: "You confirm this one on your honor. Approve if you did it, deny if you didn't."
                    },
                    {
                        tab: 'GPS',
                        steps: ['Set a GPS Forfeit', 'Check in before the deadline', 'Appeal if something came up'],
                        bodies: [
                            "Drop a pin on the map for where you need to be, what time you need to be there by, and how much you'll lose if you don't make it. Eg, \"At the gym by 6am\".",
                            "Open the app at the location, before the deadline. Forfeit confirms you're within 100m of the pin.",
                            "If you're not there in time, you lose your money. If something genuinely came up (flat tyre, family emergency), send context and a human reviewer can refund the charge."
                        ],
                        note: "Forfeit confirms you're within 100m of the pin before the deadline."
                    }
                ];

                var BLUE_FORFEIT_10 = [
                    { text: 'forfeit', color: 'blue' },
                    { text: '$10',     color: 'blue' }
                ];

                // One pair per tab, in lockstep with METHODS above. Drives
                // the chip form on the right.
                var HIW2_PAIRS = [
                    {
                        prefix: "I'll send a", verb: 'photo', suffix: 'of',
                        desc: 'My clean kitchen',
                        examples: ['My clean kitchen', 'My finished essay', 'My pushups done'],
                        beforeTime: '09:00 tomorrow',
                        consequenceChips: [{ text: 'forfeit', color: 'blue' }, { text: '$10', color: 'blue' }],
                        note: METHODS[0].note
                    },
                    {
                        prefix: "I'll record a", verb: 'timelapse', suffix: 'of',
                        desc: 'Myself meditating for 30 mins',
                        examples: ['Myself meditating', 'A 30 min reading session', 'A 1hr deep work block'],
                        beforeTime: '09:00 tomorrow',
                        consequenceChips: [{ text: 'text', color: 'blue' }, { text: 'Mum', color: 'blue' }],
                        note: METHODS[1].note
                    },
                    {
                        prefix: "I'll use", verb: 'apple health', suffix: '',
                        desc: '10,000 steps',
                        examples: ['10,000 steps', '8 hours sleep', '30 min exercise'],
                        beforeTime: '21:00 today',
                        consequenceChips: [{ text: 'block', color: 'blue' }, { text: 'TikTok', color: 'blue' }],
                        note: METHODS[2].note
                    },
                    {
                        prefix: "I'll use", verb: 'web tracking', suffix: 'on',
                        desc: '30 mins on Reddit',
                        examples: ['30 mins on Reddit', '1 hour on Twitter', 'Slack only after 2pm'],
                        beforeTime: 'midnight tonight',
                        consequenceChips: [{ text: 'block', color: 'blue' }, { text: 'Reddit', color: 'blue' }],
                        note: METHODS[3].note
                    },
                    {
                        prefix: "I'll", verb: 'self verify', suffix: "that I'll",
                        desc: 'Read for 30 minutes',
                        examples: ['Read for 30 minutes', 'Call Mum tonight', 'Plan the week'],
                        beforeTime: '22:00 tonight',
                        consequenceChips: [{ text: 'forfeit', color: 'blue' }, { text: '$5', color: 'blue' }],
                        note: METHODS[4].note
                    },
                    {
                        kind: 'gps',
                        prefix: "I'll be", verb: 'within (gps)', suffix: 'of',
                        desc: 'The gym',
                        examples: ['The gym', 'The office', 'The library'],
                        beforeTime: '06:00 tomorrow',
                        consequenceChips: [{ text: 'forfeit', color: 'blue' }, { text: '$50', color: 'blue' }],
                        note: METHODS[5].note
                    }
                ];

                var root = document.currentScript.closest('.hiw2');
                var tabsEl = root.querySelector('.hiw2-tabs');
                var stepsEl = root.querySelector('.hiw2-steps');
                var mountEl = root.querySelector('#hiw2-newforfeit');
                var idx = 0;
                var stepIdx = 0;
                var STEP_DURATION = 4200; // ms per step; matches CSS --hiw2-prog-dur
                var timer = null;
                var widget = null;
                var inView = true;

                function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

                function buildStepsHtml() {
                    var m = METHODS[idx];
                    var html = '';
                    for (var i = 0; i < 3; i++) {
                        var isActive = i === stepIdx;
                        var cls = 'hiw2-step ' + (isActive ? 'active' : 'dim');
                        // Progress bar is always present so layout stays put;
                        // CSS fades it in only on the active step.
                        var progress = '<div class="hiw2-progress" aria-hidden="true"><span class="hiw2-progress-fill" style="--hiw2-prog-dur:' + STEP_DURATION + 'ms"></span></div>';
                        html +=
                            '<div class="' + cls + '">' +
                                '<div class="hiw2-num">' + (i + 1) + '</div>' +
                                '<div class="hiw2-step-body">' +
                                    '<h3 class="hiw2-step-h">' + esc(m.steps[i]) + '</h3>' +
                                    '<div class="hiw2-desc">' + esc(m.bodies[i]) + '</div>' +
                                    progress +
                                '</div>' +
                            '</div>';
                    }
                    return html;
                }

                function syncTabs() {
                    Array.prototype.forEach.call(tabsEl.children, function (b, i) {
                        b.classList.toggle('active', i === idx);
                    });
                }

                function renderSteps() {
                    stepsEl.classList.remove('is-out', 'is-staging');
                    stepsEl.innerHTML = buildStepsHtml();
                    syncTabs();
                }

                // In-tab step change: keep the existing DOM nodes and just
                // toggle active/dim classes so the CSS transitions on
                // .hiw2-num, .hiw2-step-h and the progress bar opacity can
                // play smoothly instead of the whole list being rebuilt and
                // snapping. On the new active step we swap the fill <span>
                // for a fresh node so the CSS fill animation restarts from 0.
                function updateActiveStep() {
                    if (!stepsEl.children.length) { renderSteps(); return; }
                    Array.prototype.forEach.call(stepsEl.children, function (stepEl, i) {
                        var isActive = i === stepIdx;
                        stepEl.classList.toggle('active', isActive);
                        stepEl.classList.toggle('dim', !isActive);
                        if (!isActive) return;
                        var progressEl = stepEl.querySelector('.hiw2-progress');
                        if (!progressEl) return;
                        var newFill = document.createElement('span');
                        newFill.className = 'hiw2-progress-fill';
                        newFill.style.setProperty('--hiw2-prog-dur', STEP_DURATION + 'ms');
                        var oldFill = progressEl.querySelector('.hiw2-progress-fill');
                        if (oldFill) progressEl.replaceChild(newFill, oldFill);
                        else progressEl.appendChild(newFill);
                    });
                }

                // Smooth swap: fade out + slide up the old steps, then fade in
                // the new ones with a per-step stagger. Used when the active
                // tab changes (manual click or auto-cycle).
                var fadeTimer = null;
                function renderStepsWithFade() {
                    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
                    stepsEl.classList.remove('is-staging');
                    stepsEl.classList.add('is-out');
                    syncTabs();
                    fadeTimer = setTimeout(function () {
                        stepsEl.innerHTML = buildStepsHtml();
                        stepsEl.classList.remove('is-out');
                        stepsEl.classList.add('is-staging');
                        fadeTimer = setTimeout(function () {
                            stepsEl.classList.remove('is-staging');
                            fadeTimer = null;
                        }, 520);
                    }, 200);
                }

                function tick() {
                    stepIdx += 1;
                    if (stepIdx > 2) {
                        stepIdx = 0;
                        idx = (idx + 1) % METHODS.length;
                        if (widget) widget.setPair(idx, { animate: true });
                        // Tab boundary: smooth fade swap on the step list.
                        renderStepsWithFade();
                    } else {
                        // Step changed within the same tab: retype the next
                        // example description on the phone so the typing
                        // animation keeps running between tab changes.
                        var examples = HIW2_PAIRS[idx] && HIW2_PAIRS[idx].examples;
                        if (widget && widget.retypeDesc && examples && examples.length) {
                            widget.retypeDesc(examples[stepIdx % examples.length]);
                        }
                        updateActiveStep();
                    }
                }

                function startTimer() {
                    stopTimer();
                    if (!inView) return;
                    timer = setInterval(tick, STEP_DURATION);
                }
                function stopTimer() {
                    if (timer) { clearInterval(timer); timer = null; }
                }
                function restartTimer() {
                    renderSteps();
                    startTimer();
                }
                function restartTimerWithFade() {
                    renderStepsWithFade();
                    startTimer();
                }

                function start() {
                    widget = window.NewForfeitWidget.mount(mountEl, {
                        pairs: HIW2_PAIRS,
                        autoplay: false,
                        startIndex: 0
                    });
                    METHODS.forEach(function (m, i) {
                        var b = document.createElement('button');
                        b.type = 'button';
                        b.className = 'hiw2-tab';
                        b.textContent = m.tab;
                        b.addEventListener('click', function () {
                            if (idx === i) return;
                            idx = i;
                            stepIdx = 0;
                            widget.setPair(i, { animate: true });
                            restartTimerWithFade();
                        });
                        tabsEl.appendChild(b);
                    });
                    renderSteps();

                    if ('IntersectionObserver' in window) {
                        var io = new IntersectionObserver(function (entries) {
                            entries.forEach(function (e) {
                                inView = e.isIntersecting;
                                // Re-render on enter so the CSS progress-fill
                                // animation restarts cleanly. Otherwise the
                                // bar can be sitting at 100% (from completing
                                // off-screen) and we'd wait a full STEP_DURATION
                                // before the next tick advances it.
                                if (inView) restartTimer(); else stopTimer();
                            });
                        }, { threshold: 0.05, rootMargin: '0px 0px -10% 0px' });
                        io.observe(root);
                    } else {
                        startTimer();
                    }
                }

                if (window.NewForfeitWidget) {
                    start();
                } else if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', start);
                } else {
                    start();
                }
            })();
            