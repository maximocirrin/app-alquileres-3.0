/* One-time, progressive reveals. Content stays readable if enhancement fails. */
(() => {
    'use strict';

    function init() {
        if (!document.body?.classList.contains('landing-premium')) return;

        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const seen = new WeakSet();
        const running = new Map();
        const pending = new Set();
        const editorialTargets = '.premium-section-heading, .owner-premium-overview > .text-center, #funciones-corredor > div > .text-center, #seccion-garantia > div > h2, .broker-network h2, .broker-manifesto h2, .broker-final-cta > h2';
        let observer = null;

        function show(element) {
            element.classList.remove('landing-reveal-pending');
            element.classList.add('is-visible');
            pending.delete(element);
        }

        function finish(element) {
            const animation = running.get(element);
            if (animation) animation.finish();
            running.delete(element);
            show(element);
        }

        function getDelay(element) {
            const match = String(element.className || '').match(/(?:^|\s)delay-(\d+)(?:\s|$)/);
            return match ? Number(match[1]) : 0;
        }

        function releaseAfterPaint(animation) {
            const nextFrame = typeof window.requestAnimationFrame === 'function'
                ? callback => window.requestAnimationFrame(callback)
                : callback => callback();

            // WebKit can briefly restore the first transform when a finished animation is
            // cancelled in its onfinish callback. Two painted frames let the CSS end state
            // settle before releasing the animation from the compositor.
            nextFrame(() => nextFrame(() => {
                try {
                    animation.cancel();
                } catch { }
            }));
        }

        function reveal(element) {
            if (!element) return;
            element.classList.add('is-visible');
            observer?.unobserve(element);
            if (seen.has(element)) {
                finish(element);
                return;
            }

            seen.add(element);
            if (preference.matches || typeof element.animate !== 'function') {
                show(element);
                return;
            }

            try {
                const options = {
                    duration: window.innerWidth < 700 ? 850 : 700,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'both'
                };
                const delay = getDelay(element);
                if (delay > 0) options.delay = delay;

                const animation = element.animate(
                    [
                        { opacity: 0, transform: 'translateY(20px)' },
                        { opacity: 1, transform: 'translateY(0)' }
                    ],
                    options
                );
                running.set(element, animation);
                animation.oncancel = () => {
                    running.delete(element);
                    show(element);
                };
                animation.onfinish = () => {
                    show(element);
                    running.delete(element);
                    // Release the WAAPI transform so card and button hover states work normally.
                    releaseAfterPaint(animation);
                };
            } catch {
                show(element);
            }
        }

        function triggerInset() {
            return window.innerWidth < 700 ? Math.round(window.innerHeight * 0.25) : 24;
        }

        function configureObserver() {
            observer?.disconnect();
            observer = null;
            if (!('IntersectionObserver' in window) || preference.matches) return;

            const inset = triggerInset();
            observer = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) reveal(entry.target);
                }
            }, {
                threshold: 0,
                rootMargin: `0px 0px -${inset}px 0px`
            });

            for (const element of pending) {
                if (!seen.has(element)) observer.observe(element);
            }
        }
        configureObserver();

        // Bounding-rect fallback covers iOS momentum scrolling and dynamic toolbar resizes.
        function revealVisiblePending() {
            const trigger = window.innerHeight - triggerInset();
            for (const element of pending) {
                if (seen.has(element)) continue;
                try {
                    const rect = element.getBoundingClientRect();
                    if (rect.top <= trigger) reveal(element);
                } catch {
                    reveal(element);
                }
            }
        }

        function isExcluded(element) {
            const nestedTarget = element.querySelector?.('.animate-on-scroll');
            const excludedArea = element.closest?.('.premium-proof-rail, .landing-journey, #landing-featured-properties-section');
            const hidden = element.closest?.('[hidden], .hidden');
            return Boolean(nestedTarget || excludedArea || hidden || !element.closest?.('main'));
        }

        // Keep the existing hook used by dynamically inserted marketplace cards.
        window.marketplaceObserver = {
            observe(element) {
                if (!element) return;
                // App view switches may remove this class before registering an already-seen node.
                element.classList.add('is-visible');
                if (seen.has(element)) return;

                if (!observer || preference.matches || typeof element.animate !== 'function' || isExcluded(element)) {
                    seen.add(element);
                    show(element);
                    return;
                }

                const trigger = window.innerHeight - triggerInset();
                let shouldReveal = true;
                try {
                    const rect = element.getBoundingClientRect();
                    shouldReveal = rect.top <= trigger;
                } catch { }

                if (shouldReveal) {
                    reveal(element);
                    return;
                }

                element.classList.add('landing-reveal-pending');
                pending.add(element);
                observer.observe(element);
            },
            unobserve(element) {
                if (!element) return;
                observer?.unobserve(element);
                finish(element);
            },
            disconnect() {
                observer?.disconnect();
                for (const element of pending) {
                    seen.add(element);
                    finish(element);
                }
                for (const element of running.keys()) finish(element);
            }
        };

        document.querySelectorAll(editorialTargets).forEach(element => element.classList.add('animate-on-scroll'));
        document.querySelectorAll('.animate-on-scroll').forEach(element => window.marketplaceObserver.observe(element));

        // Keyboard navigation and reduced-motion changes always take priority.
        document.addEventListener('focusin', event => {
            const element = event.target.closest?.('.animate-on-scroll');
            if (!element) return;
            seen.add(element);
            observer?.unobserve(element);
            finish(element);
        });

        window.addEventListener('beforeprint', () => {
            window.marketplaceObserver.disconnect();
        });

        preference.addEventListener?.('change', () => {
            if (!preference.matches) return;
            window.marketplaceObserver.disconnect();
        });

        const onViewportChange = () => {
            configureObserver();
            revealVisiblePending();
        };
        window.addEventListener('resize', onViewportChange, { passive: true });
        window.addEventListener('orientationchange', onViewportChange, { passive: true });
        window.addEventListener('scroll', revealVisiblePending, { passive: true });
        window.addEventListener('touchmove', revealVisiblePending, { passive: true });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) for (const element of running.keys()) finish(element);
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
