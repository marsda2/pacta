
    /* NewForfeitWidget - reusable chip-form preview widget.
     *
     * Usage:
     *   NewForfeitWidget.mount(container, options)
     *   container: CSS selector string or DOM element
     *   options: { examples?, cycleMs?, startIndex?, autoplay? }
     *
     * Token format for examples:
     *   { label, mode: 'one'|'repeat', rows: [ [...tokens], ... ] }
     *   token: [kind, text, color?]
     *   kind: 't' (plain text), 'c' (chip), 'f' (field)
     *   color (chips only): 'blue' (default), 'red', 'dark', 'purple', 'green'
     *
     * Returns a handle: { destroy() }
     */
    (function () {
        if (window.NewForfeitWidget) return;

        var STYLE_ID = 'nfw-styles';
        var CSS = [
            ".nfw { font-family: 'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; color: #0b0b0c !important; display: flex !important; flex-direction: column !important; height: 100% !important; min-height: 0 !important; width: 100% !important; padding: 0 !important; -webkit-font-smoothing: antialiased !important; overflow: hidden !important; }",
            ".nfw *, .nfw *::before, .nfw *::after { box-sizing: border-box !important; }",
            ".nfw .nfw-iosbar { display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 14px 22px 6px !important; flex-shrink: 0 !important; }",
            ".nfw .nfw-iosbar-time { font-size: 15px !important; font-weight: 600 !important; color: #0b0b0c !important; letter-spacing: -0.01em !important; min-width: 56px !important; font-family: 'Figtree', sans-serif !important; }",
            ".nfw .nfw-iosbar-island { width: 86px !important; height: 26px !important; background: #0b0b0c !important; border-radius: 999px !important; }",
            ".nfw .nfw-iosbar-icons { display: flex !important; gap: 5px !important; align-items: center !important; min-width: 56px !important; justify-content: flex-end !important; color: #0b0b0c !important; }",
            ".nfw .nfw-iosbar-icons svg { height: 12px !important; width: auto !important; display: block !important; }",
            ".nfw .nfw-stage { flex: 1 !important; min-height: 0 !important; display: flex !important; flex-direction: column !important; padding: 4px 4px 0 !important; overflow: hidden !important; }",
            ".nfw .nfw-head { display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 8px 14px 12px !important; flex-shrink: 0 !important; }",
            ".nfw .nfw-back { display: inline-flex !important; align-items: center !important; justify-content: center !important; color: #2f6bff !important; padding: 4px !important; background: transparent !important; border: 0 !important; }",
            ".nfw .nfw-back svg { width: 14px !important; height: 14px !important; display: block !important; }",
            ".nfw .nfw-spacer { display: inline-block !important; width: 22px !important; height: 1px !important; }",
            ".nfw .nfw-title { font-size: 15px !important; font-weight: 700 !important; color: #0b0b0c !important; font-family: 'Figtree', sans-serif !important; }",
            "div.nfw .nfw-seg, .nfw > .nfw-stage > .nfw-seg, .right-content .iphone-screen .nfw .nfw-seg { display: flex !important; background: #eceef2 !important; border-radius: 9px !important; padding: 2px !important; margin: 0 12px 12px !important; flex-shrink: 0 !important; }",
            "div.nfw .nfw-seg > span, .nfw > .nfw-stage > .nfw-seg > span, .right-content .iphone-screen .nfw .nfw-seg > span { flex: 1 !important; text-align: center !important; font-size: 13px !important; font-weight: 600 !important; color: #626269 !important; padding: 6px 0 !important; min-height: 0 !important; line-height: 1.15 !important; display: flex !important; align-items: center !important; justify-content: center !important; border-radius: 7px !important; font-family: 'Figtree', sans-serif !important; background: transparent !important; box-shadow: none !important; }",
            "div.nfw .nfw-seg > span.nfw-seg-on, .nfw > .nfw-stage > .nfw-seg > span.nfw-seg-on, .right-content .iphone-screen .nfw .nfw-seg > span.nfw-seg-on { background: #ffffff !important; color: #0b0b0c !important; box-shadow: 0 1px 3px rgba(0,0,0,0.10) !important; border-radius: 7px !important; }",
            ".nfw .nfw-body { padding: 0 14px !important; flex-shrink: 0 !important; }",
            ".nfw .nfw-foot { padding: 6px 14px 0 !important; font-size: 10.5px !important; line-height: 1.45 !important; color: #626269 !important; flex-shrink: 0 !important; font-family: 'Figtree', sans-serif !important; font-weight: 500 !important; }",
            ".nfw .nfw-foot p { margin: 0 0 6px !important; transition: opacity 200ms ease !important; }",
            ".nfw .nfw-foot p:last-child { margin-bottom: 0 !important; }",
            ".nfw .nfw-foot p.is-fading { opacity: 0 !important; }",
            ".nfw .nfw-line { display: flex !important; flex-wrap: wrap !important; align-items: center !important; gap: 6px 7px !important; margin-bottom: 10px !important; font-size: 14px !important; font-weight: 600 !important; color: #0b0b0c !important; font-family: 'Figtree', sans-serif !important; line-height: 1.3 !important; }",
            ".nfw .nfw-txt { color: #0b0b0c !important; font-family: 'Figtree', sans-serif !important; font-weight: 600 !important; }",
            ".nfw .nfw-chip { display: inline-flex !important; align-items: center !important; gap: 5px !important; color: #ffffff !important; font-size: 13px !important; font-weight: 700 !important; padding: 6px 11px !important; border-radius: 8px !important; line-height: 1.2 !important; background: #2f6bff !important; font-family: 'Figtree', sans-serif !important; border: 0 !important; }",
            ".nfw .nfw-chip.red { background: #e9233b !important; }",
            ".nfw .nfw-chip.dark { background: #0b0b0c !important; }",
            ".nfw .nfw-chip.purple { background: #7c3aed !important; }",
            ".nfw .nfw-chip.green { background: #1c8c3d !important; }",
            ".nfw .nfw-car { font-size: 9px !important; opacity: 0.85 !important; line-height: 1 !important; }",
            ".nfw .nfw-slotwrap { display: inline-block !important; overflow: hidden !important; height: 1.2em !important; vertical-align: bottom !important; position: relative !important; }",
            ".nfw .nfw-slotwrap.is-morphing { transition: width 380ms cubic-bezier(0.4, 0.0, 0.2, 1) !important; }",
            ".nfw .nfw-slot { display: inline-block !important; will-change: transform !important; }",
            ".nfw .nfw-slot.is-rolling { animation: nfw-roll 380ms cubic-bezier(0.4, 0.0, 0.2, 1) forwards !important; }",
            "@keyframes nfw-roll { from { transform: translateY(0); } to { transform: translateY(-1.2em); } }",
            ".nfw .nfw-slot > span { display: block !important; height: 1.2em !important; line-height: 1.2 !important; white-space: nowrap !important; }",
            ".nfw .nfw-field { display: flex !important; align-items: center !important; width: 100% !important; box-sizing: border-box !important; background: #f4f5f8 !important; border: 1px solid #e3e5ea !important; border-radius: 9px !important; padding: 8px 12px !important; font-size: 13px !important; font-weight: 600 !important; color: #0b0b0c !important; font-family: 'Figtree', sans-serif !important; line-height: 1.3 !important; }",
            ".nfw .nfw-field-text { display: inline-block !important; white-space: pre !important; }",
            ".nfw .nfw-cur { width: 2px !important; height: 14px !important; background: #2f6bff !important; margin-left: 1px !important; animation: nfw-blink 1.1s step-end infinite !important; display: inline-block !important; vertical-align: middle !important; }",
            "@keyframes nfw-blink { 50% { opacity: 0; } }",
            ".nfw .nfw-desc-row { transition: opacity 200ms ease !important; }",
            ".nfw .nfw-desc-row.is-fading { opacity: 0 !important; }",
            ".nfw .nfw-desc-row.is-hidden { display: none !important; }",
            ".nfw .nfw-map { position: relative !important; width: 100% !important; height: 110px !important; background: #f4f5f8 !important; border: 1px solid #e3e5ea !important; border-radius: 9px !important; overflow: hidden !important; padding: 0 !important; }",
            ".nfw .nfw-map svg { display: block !important; width: 100% !important; height: 100% !important; }",
            ".nfw .nfw-map-label { position: absolute !important; left: 8px !important; bottom: 8px !important; display: inline-flex !important; align-items: center !important; gap: 5px !important; background: #ffffff !important; color: #0b0b0c !important; font-family: 'Figtree', sans-serif !important; font-size: 12px !important; font-weight: 700 !important; padding: 5px 9px !important; border-radius: 999px !important; box-shadow: 0 1px 3px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04) !important; line-height: 1 !important; }",
            ".nfw .nfw-map-label svg { width: 11px !important; height: 11px !important; display: block !important; flex: 0 0 auto !important; }",
            ".nfw .nfw-home-ind { width: 120px !important; height: 4px !important; background: #0b0b0c !important; border-radius: 4px !important; margin: 6px auto 8px !important; flex-shrink: 0 !important; }",
            "@media (max-width: 768px) {",
            "  .nfw .nfw-iosbar { padding: 8px 16px 4px !important; }",
            "  .nfw .nfw-iosbar-time { font-size: 13px !important; }",
            "  .nfw .nfw-iosbar-island { width: 70px !important; height: 22px !important; }",
            "  .nfw .nfw-iosbar-icons svg { height: 10px !important; }",
            "  .nfw .nfw-head { padding: 4px 12px 8px !important; }",
            "  .nfw .nfw-title { font-size: 14px !important; }",
            "  div.nfw .nfw-seg, .nfw > .nfw-stage > .nfw-seg, .right-content .iphone-screen .nfw .nfw-seg { margin: 0 10px 8px !important; }",
            "  div.nfw .nfw-seg > span, .nfw > .nfw-stage > .nfw-seg > span, .right-content .iphone-screen .nfw .nfw-seg > span { font-size: 12px !important; padding: 5px 0 !important; }",
            "  .nfw .nfw-body { padding: 0 10px !important; }",
            "  .nfw .nfw-line { font-size: 13px !important; margin-bottom: 7px !important; gap: 5px 6px !important; }",
            "  .nfw .nfw-chip { font-size: 12px !important; padding: 5px 9px !important; }",
            "  .nfw .nfw-field { padding: 6px 10px !important; font-size: 12px !important; }",
            "  .nfw .nfw-map { height: 90px !important; }",
            "  .nfw .nfw-foot { padding: 4px 10px 0 !important; font-size: 9.5px !important; }",
            "  .nfw .nfw-home-ind { margin: 4px auto 6px !important; }",
            "}"
        ].join('\n');

        function injectStyles() {
            if (document.getElementById(STYLE_ID)) return;
            var s = document.createElement('style');
            s.id = STYLE_ID;
            s.textContent = CSS;
            document.head.appendChild(s);
        }

        function esc(s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        // Default pairs the widget cycles through. Each pair fully drives
        // the rendered form: verb chip (slot-machine), description field
        // (typewriter), the "Before" time chip (instant swap), the
        // consequence chips after "Or" (instant swap), and the footer note
        // (200ms crossfade).
        var DEFAULT_BLUE_CONSEQUENCE = [
            { text: 'forfeit', color: 'blue' },
            { text: '$10',     color: 'blue' }
        ];
        var DEFAULT_PAIRS = [
            {
                prefix: "I'll send a", verb: 'photo', suffix: 'of',
                desc: 'Me at the gym',
                beforeTime: '09:00 tomorrow',
                consequenceChips: [{ text: 'forfeit', color: 'blue' }, { text: '$10', color: 'blue' }],
                note: 'A Forfeit verifier compares your description with the photo you send.'
            },
            {
                prefix: "I'll record a", verb: 'timelapse', suffix: 'of',
                desc: 'Myself studying for 30 mins',
                beforeTime: '09:00 tomorrow',
                consequenceChips: [{ text: 'text', color: 'blue' }, { text: 'Mum', color: 'blue' }],
                note: 'A Forfeit verifier compares your description with the video you send.'
            },
            {
                prefix: "I'll send a", verb: 'camera only photo', suffix: 'of',
                desc: 'A tidy kitchen',
                beforeTime: '22:00 tonight',
                consequenceChips: [{ text: 'block', color: 'blue' }, { text: 'Instagram', color: 'blue' }],
                note: 'A Forfeit verifier checks the live photo matches what you described.'
            },
            {
                prefix: "I'll use", verb: 'apple health', suffix: '',
                desc: '10,000 steps',
                beforeTime: '21:00 today',
                consequenceChips: [{ text: 'block', color: 'blue' }, { text: 'TikTok', color: 'blue' }],
                note: 'Forfeit reads the marker straight from Apple Health. No manual proof needed.'
            },
            {
                prefix: "I'll", verb: 'self verify', suffix: "that I'll",
                desc: 'Read for 30 minutes',
                beforeTime: '22:00 tonight',
                consequenceChips: [{ text: 'forfeit', color: 'blue' }, { text: '$5', color: 'blue' }],
                note: 'You confirm this one on your honor. Approve it if you did it, deny it if you did not.'
            },
            {
                kind: 'gps',
                prefix: "I'll be", verb: 'within (gps)', suffix: 'of',
                desc: 'The gym',
                beforeTime: '06:00 tomorrow',
                consequenceChips: [{ text: 'forfeit', color: 'blue' }, { text: '$50', color: 'blue' }],
                note: 'Forfeit confirms you are within 100m of the location before the deadline.'
            }
        ];

        var STATUS_ICONS =
            '<svg viewBox="0 0 16 12" fill="currentColor" aria-hidden="true"><path d="M8 1.5C5.2 1.5 2.6 2.5.5 4.2a.6.6 0 0 0-.06.86l1 1.13a.6.6 0 0 0 .82.06A9.5 9.5 0 0 1 8 4.05c2.16 0 4.16.72 5.74 1.93a.6.6 0 0 0 .82-.06l1-1.13a.6.6 0 0 0-.06-.86A12.5 12.5 0 0 0 8 1.5zM8 5.4a8.6 8.6 0 0 0-5.32 1.83.6.6 0 0 0-.06.85l1 1.13a.6.6 0 0 0 .82.06A5.6 5.6 0 0 1 8 8.05c1.35 0 2.6.47 3.56 1.22a.6.6 0 0 0 .82-.06l1-1.13a.6.6 0 0 0-.06-.85A8.6 8.6 0 0 0 8 5.4zM8 9.3c-1.05 0-2.02.35-2.8.94a.6.6 0 0 0-.08.86l1.9 2.15a1.3 1.3 0 0 0 1.96 0l1.9-2.15a.6.6 0 0 0-.08-.86A4.6 4.6 0 0 0 8 9.3z"/></svg>' +
            '<svg viewBox="0 0 26 12" fill="none" aria-hidden="true"><rect x="0.5" y="1" width="21" height="10" rx="2.5" stroke="currentColor"/><rect x="2.5" y="3" width="16" height="6" rx="1" fill="currentColor"/><rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor"/></svg>';

        var BACK_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';

        function chipClass(color) {
            var c = (color || 'blue');
            return 'nfw-chip' + (c === 'blue' ? '' : ' ' + c);
        }

        // Render a slot-wrapped text node. Used for every animatable chip
        // text and the plain-text prefix/suffix so they all slide in sync.
        function slotHtml(text, dataKey) {
            return (
                '<span class="nfw-slotwrap"' + (dataKey ? ' data-nfw="' + dataKey + 'wrap"' : '') + '>' +
                    '<span class="nfw-slot"' + (dataKey ? ' data-nfw="' + dataKey + 'slot"' : '') + '>' +
                        '<span>' + esc(text || '') + '</span>' +
                    '</span>' +
                '</span>'
            );
        }

        // Stylized mini map for the GPS pair's description row. Pure inline
        // SVG: gray base, soft park + water blobs, gentle street grid, a few
        // building rects, then a teardrop pin + tinted radius circle at the
        // centre. Lifted from the GPS picker mockup and trimmed to fit the
        // ~110px hero phone card. `desc` is shown as a Maps-style pill in
        // the parent's nfw-map-label overlay (rendered separately).
        function gpsMapSvg() {
            return ''
                + '<svg viewBox="0 0 320 170" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
                +   '<rect x="0" y="0" width="320" height="170" fill="#eef0f3"/>'
                +   '<path d="M-20 130 Q 20 100 60 120 T 130 145 Q 90 175 30 175 L -20 175 Z" fill="#dfeadd"/>'
                +   '<path d="M260 -10 Q 290 30 305 60 T 330 130 L 330 -10 Z" fill="#d6e4f0"/>'
                +   '<g stroke="#d0d3d8" stroke-width="5" stroke-linecap="round">'
                +     '<line x1="0"   y1="40"  x2="320" y2="40"/>'
                +     '<line x1="0"   y1="100" x2="320" y2="100"/>'
                +     '<line x1="0"   y1="140" x2="320" y2="140"/>'
                +     '<line x1="60"  y1="0"   x2="60"  y2="170"/>'
                +     '<line x1="160" y1="0"   x2="160" y2="170"/>'
                +     '<line x1="240" y1="0"   x2="240" y2="170"/>'
                +   '</g>'
                +   '<g stroke="#dfe2e7" stroke-width="2" stroke-linecap="round">'
                +     '<line x1="0"   y1="70"  x2="320" y2="70"/>'
                +     '<line x1="100" y1="0"   x2="100" y2="170"/>'
                +     '<line x1="200" y1="0"   x2="200" y2="170"/>'
                +     '<line x1="280" y1="0"   x2="280" y2="170"/>'
                +   '</g>'
                +   '<g fill="#e2e5ea">'
                +     '<rect x="70"  y="50"  width="22" height="14" rx="1"/>'
                +     '<rect x="170" y="50"  width="22" height="14" rx="1"/>'
                +     '<rect x="210" y="50"  width="22" height="14" rx="1"/>'
                +     '<rect x="70"  y="110" width="22" height="14" rx="1"/>'
                +     '<rect x="170" y="110" width="22" height="14" rx="1"/>'
                +   '</g>'
                +   '<circle cx="160" cy="85" r="32" fill="rgba(47,107,255,0.18)" stroke="rgba(47,107,255,0.50)" stroke-width="2"/>'
                +   '<g transform="translate(160 80)">'
                +     '<path d="M0 -22 C -8 -22 -13 -16 -13 -10 C -13 -2 0 11 0 11 C 0 11 13 -2 13 -10 C 13 -16 8 -22 0 -22 Z" fill="#2f6bff" stroke="#fff" stroke-width="2"/>'
                +     '<circle cx="0" cy="-11" r="4" fill="#fff"/>'
                +   '</g>'
                + '</svg>';
        }

        // Tiny pin glyph for the Maps-style location label that overlays the
        // map card. Same blue as the radius ring so the row reads as a unit.
        var MAP_PIN_GLYPH = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true">'
            + '<path d="M6 0.8 C 3.8 0.8 2.2 2.4 2.2 4.4 C 2.2 7.2 6 11.2 6 11.2 C 6 11.2 9.8 7.2 9.8 4.4 C 9.8 2.4 8.2 0.8 6 0.8 Z" fill="#2f6bff" stroke="#fff" stroke-width="1"/>'
            + '<circle cx="6" cy="4.4" r="1.5" fill="#fff"/>'
            + '</svg>';

        function mapInnerHtml(desc) {
            return gpsMapSvg()
                + '<span class="nfw-map-label">' + MAP_PIN_GLYPH + esc(desc || '') + '</span>';
        }

        function consequenceChipsHtml(chips) {
            chips = (chips && chips.length) ? chips : DEFAULT_BLUE_CONSEQUENCE;
            return chips.map(function (ch, i) {
                return (
                    '<span class="' + chipClass(ch.color) + '" data-nfw="conschip" data-cons-idx="' + i + '">' +
                        slotHtml(ch.text, 'cons' + i) +
                        ' <span class="nfw-car">&#9662;</span>' +
                    '</span>'
                );
            }).join(' ');
        }

        // Build the static skeleton once. The verb chip slot-machines and
        // the description field typewrites. The time chip, consequence
        // chips, and note swap instantly (note crossfades 200ms).
        function buildSkeleton(initial) {
            return (
                '<div class="nfw-iosbar">' +
                    '<div class="nfw-iosbar-time">9:41</div>' +
                    '<div class="nfw-iosbar-island"></div>' +
                    '<div class="nfw-iosbar-icons">' + STATUS_ICONS + '</div>' +
                '</div>' +
                '<div class="nfw-stage">' +
                    '<div class="nfw-head">' +
                        '<span class="nfw-back" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7.5,2.5 3.5,6 7.5,9.5"/></svg></span>' +
                        '<span class="nfw-title">New Forfeit</span>' +
                        '<span class="nfw-spacer" aria-hidden="true"></span>' +
                    '</div>' +
                    '<div class="nfw-seg" data-nfw="seg">' +
                        '<span data-seg="one" class="nfw-seg-on">One time</span>' +
                        '<span data-seg="rep">Repeating</span>' +
                    '</div>' +
                    '<div class="nfw-body">' +
                        '<div class="nfw-line">' +
                            '<span class="nfw-txt">' + slotHtml(initial.prefix || "I'll", 'prefix') + '</span> ' +
                            '<span class="nfw-chip">' +
                                slotHtml(initial.verb, 'verb') +
                                '<span class="nfw-car">&#9662;</span>' +
                            '</span> ' +
                            '<span class="nfw-txt">' + slotHtml(initial.suffix || '', 'suffix') + '</span>' +
                        '</div>' +
                        '<div class="nfw-line nfw-desc-row" data-nfw="descRow">' +
                            '<span class="nfw-field">' +
                                '<span class="nfw-field-text" data-nfw="desc"></span>' +
                                '<i class="nfw-cur"></i>' +
                            '</span>' +
                        '</div>' +
                        '<div class="nfw-line nfw-desc-row is-hidden" data-nfw="mapRow">' +
                            '<div class="nfw-map" data-nfw="map"></div>' +
                        '</div>' +
                        '<div class="nfw-line">' +
                            '<span class="nfw-txt">Before</span> ' +
                            '<span class="nfw-chip">' +
                                slotHtml(initial.beforeTime || '09:00 tomorrow', 'time') + ' ' +
                                '<span class="nfw-car">&#9662;</span>' +
                            '</span>' +
                        '</div>' +
                        '<div class="nfw-line">' +
                            '<span class="nfw-txt">Or</span> ' +
                            '<span data-nfw="cons">' + consequenceChipsHtml(initial.consequenceChips) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="nfw-foot">' +
                        '<p data-nfw="note">Submit evidence in the Forfeit chat before the deadline. Submissions are reviewed automatically.</p>' +
                    '</div>' +
                '</div>' +
                '<div class="nfw-home-ind"></div>'
            );
        }

        function resolveContainer(target) {
            if (!target) return null;
            if (typeof target === 'string') return document.querySelector(target);
            return target;
        }

        function mount(target, options) {
            options = options || {};
            injectStyles();
            var container = resolveContainer(target);
            var NOOP_HANDLE = {
                destroy: function () {}, setPair: function () {},
                getPairCount: function () { return 0; },
                pause: function () {}, resume: function () {}
            };
            if (!container) return NOOP_HANDLE;

            var pairs = (options.pairs && options.pairs.length) ? options.pairs : DEFAULT_PAIRS;
            var autoplay = options.autoplay !== false;
            var startIndex = Math.max(0, Math.min(pairs.length - 1, options.startIndex | 0));
            var pauseMs = typeof options.cycleMs === 'number' ? Math.max(800, options.cycleMs - 2700) : 1500;
            var typeCharMs = 50;   // ~40-60ms per char while typing
            var eraseCharMs = 30;  // ~30ms per char while backspacing
            var slotMs = 380;      // matches the CSS transition

            container.classList.add('nfw');
            container.innerHTML = buildSkeleton(pairs[startIndex]);

            var descEl    = container.querySelector('[data-nfw="desc"]');
            var consEl    = container.querySelector('[data-nfw="cons"]');
            var noteEl    = container.querySelector('[data-nfw="note"]');
            var descRowEl = container.querySelector('[data-nfw="descRow"]');
            var mapRowEl  = container.querySelector('[data-nfw="mapRow"]');
            var mapEl     = container.querySelector('[data-nfw="map"]');

            // Prefix and suffix are rendered inside nfw-slotwrap spans (same
            // structure as the verb chip). They are full slot targets in
            // slotTargetsForPair, so slotAllToNext animates their text-slide
            // and width-morph in lockstep with the chip. No mid-flow display
            // flip and no clone-probe means no snap on the chip's left edge.

            // Show the right description row for `pair` immediately, no fade.
            // GPS pairs get the mini map card with a Maps-style location label.
            // Everything else gets the regular field + typewriter.
            function setDescRowInstant(pair) {
                var isGps = pair && pair.kind === 'gps';
                if (mapEl) mapEl.innerHTML = isGps ? mapInnerHtml(pair.desc) : '';
                if (descRowEl) {
                    descRowEl.classList.remove('is-fading');
                    descRowEl.classList.toggle('is-hidden', isGps);
                }
                if (mapRowEl) {
                    mapRowEl.classList.remove('is-fading');
                    mapRowEl.classList.toggle('is-hidden', !isGps);
                }
            }

            // Resolve the current slot element for a given key. We re-query
            // each cycle because consequence-chip slots can change order/key
            // when the parent container is re-rendered (color class swap).
            function getSlot(key) {
                return container.querySelector('[data-nfw="' + key + 'slot"]');
            }

            var idx = startIndex;
            var paused = !autoplay;
            var destroyed = false;
            var timers = [];
            var inAnimation = false;

            function schedule(fn, ms) {
                var t = setTimeout(function () { if (!destroyed) fn(); }, ms);
                timers.push(t);
                return t;
            }
            function clearTimers() {
                for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
                timers = [];
            }

            // Snapshot of the slot targets for a given pair. Each entry maps
            // a slot key to its next text. The consequence chip color class is
            // tracked separately and swapped on the chip element after the
            // slide finishes (the slide is what matters - chip bg can pop).
            function slotTargetsForPair(pair) {
                var chips = (pair.consequenceChips && pair.consequenceChips.length)
                    ? pair.consequenceChips : DEFAULT_BLUE_CONSEQUENCE;
                // Prefix, suffix, verb, time and consequence chips are all slot
                // targets. They share the exact same slot-slide + width-morph
                // path, so every word on the line glides up together in one
                // synchronized motion. No display-flip or clone-probe mid-flow
                // means no snap on the chip's left edge when the prefix width
                // changes (e.g. "I'll be" -> "I'll").
                var targets = {
                    prefix: pair.prefix || "I'll",
                    verb:   pair.verb   || '',
                    suffix: pair.suffix || '',
                    time:   pair.beforeTime || '09:00 tomorrow'
                };
                for (var i = 0; i < chips.length; i++) {
                    targets['cons' + i] = chips[i].text;
                }
                return targets;
            }

            // Slide every slot up by 1.2em in one synchronized transition.
            // Append the new text as a sibling span below the current one,
            // force a reflow, kick the transform, then on done remove the
            // old span and reset the transform with no transition. All slots
            // use the same easing + duration so they move as one. Each
            // slotwrap also width-morphs in lockstep so the parent chip
            // (verb / time / consequence) doesn't pop when verb width
            // changes between pairs.
            function slotAllToNext(nextPair, done) {
                var targets = slotTargetsForPair(nextPair);
                var slots = [];
                var wraps = [];
                Object.keys(targets).forEach(function (key) {
                    var slot = getSlot(key);
                    if (!slot) return;
                    var wrap = slot.parentNode;
                    var oldSpan = slot.firstElementChild;
                    // Pin the wrap to its current natural width before
                    // appending the new span (which would otherwise stretch
                    // the slot vertically; the wrap is overflow:hidden so
                    // its width is what we animate).
                    var fromWidth = oldSpan ? oldSpan.offsetWidth : wrap.offsetWidth;
                    wrap.style.width = fromWidth + 'px';
                    var newSpan = document.createElement('span');
                    newSpan.textContent = targets[key];
                    slot.appendChild(newSpan);
                    // Measure target width now (new span has its natural width
                    // because white-space:nowrap; wrap is overflow:hidden but
                    // offsetWidth is the intrinsic content width).
                    var toWidth = newSpan.offsetWidth;
                    // Width animates in parallel with the slide for both
                    // directions. Growing uses standard easing (linear-ish
                    // growth looks best widening). Shrinking uses a delayed
                    // easing curve that defers most of the narrowing to the
                    // back half of the slide, after the old span has mostly
                    // translated up and out of the wrap's clip window. This
                    // avoids any right-edge clipping while keeping the chip
                    // settling in lockstep with the new text.
                    var shrinking = toWidth < fromWidth;
                    slots.push(slot);
                    wraps.push({ wrap: wrap, newSpan: newSpan, fromWidth: fromWidth, toWidth: toWidth, shrinking: shrinking });
                });
                if (!slots.length) { done && done(); return; }
                // Drive the slide via a CSS keyframe class instead of a
                // transition. After the animation ends, remove the old span
                // and the class together. The slot has no inline transform,
                // so once `is-rolling` is gone the remaining (new) span sits
                // naturally at position 0. No reset, no down-bounce.
                /* eslint-disable no-unused-expressions */
                slots[0].offsetHeight;
                slots.forEach(function (s) { s.classList.add('is-rolling'); });
                // Kick the width morph on the next frame so the browser
                // commits the pinned starting width before the transition
                // begins. Both growing and shrinking wraps animate to the
                // new width over 380ms in parallel with the slide; direction
                // determines which easing class is applied.
                requestAnimationFrame(function () {
                    if (destroyed) return;
                    wraps.forEach(function (w) {
                        w.wrap.classList.add('is-morphing');
                        w.wrap.style.width = w.toWidth + 'px';
                    });
                });
                schedule(function () {
                    slots.forEach(function (s) {
                        var first = s.firstElementChild;
                        if (first) s.removeChild(first);
                        s.classList.remove('is-rolling');
                    });
                    // Width animation finished at slot end. Clear both
                    // easing classes and inline width on every wrap so the
                    // chip auto-sizes to the new content for the next cycle.
                    wraps.forEach(function (w) {
                        w.wrap.classList.remove('is-morphing');
                        w.wrap.style.width = '';
                    });
                    // Swap consequence chip color classes now that the new
                    // text is the only thing visible. The chip background
                    // pops; the slide already sold the motion.
                    applyConsequenceChipColors(nextPair);
                    // Footer note is static (set once in buildSkeleton) and
                    // never updates per-cycle.
                    done && done();
                }, slotMs + 20);
            }

            // Update the color class on each consequence chip element. Slot
            // text is already sliding inside; this only touches the chip's
            // outer class so the background swaps at the slide-end moment.
            function applyConsequenceChipColors(pair) {
                if (!consEl) return;
                var chips = (pair.consequenceChips && pair.consequenceChips.length)
                    ? pair.consequenceChips : DEFAULT_BLUE_CONSEQUENCE;
                var chipEls = consEl.querySelectorAll('[data-nfw="conschip"]');
                Array.prototype.forEach.call(chipEls, function (el, i) {
                    var ch = chips[i];
                    if (!ch) return;
                    el.className = chipClass(ch.color);
                    el.setAttribute('data-nfw', 'conschip');
                    el.setAttribute('data-cons-idx', String(i));
                });
            }

            // Instant render of every slot text + chip color for a pair.
            // Used on initial mount and by setPair({ animate: false }). Also
            // clears any inline width / morphing class left over by a slot
            // animation that got interrupted, so the wrap auto-sizes to the
            // new content with no transition.
            function setAllSlotsInstant(pair) {
                // Prefix and suffix are slot targets too - the forEach below
                // handles them like any other slot.
                var targets = slotTargetsForPair(pair);
                Object.keys(targets).forEach(function (key) {
                    var slot = getSlot(key);
                    if (!slot) return;
                    var wrap = slot.parentNode;
                    if (wrap) {
                        wrap.classList.remove('is-morphing');
                        wrap.style.width = '';
                    }
                    slot.classList.remove('is-rolling');
                    slot.innerHTML = '<span>' + esc(targets[key]) + '</span>';
                });
                applyConsequenceChipColors(pair);
                // Footer note is static, set once in buildSkeleton; do not
                // touch it here.
                setDescRowInstant(pair);
            }

            function typeIn(text, done, totalMs) {
                var i = 0;
                var perChar = totalMs ? Math.max(8, Math.floor(totalMs / Math.max(1, text.length))) : typeCharMs;
                descEl.textContent = '';
                function step() {
                    if (destroyed) return;
                    if (i >= text.length) { done && done(); return; }
                    descEl.textContent = text.slice(0, i + 1);
                    i++;
                    schedule(step, perChar);
                }
                step();
            }

            function eraseAll(done) {
                var text = descEl.textContent;
                function step() {
                    if (destroyed) return;
                    if (text.length === 0) { done && done(); return; }
                    text = text.slice(0, -1);
                    descEl.textContent = text;
                    schedule(step, eraseCharMs);
                }
                step();
            }

            // Animated transition: erase current desc, slide every blue chip
            // (verb + time + consequence chips) and the prefix/suffix text
            // up together, then type the next desc. The desc/map row only
            // fades when transitioning INTO or OUT OF a GPS pair; same-kind
            // transitions keep the row visible and let the typewriter handle
            // the text swap. Used by autoplay and animate=true.
            function animateTo(nextIdx, done) {
                if (destroyed) return;
                inAnimation = true;
                var prev = pairs[idx];
                var next = pairs[nextIdx];
                var prevIsGps = prev && prev.kind === 'gps';
                var nextIsGps = next && next.kind === 'gps';
                var rowKindChanged = prevIsGps !== nextIsGps;

                // Step 1: erase the typewriter (text pairs) so the field is
                // empty before the swap; for the GPS map there is nothing to
                // erase. Only the kind-change path touches row visibility.
                function startSlotsAndType() {
                    idx = nextIdx;

                    if (rowKindChanged) {
                        // Swap rows mid-transition while both are invisible.
                        // The OLD row already faded to 0; we unhide the new
                        // one pre-faded, then on the next frame drop the
                        // is-fading class so it transitions back to opacity 1.
                        if (mapEl && nextIsGps) mapEl.innerHTML = mapInnerHtml(next.desc);
                        if (nextIsGps) {
                            if (descRowEl) descRowEl.classList.add('is-hidden');
                            if (mapRowEl) {
                                mapRowEl.classList.add('is-fading');
                                mapRowEl.classList.remove('is-hidden');
                            }
                        } else {
                            if (mapRowEl) mapRowEl.classList.add('is-hidden');
                            if (descRowEl) {
                                descRowEl.classList.add('is-fading');
                                descRowEl.classList.remove('is-hidden');
                            }
                        }
                        requestAnimationFrame(function () {
                            if (destroyed) return;
                            if (descRowEl) descRowEl.classList.remove('is-fading');
                            if (mapRowEl)  mapRowEl.classList.remove('is-fading');
                        });
                    }
                    // Same-kind transitions: no row fade. Both pairs are
                    // either text (typewriter swaps the desc text) or both
                    // are GPS (rare; map content is refreshed below).
                    else if (nextIsGps && mapEl) {
                        mapEl.innerHTML = mapInnerHtml(next.desc);
                    }

                    var pending = nextIsGps ? 1 : 2;
                    function complete() {
                        pending--;
                        if (pending === 0) {
                            inAnimation = false;
                            done && done();
                        }
                    }
                    slotAllToNext(next, complete);
                    if (!nextIsGps) {
                        typeIn(next.desc, complete, slotMs);
                    } else {
                        // Map row has no typewriter; ensure descEl is empty so
                        // it's clean when we cycle back to a text pair next.
                        if (descEl) descEl.textContent = '';
                    }
                }

                // Begin: only fade the OLD row out when the row KIND is
                // changing (text <-> GPS map). For non-GPS -> non-GPS we just
                // erase the typewriter and let the next typeIn fill it back
                // in - the field itself stays on-screen the entire time.
                if (rowKindChanged) {
                    if (descRowEl && !prevIsGps) descRowEl.classList.add('is-fading');
                    if (mapRowEl  &&  prevIsGps) mapRowEl.classList.add('is-fading');
                }

                if (prevIsGps) {
                    // GPS map has nothing to erase; wait for the fade-out
                    // before swapping rows.
                    schedule(startSlotsAndType, 200);
                } else if (rowKindChanged) {
                    // Text -> GPS: erase the typewriter, then wait for the
                    // desc row fade-out before swapping in the map.
                    eraseAll(function () {
                        schedule(startSlotsAndType, 200);
                    });
                } else {
                    // Text -> text: erase the typewriter and immediately
                    // start slot slide + type-in. No row fade, no extra wait.
                    eraseAll(startSlotsAndType);
                }
            }

            function instantTo(nextIdx) {
                if (destroyed) return;
                clearTimers();
                inAnimation = false;
                idx = nextIdx;
                var next = pairs[nextIdx];
                setAllSlotsInstant(next);
                descEl.textContent = (next.kind === 'gps') ? '' : next.desc;
            }

            function cycle() {
                if (destroyed || paused) return;
                schedule(function () {
                    if (destroyed || paused) return;
                    var nextIdx = (idx + 1) % pairs.length;
                    animateTo(nextIdx, function () { cycle(); });
                }, pauseMs);
            }

            // Initial render: type the first description in, then either
            // start cycling (autoplay) or stop on it (static). GPS pairs
            // skip the typewriter and show the map card instead.
            setDescRowInstant(pairs[idx]);
            if (pairs[idx].kind === 'gps') {
                if (autoplay) cycle();
            } else if (autoplay) {
                typeIn(pairs[idx].desc, function () { cycle(); });
            } else {
                descEl.textContent = pairs[idx].desc;
            }

            return {
                destroy: function () {
                    destroyed = true;
                    clearTimers();
                    container.classList.remove('nfw');
                    container.innerHTML = '';
                },
                setPair: function (i, opts) {
                    if (destroyed) return;
                    var target = ((i % pairs.length) + pairs.length) % pairs.length;
                    if (target === idx && !inAnimation) return;
                    clearTimers();
                    var animate = !!(opts && opts.animate);
                    if (animate) {
                        animateTo(target, function () { if (autoplay && !paused) cycle(); });
                    } else {
                        instantTo(target);
                        if (autoplay && !paused) cycle();
                    }
                },
                // Erase the description in place and type a new one. Skips
                // for GPS pairs (they have a map, not a typewriter field).
                retypeDesc: function (text) {
                    if (destroyed || !descEl) return;
                    var current = pairs[idx];
                    if (current && current.kind === 'gps') return;
                    clearTimers();
                    eraseAll(function () { typeIn(String(text || ''), null); });
                },
                getPairCount: function () { return pairs.length; },
                pause: function () { paused = true; clearTimers(); },
                resume: function () {
                    if (destroyed || !paused) return;
                    paused = false;
                    if (autoplay) cycle();
                }
            };
        }

        window.NewForfeitWidget = {
            mount: mount,
            defaults: DEFAULT_PAIRS
        };
    })();
    