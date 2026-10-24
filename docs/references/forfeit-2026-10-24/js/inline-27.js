
        document.addEventListener('DOMContentLoaded', function() {
            // Create Intersection Observer
            // Use lower threshold on mobile so animations trigger sooner
            const isMobile = window.innerWidth <= 768;
            const observerOptions = {
                root: null,
                rootMargin: isMobile ? '0px 0px -8% 0px' : '0px 0px -15% 0px',
                threshold: isMobile ? 0.05 : 0.05
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Add the visible class when element comes into view
                        entry.target.classList.add('animate-visible');
                        // Optional: Stop observing after animation triggers once
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe all elements with animate-on-scroll class
            const animatedElements = document.querySelectorAll('.animate-on-scroll');
            animatedElements.forEach(element => {
                observer.observe(element);
                // Race-fix: if the element is already in the viewport at
                // observer-attach time, IO can fail to fire on first paint
                // (esp. mobile). Mark it visible immediately so it doesn't
                // get stuck at opacity:0 until the user scrolls.
                const rect = element.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    element.classList.add('animate-visible');
                    observer.unobserve(element);
                }
            });
        });

        // Hero h1: "lose money" is now static (rotation removed).

        // Analytics helper - Stats, toasts, hero live pill
        (function(){
            let _0x1a=null;
            const _0x1b={'message':'User sent a message','submitPhoto':'Photo submitted','submitTimelapse':'Timelapse submitted','submitVideo':'Video submitted','submitAudio':'Voice memo submitted','createGoal':'Goal created','appealForfeit':'Appeal submitted','approveGoal':'Goal approved','failGoal':'Goal failed','skipGoal':'Goal skipped','editGoal':'Goal edited','phoneCall':'User called','sendSMS':'User texted','textFriend':'Partner notified','screenBlock':'Apps blocked','chargeUser':'User charged'};
            const _0x2a=()=>{};

            // Hero live pill: rolling label of the most recent action.
            const heroPill = document.getElementById('heroLivePill');
            const heroPillText = heroPill && heroPill.querySelector('.hero-pill-text');
            let heroLastType = null;
            let heroLastTime = null;
            const formatAgo = (time) => {
                if (!time) return '';
                const sec = Math.max(0, Math.floor((Date.now() - new Date(time).getTime()) / 1000));
                if (sec < 3) return 'just now';
                if (sec < 60) return `${sec}s ago`;
                if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
                return `${Math.floor(sec/3600)}h ago`;
            };
            const renderHeroPill = () => {
                if (!heroPillText || !heroLastType) return;
                const label = _0x1b[heroLastType] || 'Action performed';
                const ago = formatAgo(heroLastTime);
                heroPillText.textContent = ago ? `Live · ${label} · ${ago}` : `Live · ${label}`;
            };
            const updateHeroPill = (type, time) => {
                if (!heroPillText) return;
                const isNew = type !== heroLastType;
                heroLastType = type;
                heroLastTime = time;
                if (isNew) {
                    heroPillText.classList.add('fading');
                    setTimeout(() => {
                        renderHeroPill();
                        heroPillText.classList.remove('fading');
                    }, 180);
                } else {
                    renderHeroPill();
                }
            };
            // Tick the "ago" portion every second between polls.
            setInterval(() => { if (heroLastType) renderHeroPill(); }, 1000);
            // Fallback: if the cross-origin /api/messages fetch hasn't replaced
            // the pill within 5s (most often a CORS block on the API server),
            // swap the hardcoded "Live · setting up…" placeholder for a
            // friendlier static message so users don't see it stuck forever.
            setTimeout(() => {
                if (heroPillText && !heroLastType) {
                    heroPillText.textContent = 'Live · 912K messages sent';
                }
            }, 5000);

            const _0x3a=async()=>{try{const r=await fetch('https://message-counter-api-production.up.railway.app/api/messages');const d=await r.json();_statFails=0;const e=document.getElementById('messageCount');if(e)e.textContent=d.messageCount.toLocaleString('en-US');const be=document.getElementById('bentoMessageCount');if(be){const m=d.messageCount;be.textContent=m>=1e6?(m/1e6).toFixed(1).replace(/\.0$/,'')+'M':Math.floor(m/1000)+'K';}const c=['approveGoal','failGoal','editGoal','skipGoal','screenBlock','chargeUser','phoneCall','textFriend'];c.forEach(k=>{const el=document.getElementById(k+'Count');if(el&&d[k+'Count']){const old=el.textContent;const newVal=d[k+'Count'].toLocaleString('en-US');if(old!==newVal){el.textContent=newVal;el.classList.add('count-updated');setTimeout(()=>el.classList.remove('count-updated'),600);}}});if(d.lastAction&&d.lastAction.type){updateHeroPill(d.lastAction.type, d.lastAction.timestamp);if(d.lastAction.type!==_0x1a){_0x2a(d.lastAction.type,d.lastAction.timestamp,d.lastAction.location||'Unknown location');_0x1a=d.lastAction.type;}}}catch(e){if(++_statFails>=3&&_statInt){clearInterval(_statInt);_statInt=null;}}};
            let _statFails=0,_statInt=null;
            const syncActivityConsent = () => {
                if (_statInt) clearInterval(_statInt);
                _statInt = null;
                if (window.ForfeitPrivacy?.allowed('analytics')) {
                    _statFails = 0;
                    _statInt = setInterval(_0x3a, 5000);
                    _0x3a();
                }
            };
            window.ForfeitPrivacy?.subscribe(syncActivityConsent);
            syncActivityConsent();
        })();
    