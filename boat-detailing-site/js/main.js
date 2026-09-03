// Coastal Edge Boat Detailing — front-end interactions
// (Mobile nav toggle, smooth-scroll close, footer year, demo contact form)

document.addEventListener('DOMContentLoaded', () => {
  // ---- Footer year ----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Mobile nav toggle ----
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      navToggle.classList.toggle('is-active', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close mobile nav after tapping a link
    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- Header shadow on scroll ----
  const header = document.getElementById('siteHeader');
  if (header) {
    const toggleShadow = () => {
      header.style.boxShadow = window.scrollY > 8
        ? '0 6px 20px -12px rgba(11,46,79,.35)'
        : 'none';
    };
    toggleShadow();
    window.addEventListener('scroll', toggleShadow, { passive: true });
  }

  // ---- Contact form (front-end demo only) ----
  // NOTE: This does not send data anywhere yet. Wire it up to your backend,
  // a form service (e.g. Formspree, Netlify Forms), or an email API to
  // start receiving real quote requests.
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      // Simulate a network request so the UI feels real.
      setTimeout(() => {
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        if (note) {
          note.textContent = "Thanks! This demo form isn't connected yet — hook it up to your email or backend to receive real requests.";
        }
      }, 700);
    });
  }
});
