/* One-time, progressive reveals. Content remains readable if enhancement fails. */
(() => {
    'use strict';

    function init() {
        if (!document.body.classList.contains('landing-premium')) return;

        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const seen = new WeakSet();
        const running = new Map();
        const pending = new Set();
        const editorialTargets = '.premium-section-heading, .owner-premium-overview > .text-center, #funciones-corredor > div > .text-center, #seccion-garantia > div > h2, .broker-network h2, .broker-manifesto h2, .broker-final-cta > h2';
        let observer;

        function show(element) {
            element.classList.remove('landing-reveal-pending');
            pending.delete(element);
        }

        function finish(element) {
            running.get(element)?.finish();
            running.delete(element);
            show(element);
        }

        function reveal(element) {
            element.classList.add('is-visible');
            observer?.unobserve(element);
            if (seen.has(element)) return;
            seen.add(element);
            if (preference.matches || typeof element.animate !== 'function') {
                show(element);
                return;
            }

            try {
                const animation = element.animate(
                    [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }],
                    { duration: window.innerWidth < 700 ? 850 : 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
                );
                running.set(element, animation);
                animation.oncancel = () => { running.delete(element); show(element); };
                animation.onfinish = () => {
                    show(element);
                    running.delete(element);
                    animation.cancel();
                };
            } catch {
                show(element);
            }
        }

        function configureObserver() {
            if (!('IntersectionObserver' in window) || preference.matches) return;
            observer?.disconnect();
            // Pixel margins are based on viewport height; IO percentage margins use width.
            const inset = window.innerWidth < 700 ? Math.round(window.innerHeight * 0.25) : 24;
            observer = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) reveal(entry.target);
                }
            }, { threshold: 0, rootMargin: `0px 0px -${inset}px 0px` });
            for (const element of pending) {
                if (!seen.has(element)) observer.observe(element);
            }
        }
        configureObserver();
        window.addEventListener('resize', configureObserver, { passive: true });

        // Keep the existing catalog hook compatible with dynamically inserted cards.
        window.marketplaceObserver = {
            observe(element) {
                element.classList.add('is-visible');
                if (seen.has(element) || pending.has(element)) return;
                const excluded = element.closest('.premium-hero, .premium-proof-rail, .landing-journey, #landing-featured-properties-section');
                const isBenefit = element.parentElement?.matches('.premium-story-grid, .owner-premium-grid, .broker-premium-grid');
                const isEditorial = element.matches(editorialTargets);
                const initialViewport = element.getBoundingClientRect().top < window.innerHeight + 32;
                if (!observer || preference.matches || typeof element.animate !== 'function' || (!isBenefit && !isEditorial) || excluded || initialViewport || !element.closest('main')) {
                    seen.add(element);
                    return;
                }
                element.classList.add('landing-reveal-pending');
                pending.add(element);
                observer.observe(element);
            },
            unobserve(element) { observer?.unobserve(element); },
            disconnect() {
                observer?.disconnect();
                for (const element of pending) { seen.add(element); finish(element); }
            }
        };

        document.querySelectorAll(editorialTargets).forEach(element => element.classList.add('animate-on-scroll'));
        document.querySelectorAll('.animate-on-scroll').forEach(element => window.marketplaceObserver.observe(element));

        // Keyboard navigation and a changed OS preference always take priority over motion.
        document.addEventListener('focusin', event => {
            const element = event.target.closest('.animate-on-scroll');
            if (!element) return;
            seen.add(element);
            observer?.unobserve(element);
            finish(element);
        });
        preference.addEventListener?.('change', () => {
            if (!preference.matches) return;
            window.marketplaceObserver.disconnect();
        });
        // Auto-advancing landing journey carousel on mobile with desktop-matching active effect
        document.querySelectorAll('.landing-journey').forEach(journey => {
            const steps = journey.querySelector('.landing-journey-steps');
            const cards = steps ? Array.from(steps.querySelectorAll('li')) : [];
            const dots = Array.from(journey.querySelectorAll('.landing-journey-dots span'));
            if (!steps || cards.length === 0) return;

            let currentIndex = 0;
            let autoPlayTimer = null;
            let pauseTimer = null;
            let isPaused = false;

            const setActiveIndex = (index, smoothScroll = false) => {
                currentIndex = index;
                cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
                dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

                if (smoothScroll && window.innerWidth < 700) {
                    const card = cards[index];
                    const targetLeft = card.offsetLeft - (steps.clientWidth - card.clientWidth) / 2;
                    steps.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
                }
            };

            // Set initial card as active
            setActiveIndex(0, false);

            const nextStep = () => {
                if (window.innerWidth >= 700 || isPaused) return;
                const nextIndex = (currentIndex + 1) % cards.length;
                setActiveIndex(nextIndex, true);
            };

            const startAutoplay = () => {
                stopAutoplay();
                autoPlayTimer = setInterval(nextStep, 2300);
            };

            const stopAutoplay = () => {
                if (autoPlayTimer) {
                    clearInterval(autoPlayTimer);
                    autoPlayTimer = null;
                }
            };

            const pauseTemporarily = () => {
                isPaused = true;
                if (pauseTimer) clearTimeout(pauseTimer);
                pauseTimer = setTimeout(() => {
                    isPaused = false;
                }, 2800);
            };

            // Detect active card on manual scroll
            let scrollTimeout = null;
            steps.addEventListener('scroll', () => {
                pauseTemporarily();
                if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
                scrollTimeout = requestAnimationFrame(() => {
                    const scrollCenter = steps.scrollLeft + steps.clientWidth / 2;
                    let closestIdx = 0;
                    let minDiff = Infinity;
                    cards.forEach((card, i) => {
                        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                        const diff = Math.abs(scrollCenter - cardCenter);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestIdx = i;
                        }
                    });
                    if (closestIdx !== currentIndex) {
                        currentIndex = closestIdx;
                        cards.forEach((card, i) => card.classList.toggle('is-active', i === currentIndex));
                        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
                    }
                });
            }, { passive: true });

            steps.addEventListener('touchstart', pauseTemporarily, { passive: true });
            steps.addEventListener('mouseenter', () => { isPaused = true; });
            steps.addEventListener('mouseleave', () => { isPaused = false; });

            dots.forEach((dot, i) => {
                dot.addEventListener('click', () => {
                    pauseTemporarily();
                    setActiveIndex(i, true);
                });
            });

            startAutoplay();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
