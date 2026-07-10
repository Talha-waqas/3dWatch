/* ==========================================================================
   AERA MAIN APP ORCHESTRATOR - GSAP & INTERACTIVITY
   ========================================================================== */

// Make sure GSAP ScrollTrigger is registered
gsap.registerPlugin(ScrollTrigger);

let lenis;

// --- Initialize Page ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Start Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 2. Initialize Lenis Smooth Scroll
    initSmoothScroll();

    // 3. Setup Magnetic Button Effects
    initMagneticButtons();

    // 4. Setup Navbar Interaction
    initNavbar();

    // 5. Setup Interactive Material Cards
    initMaterialSimulation();

    // 6. Setup Collections Equipment triggers
    initCollectionInteraction();

    // 7. Setup GSAP Scroll Animations
    setupScrollTimelines();
    
    // 8. Mobile Menu setup
    initMobileMenu();
});

// --- Lenis Smooth Scrolling ---
function initSmoothScroll() {
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Apple-like easing
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    // Tick lenis scroll loop inside requestAnimationFrame
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync ScrollTrigger with Lenis
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
}

// --- Magnetic Micro-Interactions for Buttons ---
function initMagneticButtons() {
    const magneticElements = document.querySelectorAll('.magnetic');

    magneticElements.forEach((el) => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            // Calculate hover cursor center delta offset
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            // Magnetic attraction pull
            gsap.to(el, {
                x: x * 0.35,
                y: y * 0.35,
                duration: 0.3,
                ease: "power2.out"
            });
        });

        el.addEventListener('mouseleave', () => {
            // Spring back into place
            gsap.to(el, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });
}

// --- Navbar Sticky Reveal ---
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Hide navbar scrolling down, reveal scrolling up
        if (currentScrollY > 150) {
            if (currentScrollY > lastScrollY) {
                navbar.style.transform = `translateY(-100%)`; // Slide up offscreen
            } else {
                navbar.style.transform = `translateY(0)`; // Slide down
                navbar.style.background = 'rgba(5, 5, 5, 0.92)'; // Solid translucent
            }
        } else {
            navbar.style.transform = `translateY(0)`;
            navbar.style.background = 'rgba(5, 5, 5, 0.7)'; // Lighter transparent
        }
        
        lastScrollY = currentScrollY;
    });

    // Navigation Link Active states on click / scroll
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            if (targetId === '#') {
                lenis.scrollTo(0);
                return;
            }
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Scroll target offset to leave spacing for navbar header
                lenis.scrollTo(targetElement, { offset: -30 });
                
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
}

// --- Materials Hover Simulation Trigger ---
function initMaterialSimulation() {
    const cards = document.querySelectorAll('.material-card');

    cards.forEach((card) => {
        const material = card.getAttribute('data-material');

        card.addEventListener('mouseenter', () => {
            // Apply visual border state highlight
            cards.forEach(c => c.className = 'material-card glass-card');
            card.classList.add(`active-${material}`);

            // Send trigger to 3D Watch renderer script
            if (typeof updateWatchMaterials === 'function') {
                updateWatchMaterials(material);
            }

            // Tilt watch towards card slightly in space
            if (material === 'titanium' || material === 'sapphire' || material === 'ceramic') {
                targetRotationY = 0.3;
            } else {
                targetRotationY = 0.7;
            }
            targetRotationX = 0.3;
        });

        card.addEventListener('mouseleave', () => {
            // Reset to defaults
            card.classList.remove(`active-${material}`);
        });
    });

    // Reset material when mouse leaves materials section
    const section = document.getElementById('materials');
    section.addEventListener('mouseleave', () => {
        cards.forEach(c => c.className = 'material-card glass-card');
        if (typeof updateWatchMaterials === 'function') {
            updateWatchMaterials('titanium');
        }
    });
}

// --- Collections Horizontal Equipment Button click ---
function initCollectionInteraction() {
    const buttons = document.querySelectorAll('.btn-card-interact');

    buttons.forEach((btn) => {
        const card = btn.closest('.collection-card');
        const variant = card.getAttribute('data-variant');

        btn.addEventListener('click', () => {
            if (typeof updateWatchMaterials === 'function') {
                updateWatchMaterials(variant);
            }
            
            // Set glowing feedback on the button
            btn.innerHTML = 'MATERIAL EQUIPPED';
            btn.style.borderColor = 'var(--color-gold)';
            btn.style.color = 'var(--color-gold)';
            
            // Reset others
            buttons.forEach(b => {
                if (b !== btn) {
                    b.innerHTML = 'Equip Material';
                    b.style.borderColor = '';
                    b.style.color = '';
                }
            });
        });
    });
}

// --- Mobile Navigation Overlay toggler ---
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const menu = document.querySelector('.nav-menu');
    let isOpen = false;

    menuBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
            menu.classList.add('open');
            menuBtn.innerHTML = '<i data-lucide="x"></i>';
            window.lucide.createIcons();
        } else {
            menu.classList.remove('open');
            menuBtn.innerHTML = '<i data-lucide="menu"></i>';
            window.lucide.createIcons();
        }
    });

    // Close when nav links are clicked
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (isOpen) {
                isOpen = false;
                menu.classList.remove('open');
                menuBtn.innerHTML = '<i data-lucide="menu"></i>';
                window.lucide.createIcons();
            }
        });
    });
}

// --- Main GSAP Scroll Animation Timeline ---
function setupScrollTimelines() {
    // 1. Text reveals on load (all devices)
    gsap.from(".hero-tagline", { opacity: 0, y: 15, duration: 1, delay: 0.2 });
    gsap.from(".hero-title", { opacity: 0, y: 30, filter: "blur(10px)", duration: 1.2, delay: 0.4 });
    gsap.from(".hero-subtitle", { opacity: 0, y: 15, duration: 1, delay: 0.6 });
    gsap.from(".hero-actions", { opacity: 0, y: 15, duration: 1, delay: 0.8 });
    gsap.from(".scroll-indicator", { opacity: 0, duration: 1, delay: 1 });

    let mm = gsap.matchMedia();

    // ==========================================
    // DESKTOP & TABLET ANIMATIONS (> 768px)
    // ==========================================
    mm.add("(min-width: 769px)", () => {
        // 2. HERO -> CRAFTSMANSHIP transition (watch moves left, tilts)
        gsap.timeline({
            scrollTrigger: {
                trigger: "#craftsmanship",
                start: "top bottom",
                end: "top top",
                scrub: 1.5,
                onUpdate: (self) => {
                    const prog = self.progress;
                    targetPositionX = -1.3 * prog;
                    targetRotationY = -0.5 - (0.4 * prog);
                    targetRotationX = 0.2 + (0.1 * prog);
                    targetCameraZoom = 5 - (0.6 * prog);
                }
            }
        });

        // Text & Stats fade-in for Craftsmanship
        gsap.from(".craft-content", {
            scrollTrigger: {
                trigger: "#craftsmanship",
                start: "top 60%",
                toggleActions: "play none none reverse"
            },
            opacity: 0,
            x: -50,
            duration: 1,
            ease: "power3.out"
        });
        
        gsap.from(".craft-card", {
            scrollTrigger: {
                trigger: "#craftsmanship",
                start: "top 60%",
                toggleActions: "play none none reverse"
            },
            opacity: 0,
            y: 80,
            stagger: 0.25,
            duration: 1.2,
            ease: "power4.out"
        });

        // 3. CRAFTSMANSHIP -> MATERIALS transition (watch moves right, rotates)
        gsap.timeline({
            scrollTrigger: {
                trigger: "#materials",
                start: "top bottom",
                end: "top top",
                scrub: 1.5,
                onUpdate: (self) => {
                    const prog = self.progress;
                    targetPositionX = -1.3 + (2.6 * prog);
                    targetRotationY = -0.9 + (1.4 * prog);
                    targetRotationX = 0.3 - (0.1 * prog);
                    targetCameraZoom = 4.4 + (0.4 * prog);
                }
            }
        });

        // Materials grid elements stagger animation
        gsap.from(".material-card", {
            scrollTrigger: {
                trigger: "#materials",
                start: "top 60%",
                toggleActions: "play none none reverse"
            },
            opacity: 0,
            y: 40,
            stagger: 0.1,
            duration: 0.8,
            ease: "power2.out"
        });

        // 4. MATERIALS -> EXPLODED VIEW transition (watch moves to center, zooms, rotates slightly, splits cogs)
        gsap.timeline({
            scrollTrigger: {
                trigger: "#exploded",
                start: "top bottom",
                end: "top 40%",
                scrub: 1.5,
                onUpdate: (self) => {
                    const prog = self.progress;
                    targetPositionX = 1.3 - (1.3 * prog);
                    targetPositionY = 0;
                    targetRotationY = 0.5 - (0.9 * prog);
                    targetRotationX = 0.2 + (0.35 * prog);
                    targetCameraZoom = 4.8 - (1.6 * prog);
                }
            }
        });

        // Explode timeline: scrub watch parts separation based on scroll through the exploded section
        gsap.timeline({
            scrollTrigger: {
                trigger: "#exploded",
                start: "top top",
                end: "bottom bottom",
                scrub: 1.5,
                onUpdate: (self) => {
                    const progress = self.progress;
                    targetExplodeFactor = progress * 1.05;
                    
                    const labels = document.querySelectorAll('.exploded-label-card');
                    
                    toggleHUDLabel(labels[0], progress > 0.12 && progress < 0.88);
                    toggleHUDLabel(labels[1], progress > 0.28 && progress < 0.88);
                    toggleHUDLabel(labels[2], progress > 0.44 && progress < 0.88);
                    toggleHUDLabel(labels[3], progress > 0.58 && progress < 0.88);
                    toggleHUDLabel(labels[4], progress > 0.72 && progress < 0.88);
                }
            }
        });

        // 5. EXPLODED VIEW -> COLLECTIONS transition (horizontal scroll layout)
        const collectionsTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: "#collections",
                start: "top top",
                end: "bottom bottom",
                scrub: 1.5,
                pin: ".collections-sticky-wrapper",
            }
        });

        collectionsTimeline.to(".collections-scroll-container", {
            xPercent: -68.8,
            ease: "none"
        });

        ScrollTrigger.create({
            trigger: "#collections",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5,
            onUpdate: (self) => {
                const prog = self.progress;
                targetExplodeFactor = 0;
                targetPositionX = 0;
                targetPositionY = 0;
                targetCameraZoom = 4.0;
                
                targetRotationY = -0.4 - (prog * Math.PI * 3.5);
                targetRotationX = 0.55 - (Math.sin(prog * Math.PI) * 0.18);
                
                if (prog > 0.18 && prog <= 0.48) {
                    updateWatchMaterials('stealth');
                    document.querySelector('.slide-indicator-line').style.transform = 'translateX(100%)';
                } else if (prog > 0.48 && prog <= 0.78) {
                    updateWatchMaterials('royal');
                    document.querySelector('.slide-indicator-line').style.transform = 'translateX(200%)';
                } else if (prog > 0.78) {
                    updateWatchMaterials('jade');
                    document.querySelector('.slide-indicator-line').style.transform = 'translateX(200%)';
                } else {
                    updateWatchMaterials('titanium');
                    document.querySelector('.slide-indicator-line').style.transform = 'translateX(0%)';
                }
            }
        });

        // 6. COLLECTIONS -> STORY transition (watch moves to background and dims)
        gsap.timeline({
            scrollTrigger: {
                trigger: "#story",
                start: "top bottom",
                end: "top top",
                scrub: 1.5,
                onUpdate: (self) => {
                    const prog = self.progress;
                    targetPositionX = 0;
                    targetPositionY = 0;
                    targetCameraZoom = 4.0 + (prog * 3);
                    targetRotationY = -0.4;
                    targetRotationX = 0.4;
                }
            }
        });

        // Parallax text mask slide-up in Story
        gsap.from(".story-text", {
            scrollTrigger: {
                trigger: "#story",
                start: "top 50%",
                toggleActions: "play none none reverse"
            },
            opacity: 0,
            y: 40,
            duration: 1,
            ease: "power2.out"
        });

        // 7. STORY -> TESTIMONIALS -> CTA transition (watch zooms, spins)
        gsap.timeline({
            scrollTrigger: {
                trigger: "#cta",
                start: "top bottom",
                end: "bottom bottom",
                scrub: 1.5,
                onUpdate: (self) => {
                    const prog = self.progress;
                    targetPositionX = 0;
                    targetCameraZoom = 7.0 - (prog * 3.5);
                    targetRotationY = -0.4 + (prog * Math.PI * 4);
                    targetRotationX = 0.4 - (prog * 0.1);
                }
            }
        });
    });

    // ==========================================
    // MOBILE ANIMATIONS (<= 768px)
    // ==========================================
    mm.add("(max-width: 768px)", () => {
        // Hero -> Craftsmanship: push watch slightly down to fit copy layout
        gsap.timeline({
            scrollTrigger: {
                trigger: "#craftsmanship",
                start: "top bottom",
                end: "top top",
                scrub: 1.5,
                onUpdate: (self) => {
                    const prog = self.progress;
                    targetPositionX = 0;
                    targetPositionY = -0.8 * prog;
                    targetRotationY = -0.5 - (0.5 * prog);
                    targetCameraZoom = 5.0 - (0.4 * prog);
                }
            }
        });

        gsap.from(".craft-content", {
            scrollTrigger: {
                trigger: "#craftsmanship",
                start: "top 75%",
                toggleActions: "play none none reverse"
            },
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: "power2.out"
        });

        // Craftsmanship -> Materials
        gsap.timeline({
            scrollTrigger: {
                trigger: "#materials",
                start: "top bottom",
                end: "top top",
                scrub: 1.5,
                onUpdate: (self) => {
                    const prog = self.progress;
                    targetPositionX = 0;
                    targetPositionY = -0.8 + (0.8 * prog); // Reset Y translation
                    targetRotationY = -1.0 + (1.2 * prog);
                    targetCameraZoom = 4.6;
                }
            }
        });

        gsap.from(".material-card", {
            scrollTrigger: {
                trigger: "#materials",
                start: "top 75%",
                toggleActions: "play none none reverse"
            },
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.6,
            ease: "power2.out"
        });

        // Materials -> Exploded View
        gsap.timeline({
            scrollTrigger: {
                trigger: "#exploded",
                start: "top bottom",
                end: "top top",
                scrub: 1.5,
                onUpdate: (self) => {
                    const prog = self.progress;
                    targetPositionX = 0;
                    targetPositionY = 0;
                    targetRotationY = 0.2 - (0.4 * prog);
                    targetRotationX = 0.2 + (0.35 * prog);
                    targetCameraZoom = 4.6 - (1.0 * prog);
                }
            }
        });

        // Exploded View scroll explode factor
        gsap.timeline({
            scrollTrigger: {
                trigger: "#exploded",
                start: "top top",
                end: "bottom bottom",
                scrub: 1.5,
                onUpdate: (self) => {
                    const progress = self.progress;
                    targetExplodeFactor = progress * 0.95;
                }
            }
        });

        // Collections Scroll triggers: update 3D materials as user scrolls past stacked cards
        const cards = document.querySelectorAll('.collection-card');
        cards.forEach((card) => {
            const variant = card.getAttribute('data-variant');
            
            ScrollTrigger.create({
                trigger: card,
                start: "top 70%",
                end: "bottom 30%",
                toggleActions: "play reverse play reverse",
                onEnter: () => {
                    updateWatchMaterials(variant);
                    gsap.to(card, { borderColor: "rgba(255, 255, 255, 0.15)", duration: 0.3 });
                },
                onEnterBack: () => {
                    updateWatchMaterials(variant);
                    gsap.to(card, { borderColor: "rgba(255, 255, 255, 0.15)", duration: 0.3 });
                },
                onLeave: () => {
                    gsap.to(card, { borderColor: "", duration: 0.3 });
                },
                onLeaveBack: () => {
                    gsap.to(card, { borderColor: "", duration: 0.3 });
                }
            });
        });

        // Story -> Testimonials -> CTA
        gsap.timeline({
            scrollTrigger: {
                trigger: "#cta",
                start: "top bottom",
                end: "bottom bottom",
                scrub: 1.5,
                onUpdate: (self) => {
                    const prog = self.progress;
                    targetPositionX = 0;
                    targetCameraZoom = 6.0 - (prog * 2.5);
                    targetRotationY = -0.4 + (prog * Math.PI * 3);
                    targetRotationX = 0.4 - (prog * 0.1);
                }
            }
        });
    });

    // Fade-in trigger helper
    gsap.from(".cta-card", {
        scrollTrigger: {
            trigger: "#cta",
            start: "top 60%",
            toggleActions: "play none none reverse"
        },
        opacity: 0,
        scale: 0.95,
        duration: 1.2,
        ease: "power4.out"
    });

    // Helper HUD toggle
    function toggleHUDLabel(element, shouldShow) {
        if (shouldShow) {
            element.classList.add('show');
        } else {
            element.classList.remove('show');
        }
    }
}
