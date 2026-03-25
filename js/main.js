/* ============================================================
   MAIN JS — Navbar, scroll, intersection observer
   ============================================================ */

// Navbar scroll effect
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// Mobile hamburger
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target)) navLinks.classList.remove('open');
  });
}

// Intersection Observer — fade-in on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.overview-card, .bg-card, .app-card, .team-card').forEach(el => {
  observer.observe(el);
});

// Counter animation
function animateCounter(el, target, duration = 1500) {
  const start = Date.now();
  const isFloat = String(target).includes('.');
  const update = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const value = isFloat
      ? (ease * target).toFixed(1)
      : Math.round(ease * target).toLocaleString();
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const card   = entry.target;
      const target = parseFloat(card.dataset.target);
      const span   = card.querySelector('.counter');
      if (span) animateCounter(span, target);
      counterObserver.unobserve(card);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.stat-card[data-target]').forEach(el => counterObserver.observe(el));

// Animate accuracy bars when visible
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.bar-fill[data-width]').forEach(bar => {
        setTimeout(() => { bar.style.width = bar.dataset.width + '%'; }, 200);
      });
      barObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.models-grid').forEach(el => barObserver.observe(el));

// Overview card staggered animation
const overviewObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay || 0);
      setTimeout(() => entry.target.classList.add('visible'), delay);
      overviewObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.overview-card[data-delay]').forEach(el => overviewObs.observe(el));
