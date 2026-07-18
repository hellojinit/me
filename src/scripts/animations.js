// Motion-powered enhancements: hero entrance, scroll reveals, photo parallax.
// Bundled once by Astro and persists across ClientRouter navigations, so all
// per-page setup lives in init() and is torn down on astro:before-swap.
import { animate, inView, scroll, stagger } from 'motion';

const EASE = [0.16, 1, 0.3, 1]; // same curve as the page-in view transition

let cleanups = [];
let firstLoad = true;
let pendingInit = false;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function flush() {
  for (const stop of cleanups) stop();
  cleanups = [];
}

/* signature moment: staggered hero entrance (home only) */
function heroEntrance() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;
  const photo = hero.querySelector('.hero-photo');
  const hey = hero.querySelector('.hero-hey');
  const rule = hero.querySelector('.hey-rule');
  const blocks = hero.querySelectorAll('.hero-text h2');
  const t = firstLoad ? 0.15 : 0.05; // the root cross-fade is already playing on client-side navs

  if (photo) animate(photo, { opacity: [0, 1], scale: [0.97, 1] }, { duration: 0.8, ease: EASE });
  if (hey) animate(hey, { opacity: [0, 1], y: [14, 0] }, { duration: 0.6, delay: t, ease: EASE });
  if (rule) animate(rule, { scaleX: [0, 1] }, { duration: 0.7, delay: t + 0.15, ease: EASE });
  if (blocks.length)
    animate(
      blocks,
      { opacity: [0, 1], y: [18, 0] },
      { duration: 0.7, delay: stagger(0.1, { startDelay: t + 0.2 }), ease: EASE }
    );
}

/* generic scroll reveals: pages opt in via data-reveal / data-reveal-group */
function scrollReveals() {
  cleanups.push(
    inView(
      '[data-reveal]',
      (el) => {
        animate(el, { opacity: [0, 1], y: [24, 0] }, { duration: 0.7, ease: EASE });
        // no return value -> Motion unobserves: each element reveals once
      },
      { margin: '0px 0px -12% 0px' }
    ),
    inView(
      '[data-reveal-group]',
      (group) => {
        animate(
          [...group.children],
          { opacity: [0, 1], y: [24, 0] },
          { duration: 0.65, delay: stagger(0.1), ease: EASE }
        );
      },
      { margin: '0px 0px -10% 0px' }
    )
  );
}

/* subtle hero-photo parallax (desktop only) */
function heroParallax() {
  if (!window.matchMedia('(min-width: 768px)').matches) return;
  const figure = document.querySelector('[data-hero] .hero-photo');
  const img = figure?.querySelector('img');
  if (!img) return;
  // The entrance animates the <figure>; parallax owns the <img> transform.
  // The constant 1.1 scale over-zooms the cover crop so ±20px of travel never
  // reveals the figure edges (translate is ordered before scale).
  const anim = animate(img, { y: [20, -20], scale: [1.1, 1.1] }, { ease: 'linear' });
  const cancel = scroll(anim, { target: figure, offset: ['start end', 'end start'] });
  cleanups.push(() => {
    cancel();
    anim.stop(); // stop, not cancel: don't snap styles while the old page is captured
  });
}

function init() {
  flush();
  if (reducedMotion()) return; // CSS never pre-hid anything in this case
  heroEntrance();
  scrollReveals();
  heroParallax();
  firstLoad = false;
}

// swapRootAttributes() strips runtime <html> attributes on every client-side
// nav, and the deduped inline head script won't re-run — re-add the .js hook
// here; astro:after-swap fires after the swap but before the new page paints.
document.addEventListener('astro:after-swap', () => document.documentElement.classList.add('js'));

document.addEventListener('astro:before-swap', () => {
  flush(); // stop inView observers / scroll subscriptions bound to the old DOM
  pendingInit = true;
});

document.addEventListener('astro:page-load', () => {
  // Fires after every client-side swap, but ALSO at window `load` on the very
  // first view — pendingInit swallows that duplicate (init already ran below).
  if (!pendingInit) return;
  pendingInit = false;
  init();
});

// First view: this deferred module executes with the DOM ready. Don't wait for
// astro:page-load — on initial loads Astro fires it at window `load`, i.e.
// only after all images have downloaded.
init();
