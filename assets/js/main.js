document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Initialize All Modules ---
    
    // We wrap these in try-catch blocks so one error doesn't break the whole site
    try { initHeroAnimation(); } catch (e) { console.error("Hero Anim Error:", e); }
    try { initServicesInteractions(); } catch (e) { console.error("Services Anim Error:", e); }
    try { initQuoteAnimation(); } catch (e) { console.error("Quote Anim Error:", e); }
    try { initInteractiveClients(); } catch (e) { console.error("Clients Error:", e); }
    try { initGSAPAnimations(); } catch (e) { console.error("GSAP Error:", e); }
    try { initContactFormAnimations(); } catch (e) { console.error("Contact Form Error:", e); }
    try { initHeroSlider(); } catch (e) { console.error("Slider Error:", e); }

/**
 * Auto-Sliding Hero Animation with Active Class
 */
function initHeroSlider() {
    const wrapper = document.getElementById('heroSliderWrapper');
    const slides = document.querySelectorAll('.hero-slider__slide');
    
    if (!wrapper || slides.length <= 1) return; // Only run if there are multiple slides
    
    let currentSlide = 0;
    const slideDuration = 5000; // 5 seconds per slide

    // 1. Initialize the first slide as active immediately
    slides[0].classList.add('active-slide');

    // 2. Auto-slide interval
    setInterval(() => {
        // Remove active class from the old slide
        slides[currentSlide].classList.remove('active-slide');

        // Move to the next slide
        currentSlide = (currentSlide + 1) % slides.length;
        wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;

        // Add active class to the new slide so its animations trigger
        slides[currentSlide].classList.add('active-slide');
    }, slideDuration);

}
    /**
     * [UPDATED] Services Interactions
     */
    function initServicesInteractions() {
        const gridContainer = document.getElementById('services-grid');
        
        // Safety: If no grid, stop here
        if (!gridContainer) return;

        // 1. Initialize Mobile Slider
        setupMobileSlider(gridContainer);

        // 2. Trigger Animations with Safety Check
        if (typeof ScrollTrigger !== "undefined") {
            // Force refresh to ensure positions are calculated correctly after images load
            setTimeout(() => ScrollTrigger.refresh(), 500); 
            initServiceGridAnimations();
        } else {
            // Fallback: If GSAP fails, make everything visible immediately
            const cards = document.querySelectorAll('.serv-mod__card');
            cards.forEach(card => card.style.opacity = '1');
        }
    }

    function setupMobileSlider(track) {
        if (document.querySelector('.serv-mod__nav-controls')) return;

        const navContainer = document.createElement('div');
        navContainer.className = 'serv-mod__nav-controls';
        navContainer.innerHTML = `
            <button class="serv-nav-btn prev" aria-label="Previous">&#10094;</button>
            <button class="serv-nav-btn next" aria-label="Next">&#10095;</button>
        `;
        
        if(track.parentNode) track.parentNode.appendChild(navContainer);

        const btnPrev = navContainer.querySelector('.prev');
        const btnNext = navContainer.querySelector('.next');
        let autoSlideInterval;

        const scrollAmount = () => {
            const card = track.querySelector('.serv-mod__card');
            return card ? card.offsetWidth + 16 : 300;
        };

        const slideNext = () => {
            if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
                track.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
            }
        };

        const slidePrev = () => {
            track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
        };

        btnNext.addEventListener('click', () => { stopAutoSlide(); slideNext(); startAutoSlide(); });
        btnPrev.addEventListener('click', () => { stopAutoSlide(); slidePrev(); startAutoSlide(); });

        track.addEventListener('touchstart', stopAutoSlide, { passive: true });
        track.addEventListener('touchend', startAutoSlide);
        track.addEventListener('mouseenter', stopAutoSlide);
        track.addEventListener('mouseleave', startAutoSlide);

        function startAutoSlide() {
            if (window.innerWidth < 1024) {
                if(autoSlideInterval) clearInterval(autoSlideInterval);
                autoSlideInterval = setInterval(slideNext, 3000);
            }
        }
        function stopAutoSlide() {
            if(autoSlideInterval) clearInterval(autoSlideInterval);
        }

        startAutoSlide();
        window.addEventListener('resize', () => { stopAutoSlide(); startAutoSlide(); });
    }

    /**
     * [FIXED] Service Grid Animations
     * Changes:
     * 1. Start trigger changed to "top 95%" so it triggers sooner.
     * 2. Added clearProps to ensure CSS takes over after animation.
     */
    function initServiceGridAnimations() {
        if (typeof gsap === "undefined") return;

        // Animate Title
        if(document.querySelector(".serv-mod__main-title")) {
            gsap.from(".serv-mod__main-title", {
                y: 30, opacity: 0, duration: 0.8,
                scrollTrigger: { trigger: ".serv-mod", start: "top 90%" }
            });
        }

        // Animate Cards
       const cards = document.querySelectorAll('.serv-mod__card');
    if(cards.length > 0) {
        gsap.fromTo(cards, 
            { y: 50, opacity: 0 }, // Start state
            { 
                y: 0, 
                opacity: 1, 
                duration: 0.6, 
                stagger: 0.15, 
                ease: "power2.out",
                scrollTrigger: { 
                    trigger: "#services-grid", 
                    start: "top 95%", 
                    toggleActions: "play none none reverse"
                },
                onComplete: function() {
                    // ERROR WAS HERE: Removing 'opacity' made them invisible again
                    // FIXED: Only clear 'transform' so hover effects work, but keep opacity
                    gsap.set(cards, { clearProps: "transform" }); 
                }
            }
        );
    }
}

    // --- Other Animations (Kept Simple) ---

    function initQuoteAnimation() {
        const quoteEl = document.querySelector('.quote-text');
        if (!quoteEl) return;
        const text = quoteEl.textContent;
        quoteEl.textContent = '';
        text.split('').forEach(char => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char;
            quoteEl.appendChild(span);
        });
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    quoteEl.querySelectorAll('span').forEach((span, i) => 
                        setTimeout(() => span.classList.add('visible'), i * 30));
                    obs.unobserve(quoteEl);
                }
            });
        }, { threshold: 0.5 });
        observer.observe(quoteEl);
    }

    function initInteractiveClients() {
        const logos = document.querySelectorAll('.slide img');
        logos.forEach(logo => logo.addEventListener('click', () => console.log(`Clicked logo: ${logo.alt}`)));
    }

    function initGSAPAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        
        if (document.querySelector('.trust-section')) {
            gsap.from(".trust-section__header", {
                y: 50, opacity: 0, duration: 1, ease: "power3.out",
                scrollTrigger: { trigger: ".trust-section", start: "top 85%" }
            });
            // Additional trust animations...
        }
    }

    function initContactFormAnimations() {
        if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
            const formElements = document.querySelectorAll('.pm-heading, .pm-input-group, .pm-textarea-group, .pm-btn-submit');
            if(formElements.length > 0) {
                gsap.from(formElements, {
                    scrollTrigger: { trigger: ".pm-form-container", start: "top 90%" },
                    y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power2.out"
                });
            }
        }
    }
});