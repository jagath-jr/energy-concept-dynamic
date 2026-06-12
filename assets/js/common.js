document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Mobile Menu Toggle ---
    const menuBtn = document.getElementById('menuBtn');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-links li a');

    if (menuBtn && navMenu) {
        // Toggle menu on click
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when a link is clicked (useful for single-page jumps)
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close menu if clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !menuBtn.contains(e.target) && navMenu.classList.contains('active')) {
                menuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    // --- 2. Active Link Highlighting (Updated for Node.js Routes) ---
    // This highlights the nav link corresponding to the current page
    const currentPath = window.location.pathname.replace(/\/$/, ""); // Remove trailing slash
    
    navLinks.forEach(link => {
        // Get the href attribute
        const linkPath = link.getAttribute('href').replace(/\/$/, "");
        
        // Check if the current URL matches the link
        // Special case for Home ('/') vs other pages
        if (linkPath === "" && (currentPath === "" || currentPath === "/index.html")) {
            link.classList.add('active');
        } 
        else if (linkPath !== "" && currentPath.includes(linkPath)) {
            // e.g. if we are on /services, highlight the link to /services
            link.classList.add('active');
        }
    });

    // --- 3. Sticky Header Logic ---
    const header = document.getElementById('headerWrapper');
    const stickyThreshold = 50; // Scroll amount before header gets sticky

    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > stickyThreshold) {
                header.classList.add('sticky');
            } else {
                header.classList.remove('sticky');
            }
        });
    }

    // --- 4. Footer Date (Auto-update Year) ---
    // Looks for an element with class .year or inside the footer text
    const yearSpan = document.querySelector('.footer-year'); 
    if(yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
});