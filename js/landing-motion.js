/* One-time, progressive reveals. Content remains readable if enhancement fails. */
(() => {
    'use strict';

    function init() {
        if (!document.body.classList.contains('landing-premium') && !document.querySelector('.animate-on-scroll')) return;

        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const seen = new WeakSet();
        const pendingElements = new Set();
        const editorialTargets = '.premium-section-heading, .owner-premium-overview > .text-center, #funciones-corredor > div > .text-center, #seccion-garantia > div > h2, .broker-network h2, .broker-manifesto h2, .broker-final-cta > h2';
        let observer = null;

        function reveal(element) {
            if (!element || seen.has(element)) return;
            seen.add(element);
            pendingElements.delete(element);
            observer?.unobserve(element);
            element.classList.remove('landing-reveal-pending');
            element.classList.add('is-visible');
        }

        // Reliable check based on bounding rect (handles iOS Safari momentum scroll & toolbar collapse)
        function checkPendingVisibility() {
            if (pendingElements.size === 0) return;
            const vh = window.innerHeight || document.documentElement?.clientHeight || 800;
            const threshold = vh + 80;
            pendingElements.forEach(element => {
                try {
                    const rect = element.getBoundingClientRect();
                    if (rect.top <= threshold && rect.bottom >= -80) {
                        reveal(element);
                    }
                } catch {
                    reveal(element);
                }
            });
        }

        // Initialize single IntersectionObserver with threshold 0 and positive rootMargin.
        if ('IntersectionObserver' in window && !preference.matches) {
            observer = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        reveal(entry.target);
                    }
                }
            }, {
                threshold: 0,
                rootMargin: '0px 0px 80px 0px'
            });
        }

        // Keep the existing catalog hook compatible with dynamically inserted cards.
        window.marketplaceObserver = {
            observe(element) {
                if (!element || seen.has(element)) return;
                const vh = window.innerHeight || document.documentElement?.clientHeight || 800;
                let isOffscreen = false;
                try {
                    const rect = element.getBoundingClientRect();
                    isOffscreen = rect.top > vh - 20;
                } catch { }

                if (!observer || preference.matches || !isOffscreen) {
                    reveal(element);
                    return;
                }

                element.classList.add('landing-reveal-pending');
                pendingElements.add(element);
                observer.observe(element);
            },
            unobserve(element) {
                if (!element) return;
                pendingElements.delete(element);
                observer?.unobserve(element);
            },
            disconnect() {
                observer?.disconnect();
                pendingElements.forEach(reveal);
                pendingElements.clear();
            }
        };

        // Add auto-stagger to card grids and lists if not explicitly delayed
        document.querySelectorAll('.grid, .landing-journey-steps, ul, ol').forEach(container => {
            const children = Array.from(container.children).filter(child => child.classList?.contains('animate-on-scroll'));
            if (children.length > 1) {
                children.forEach((child, index) => {
                    const hasDelay = Array.from(child.classList).some(c => c.startsWith('delay-'));
                    if (!hasDelay) {
                        const staggerMs = Math.min((index % 4) * 80, 320);
                        if (staggerMs > 0) {
                            child.style.transitionDelay = `${staggerMs}ms`;
                        }
                    }
                });
            }
        });

        document.querySelectorAll(editorialTargets).forEach(element => element.classList.add('animate-on-scroll'));
        document.querySelectorAll('.animate-on-scroll').forEach(element => window.marketplaceObserver.observe(element));

        // Keyboard navigation and a changed OS preference always take priority over motion.
        document.addEventListener('focusin', event => {
            const element = event.target.closest('.animate-on-scroll');
            if (element) reveal(element);
        });

        window.addEventListener('beforeprint', () => {
            pendingElements.forEach(reveal);
        });

        preference.addEventListener?.('change', () => {
            if (!preference.matches) return;
            window.marketplaceObserver.disconnect();
            document.querySelectorAll('.animate-on-scroll').forEach(reveal);
        });

        // Multi-layer scroll & resize fallback for mobile (iOS Safari momentum scrolling & dynamic toolbars)
        let ticking = false;
        const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb => setTimeout(cb, 16));
        const onScrollOrResize = () => {
            if (pendingElements.size === 0) return;
            if (!ticking) {
                raf(() => {
                    checkPendingVisibility();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScrollOrResize, { passive: true });
        window.addEventListener('touchmove', onScrollOrResize, { passive: true });
        window.addEventListener('resize', onScrollOrResize, { passive: true });
        window.addEventListener('orientationchange', onScrollOrResize, { passive: true });

        // Initial layout settling passes: check if any pending elements entered view on load
        raf(checkPendingVisibility);
        setTimeout(checkPendingVisibility, 350);
        setTimeout(checkPendingVisibility, 800);
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
