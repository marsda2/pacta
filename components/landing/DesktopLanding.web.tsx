import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import QRCode from 'react-native-qrcode-svg';

import { PactaLogo } from '@/components/brand/PactaLogo';
import { Pax } from '@/components/companion/Pax';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors } from '@/lib/theme';

import './landing.css';

const examples = [
  { label: 'Move a little', task: 'Go for a 20-minute walk', time: 'Before 18:00', icon: 'location', note: 'A little fresh air. A promise kept.', stake: '$3' },
  { label: 'Find your focus', task: 'Read ten pages of my book', time: 'Before 21:00', icon: 'focus', note: 'Ten pages closer. You showed up.', stake: '$2' },
  { label: 'Make some space', task: 'Give my desk a fresh start', time: 'Before 10:00', icon: 'camera', note: 'Clear desk. A little more headspace.', stake: '$5' },
] satisfies { label: string; task: string; time: string; icon: IconName; note: string; stake: string }[];

const methods = [
  { label: 'Live photo', icon: 'camera', title: 'A fresh photo. Real follow-through.', body: 'Take your proof inside Pacta, with your daily code in the frame. A small step that makes your promise tangible.', detail: 'Taken now. Made for this pact.', tag: 'LIVE CAMERA' },
  { label: 'Location', icon: 'location', title: 'Show up where you said you would.', body: 'Add a location to your pact. Check in from your phone when you get there, and give your intention a place in the real world.', detail: 'Your destination. Your commitment.', tag: 'LOCATION CHECK-IN' },
  { label: 'A witness', icon: 'witness', title: 'A little support goes a long way.', body: 'Invite someone you trust to witness your follow-through. They can review your pact through a simple link.', detail: 'A real person in your corner.', tag: 'WITNESS REVIEW' },
] satisfies { label: string; icon: IconName; title: string; body: string; detail: string; tag: string }[];

const questions = [
  ['What is a pact?', 'One specific task, a deadline, a small stake and a way to prove you followed through. Start with something you can actually do today.'],
  ['What happens if I miss my deadline?', 'Your stake moves into the Redemption Vault. Build your Trust Score and a streak of verified pacts to unlock eligible funds under your plan’s recovery rules. You can see your progress in the app.'],
  ['How does Pacta check my proof?', 'Pacta uses a live photo and the verification methods you choose, such as your location or a witness. Evidence can be reviewed by AI, with human review for eligible disputes and appeals.'],
  ['What if I’m having a difficult day?', 'Tell Pax. You can ask for an appeal and explain what happened. Depending on the review, a smaller recovery task may help you take the next step.'],
  ['Can I use Pacta on my computer?', 'You can explore the app here. Create and prove your pacts on your phone, where your camera and location are available. Scan the code below to open the mobile web app.'],
];

const brandStyle = {
  '--p-forest': colors.forest,
  '--p-forest-soft': colors.forestSoft,
  '--p-mint': colors.mint,
  '--p-mint-soft': colors.mintSoft,
  '--p-bg': colors.bg,
  '--p-surface': colors.surface,
  '--p-muted': colors.muted,
  '--p-border': colors.border,
  '--p-amber': colors.amber,
  '--p-aqua': colors.aqua,
  '--p-dark': colors.dark.bg,
} as CSSProperties;

function useMotion() {
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return motion;
}

function useVisible(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

function Typewriter({ value, motion }: { value: string; motion: boolean }) {
  const [length, setLength] = useState(motion ? 0 : value.length);
  useEffect(() => {
    if (!motion) return;
    let next = 0;
    const timer = window.setInterval(() => {
      next += 1;
      setLength(next);
      if (next >= value.length) window.clearInterval(timer);
    }, 42);
    return () => window.clearInterval(timer);
  }, [value, motion]);
  return <span className="p-typewriter" aria-label={value}><span aria-hidden="true">{motion ? value.slice(0, length) : value}</span></span>;
}

function Glyph({ name, size = 20, light = false }: { name: IconName; size?: number; light?: boolean }) {
  return <span className="p-glyph" aria-hidden="true"><Icon name={name} size={size} color={light ? colors.mint : colors.forest} /></span>;
}

function Arrow() { return <Glyph name="arrowRight" size={18} />; }

function PactDemo({ motion }: { motion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useVisible(ref);
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const running = motion && visible && pageVisible && !paused;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setScene((previous) => (previous + 1) % (examples.length * 3)), 2400);
    return () => window.clearInterval(timer);
  }, [running, scene]);
  const selected = Math.floor(scene / 3);
  const phase = scene % 3;
  const example = examples[selected];

  return (
    <div className="p-demo" ref={ref} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <div className="p-orbit p-orbit-one" aria-hidden="true" />
      <div className="p-orbit p-orbit-two" aria-hidden="true" />
      <div className="p-float p-float-proof"><span className="p-mini-icon"><Glyph name="camera" /></span><div><strong>Proof, not promises.</strong><span>A live photo does the talking.</span></div></div>
      <div className="p-phone" aria-label="Interactive example of a Pacta pact">
        <div className="p-phone-island" aria-hidden="true" />
        <div className="p-phone-status" aria-hidden="true"><span>9:41</span><span>● ▰</span></div>
        <div className="p-phone-top"><PactaLogo size={20} /><span className="p-profile">J</span></div>
        <div className="p-phone-greeting"><span>A little promise to yourself</span><h3>Let’s make it happen.</h3></div>
        <div className="p-task-card">
          <span className="p-label">MY NEXT PACT</span>
          <div className="p-task-line"><Glyph name={example.icon} size={24} /><div className="p-task-text"><Typewriter key={`${example.task}-${running}`} value={example.task} motion={running} /></div></div>
          <div className="p-task-meta"><span key={example.time} className="p-slot"><Glyph name="timer" size={13} /> {example.time}</span><span key={example.stake} className="p-slot">{example.stake} at stake</span></div>
          <div className="p-proof-chip"><Glyph name="camera" size={14} /> Live photo proof <Glyph name="check" size={13} /></div>
        </div>
        <div className="p-demo-steps" aria-label={`Example step ${phase + 1} of 3`}>
          {['Make a pact', 'Show your proof', 'Keep your word'].map((step, index) => <div className={`p-demo-step ${phase >= index ? 'is-active' : ''}`} key={step}><span>{phase > index ? <Glyph name="check" size={11} /> : index + 1}</span><small>{step}</small></div>)}
        </div>
        <div className="p-phone-pax"><Pax size={66} expression={phase === 2 ? 'happy' : 'idle'} animate={running} /><div key={`${selected}-${phase}`} className="p-pax-bubble">{phase === 0 ? 'One small pact. I’m with you.' : phase === 1 ? 'You did the work. Let’s make it count.' : example.note}</div></div>
        <div className="p-phone-bottom"><div><span>YOUR TRUST SCORE</span><strong><span key={phase} className="p-score-roll">{50 + phase * 15}</span><small> / 100</small></strong></div><div className="p-score-track"><span style={{ width: `${50 + phase * 15}%` }} /></div></div>
        <div className="p-phone-home" aria-hidden="true" />
      </div>
      <div className="p-float p-float-streak"><span className="p-streak-dot"><Glyph name="verified" size={23} /></span><div><strong>A promise kept.</strong><span>That’s how momentum starts.</span></div><span className="p-plus">+15</span></div>
      <div className="p-demo-controls" aria-label="Choose an example pact">
        {examples.map((item, index) => <button type="button" key={item.label} onClick={() => setScene(index * 3)} aria-pressed={selected === index} className={selected === index ? 'is-active' : ''}><Glyph name={item.icon} size={14} />{item.label}</button>)}
      </div>
      <span className="p-demo-caption">A little preview of your next good decision.</span>
    </div>
  );
}

function Verification() {
  const [selected, setSelected] = useState(0);
  const method = methods[selected];
  return (
    <section className="p-section p-verify p-container" id="proof" aria-labelledby="proof-title" data-reveal>
      <div className="p-section-heading"><span className="p-eyebrow">ACTIONS SPEAK. PROOF COUNTS.</span><h2 id="proof-title">You show up.<br /><span className="p-serif">We make it count.</span></h2><p>A real-world promise deserves real-world proof.</p></div>
      <div className="p-method-tabs" role="tablist" aria-label="Ways to prove your pact">
        {methods.map((item, index) => <button type="button" role="tab" id={`p-method-${index}`} aria-controls="p-method-panel" aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} key={item.label} onClick={() => setSelected(index)} onKeyDown={(event) => { let next = selected; if (event.key === 'ArrowRight') next = (selected + 1) % methods.length; else if (event.key === 'ArrowLeft') next = (selected + methods.length - 1) % methods.length; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = methods.length - 1; else return; event.preventDefault(); setSelected(next); document.getElementById(`p-method-${next}`)?.focus(); }}><Glyph name={item.icon} size={18} />{item.label}</button>)}
      </div>
      <div className="p-method-panel" role="tabpanel" id="p-method-panel" aria-labelledby={`p-method-${selected}`} tabIndex={0}>
        <div className={`p-proof-preview p-proof-preview-${selected}`}>
          <div className="p-proof-window" key={method.label}><div className="p-proof-window-top"><span className="p-live-dot" />{method.tag}<Glyph name={method.icon} size={17} /></div>
            <div className="p-proof-art"><div className="p-proof-art-ring" /><Glyph name={method.icon} size={76} />{selected === 0 ? <span className="p-daily-code">TODAY’S CODE <strong>P4CT</strong></span> : selected === 1 ? <span className="p-location-pill">You made it here.</span> : <span className="p-location-pill">Alex is in your corner.</span>}</div>
            <div className="p-proof-window-footer"><span className="p-round-check"><Glyph name="check" size={16} /></span><div><strong>{method.detail}</strong><span>One step closer to a promise kept.</span></div></div>
          </div><span className="p-proof-caption">Illustrative preview · verification depends on your pact</span>
        </div>
        <div className="p-method-copy" key={selected}><span className="p-eyebrow">0{selected + 1} / PROOF THAT FITS YOUR PACT</span><h3>{method.title}</h3><p>{method.body}</p><span className="p-text-link"><Glyph name="lock" size={16} /> Your phone. Your proof. Your pace.</span></div>
      </div>
    </section>
  );
}

function Vault({ motion }: { motion: boolean }) {
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const visible = useVisible(ref);
  return (
    <section className="p-dark-section" id="pax" ref={ref} aria-labelledby="pax-title">
      <div className="p-container">
        <div className="p-dark-heading" data-reveal><span className="p-eyebrow">ACCOUNTABILITY WITH A LITTLE HEART</span><h2 id="pax-title">A missed day.<br /><span className="p-serif">Not the end of your story.</span></h2><p>Meet Pax. A companion for the days you’re on a roll,<br className="p-desktop-br" /> and the days you need a smaller next step.</p></div>
        <div className="p-vault-layout" data-reveal>
          <div className="p-pax-scene"><div className="p-pax-halo" /><Pax size={240} expression={step === 0 ? 'worried' : step === 1 ? 'talking' : 'happy'} waving={step === 2} animate={motion && visible} /><div className="p-companion-bubble" key={step}>{step === 0 ? 'A hard day doesn’t erase your effort.' : step === 1 ? 'Let’s start small. One pact you can do today.' : 'See? You’re building your way back.'}<span>— Pax, in your corner</span></div></div>
          <div className="p-vault-card"><div className="p-vault-card-top"><span><Glyph name="wallet" size={19} /> REDEMPTION VAULT</span><span className="p-example-tag">EXAMPLE</span></div><div className="p-vault-balance">$5<span>.00</span><span className="p-vault-lock"><Glyph name={step === 2 ? 'verified' : 'lock'} size={20} /></span></div><p>{step === 0 ? 'A missed pact moves your stake here.' : step === 1 ? 'Every verified pact builds your way back.' : 'Your progress brings eligible funds closer to unlock.'}</p><div className="p-vault-progress"><div><span>Verified streak</span><strong>{step === 0 ? '0' : step === 1 ? '1' : '3'} / 3</strong></div><div className="p-vault-bars">{[0, 1, 2].map((bar) => <span key={bar} className={step === 2 || (step === 1 && bar === 0) ? 'is-filled' : ''} />)}</div><div className="p-vault-trust"><span>Trust Score</span><strong key={step} className="p-score-roll">{[50, 65, 80][step]}<small> / 100</small></strong></div></div><div className="p-vault-note"><Glyph name="help" size={15} /><span>Recovery follows your plan’s rules. Progress shown is an example.</span></div></div>
        </div>
        <div className="p-vault-tabs" aria-label="Explore a recovery journey">{['A missed day', 'A small next step', 'Momentum, rebuilt'].map((label, index) => <button type="button" aria-pressed={step === index} key={label} onClick={() => setStep(index)}><span>0{index + 1}</span>{label}</button>)}</div>
        <div className="p-bento" data-reveal>
          <article><span className="p-bento-icon"><Glyph name="focus" light size={24} /></span><h3>A clear next step.</h3><p>One task. One deadline. Something small enough to start, specific enough to finish.</p><span className="p-bento-tag">LESS OVERTHINKING</span></article>
          <article><span className="p-bento-icon"><Glyph name="witnesses" light size={24} /></span><h3>Room to be human.</h3><p>Real life happens. Explain your situation and request an appeal when you need a fair review.</p><span className="p-bento-tag">MORE UNDERSTANDING</span></article>
          <article><span className="p-bento-icon"><Glyph name="progress" light size={24} /></span><h3>Progress you can feel.</h3><p>Watch your Trust Score grow as verified pacts turn good intentions into follow-through.</p><span className="p-bento-tag">ONE PACT AT A TIME</span></article>
        </div>
      </div>
    </section>
  );
}

export function DesktopLanding({ onPreview }: { onPreview: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const motion = useMotion();
  const [url] = useState(() => `${typeof window === 'undefined' ? 'https://pacta-theta.vercel.app' : window.location.origin}/onboarding`);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'PACTA — Good intentions. Meet follow-through.';
    return () => { document.title = previousTitle; };
  }, []);
  useEffect(() => {
    const node = root.current;
    if (!node || !motion || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.setAttribute('data-visible', 'true'); observer.unobserve(entry.target); }
      });
    }, { root: node, rootMargin: '0px 0px -4% 0px', threshold: 0.08 });
    node.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    node.setAttribute('data-enhanced', 'true');
    return () => { observer.disconnect(); node.removeAttribute('data-enhanced'); };
  }, [motion]);

  useEffect(() => {
    const node = root.current;
    const hero = node?.querySelector<HTMLElement>('.p-hero');
    const copy = node?.querySelector<HTMLElement>('.p-hero-copy');
    const dark = node?.querySelector<HTMLElement>('.p-dark-section');
    if (!node || !hero || !copy) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = node.scrollTop;
      const height = node.clientHeight;
      const mobile = window.innerWidth <= 850;
      const padding = getComputedStyle(hero);
      const space = hero.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom);
      const available = mobile ? space - copy.offsetHeight - parseFloat(padding.rowGap || '0') : space;
      const scale = Math.min(1, Math.max(0.25, available / (mobile ? 330 : 700)));
      const parallax = motion && window.matchMedia('(min-width: 851px) and (pointer: fine)').matches;
      const darkTop = dark ? dark.getBoundingClientRect().top - node.getBoundingClientRect().top : height;
      const darkShift = Math.max(-1, Math.min(1, (height * 0.45 - darkTop) / Math.max(height, 1))) * 32;
      const progress = top / Math.max(1, node.scrollHeight - height);
      node.style.setProperty('--p-demo-scale', String(scale));
      node.style.setProperty('--p-parallax-y', `${parallax ? Math.min(top, height) * 0.12 : 0}px`);
      node.style.setProperty('--p-pax-shift', `${parallax ? darkShift : 0}px`);
      node.style.setProperty('--p-page-progress', String(Math.min(1, Math.max(0, progress))));
      node.dataset.scrolled = String(top > 60);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    node.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    observer.observe(copy);
    return () => {
      node.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.style.setProperty('--p-parallax-y', '0px');
      node.style.setProperty('--p-pax-shift', '0px');
    };
  }, [motion]);

  const jumpTo = (id: string) => root.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: motion ? 'smooth' : 'instant', block: 'start' });

  return (
    <div className="pacta-landing" ref={root} style={brandStyle} data-motion={motion}>
      <a className="p-skip" href="#p-main">Skip to content</a>
      <header className="p-header"><div className="p-container p-nav"><a className="p-brand" href="#p-main" aria-label="Pacta home"><PactaLogo size={29} /></a><nav aria-label="Main navigation"><button type="button" onClick={() => jumpTo('how-it-works')}>How it works</button><button type="button" onClick={() => jumpTo('pax')}>Meet Pax</button><button type="button" onClick={() => jumpTo('faq')}>Questions?</button></nav><button type="button" className="p-button p-button-small" onClick={() => jumpTo('open-pacta')}>Try Pacta <Arrow /></button></div></header>
      <main id="p-main">
        <section className="p-hero p-container" aria-labelledby="hero-title">
          <div className="p-hero-copy"><h1 id="hero-title">Good intentions.<br />Meet <span className="p-serif p-hero-accent">follow-through.</span></h1><p className="p-hero-lead">Make a small promise. Put a little on the line.<br className="p-desktop-br" /> Show up for yourself, with Pax by your side.</p><div className="p-hero-actions"><button type="button" className="p-button" onClick={() => jumpTo('open-pacta')}>Make your first pact <Arrow /></button><button type="button" className="p-preview-link" onClick={onPreview}>Explore the app <span>↗</span></button></div><div className="p-hero-footnote"><span className="p-mini-pax"><Pax size={44} animate={false} /></span><span>Real proof. A fresh start when you need it.<br /><strong>A companion through all of it.</strong></span></div></div>
          <PactDemo motion={motion} />
          <button type="button" className="p-scroll-cue" onClick={() => jumpTo('how-it-works')} aria-label="Scroll to discover how Pacta works"><span className="p-scroll-track" aria-hidden="true" /><span>Scroll to explore</span><span className="p-scroll-chevron" aria-hidden="true">↓</span></button>
        </section>
        <div className="p-principles p-container" aria-label="Pacta principles"><span><Glyph name="pacts" size={16} />Small promises</span><span><Glyph name="camera" size={16} />Real-world proof</span><span><Glyph name="wallet" size={16} />A way to earn it back</span><span><Glyph name="copilot" size={16} />Pax in your corner</span></div>
        <section className="p-section p-how p-container" id="how-it-works" aria-labelledby="how-title" data-reveal><div className="p-section-heading p-heading-row"><div><span className="p-eyebrow">FROM “I SHOULD” TO “I DID”</span><h2 id="how-title">Big changes.<br /><span className="p-serif">Small beginnings.</span></h2></div><p>You don’t need a whole new you.<br />Just one promise you can keep today.</p></div><div className="p-how-grid">{[
          { icon: 'pacts', title: 'Make it a pact.', body: 'Choose one task, a deadline and a small stake. Give your good intention a little weight.', tag: '01 / THE PROMISE' },
          { icon: 'camera', title: 'Show you did it.', body: 'Send real proof from your phone. Your effort becomes something you can point to.', tag: '02 / THE FOLLOW-THROUGH' },
          { icon: 'verified', title: 'Keep the momentum.', body: 'A verified pact builds your Trust Score. Small wins make the next promise feel possible.', tag: '03 / THE GOOD FEELING' },
        ].map((item, index) => <article key={item.title} style={{ '--p-order': index } as CSSProperties}><div className="p-how-top"><span className="p-how-icon"><Glyph name={item.icon as IconName} size={26} /></span><span className="p-how-number">0{index + 1}</span></div><h3>{item.title}</h3><p>{item.body}</p><span className="p-label">{item.tag}</span></article>)}</div></section>
        <Verification />
        <Vault motion={motion} />
        <section className="p-section p-faq p-container" id="faq" aria-labelledby="faq-title" data-reveal><div><span className="p-eyebrow">A FEW THINGS YOU MIGHT WONDER</span><h2 id="faq-title">A little<br /><span className="p-serif">more clarity.</span></h2><p>Small print, in plain words.</p></div><div className="p-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span className="p-faq-plus" aria-hidden="true">+</span></summary><div><p>{answer}</p></div></details>)}</div></section>
        <section className="p-download p-container" id="open-pacta" aria-labelledby="download-title" data-reveal><div className="p-download-copy"><span className="p-eyebrow">YOUR NEXT GOOD DECISION</span><h2 id="download-title">One small pact.<br /><span className="p-serif">Start with today.</span></h2><p>Open Pacta on your phone. Make a promise<br className="p-desktop-br" /> to yourself that feels good to keep.</p><button type="button" className="p-button p-mobile-open" onClick={onPreview}>Open Pacta <Arrow /></button><button type="button" className="p-preview-link" onClick={onPreview}>Or explore the app here <span>↗</span></button></div><div className="p-qr-scene"><div className="p-qr-pax"><Pax size={115} waving animate={false} /></div><div className="p-qr-card"><div className="p-qr-code"><QRCode value={url} size={152} color={colors.forest} backgroundColor={colors.surface} /></div><strong>Your phone. Your first pact.</strong><span>Scan to open the mobile web app</span><span className="p-qr-url">{url.replace(/^https?:\/\//, '')}</span></div></div></section>
      </main>
      <footer className="p-footer p-container"><PactaLogo size={23} /><span>A little more faith in your follow-through.</span><span>© {new Date().getFullYear()} Pacta</span></footer>
    </div>
  );
}
