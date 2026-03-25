/* ============================================================
   HOME PAGE JS — particle canvas + digit grid animation
   ============================================================ */

/* ---- Particle Background ---------------------------------- */
(function () {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function rand(min, max) { return Math.random() * (max - min) + min; }

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = rand(0, W);
      this.y  = rand(0, H);
      this.r  = rand(1, 3);
      this.vx = rand(-0.3, 0.3);
      this.vy = rand(-0.3, 0.3);
      this.a  = rand(0.2, 0.7);
      this.char = String(Math.floor(Math.random() * 10));
      this.useChar = Math.random() > 0.7;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.globalAlpha = this.a;
      if (this.useChar) {
        ctx.fillStyle = '#6c63ff';
        ctx.font = `${this.r * 6}px monospace`;
        ctx.fillText(this.char, this.x, this.y);
      } else {
        ctx.fillStyle = '#6c63ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (let i = 0; i < 120; i++) particles.push(new Particle());

  // Draw connecting lines
  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.globalAlpha = (1 - dist / 100) * 0.15;
          ctx.strokeStyle = '#6c63ff';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    drawLines();
    particles.forEach(p => { p.update(); p.draw(); });
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ---- Digit Grid Animation --------------------------------- */
(function () {
  const grid = document.getElementById('digitGrid');
  if (!grid) return;

  const digits = [];
  for (let i = 0; i < 25; i++) {
    const cell = document.createElement('div');
    cell.className = 'digit-cell';
    cell.textContent = Math.floor(Math.random() * 10);
    grid.appendChild(cell);
    digits.push(cell);
  }

  function randomActivate() {
    // Reset all
    digits.forEach(d => d.classList.remove('active'));
    // Activate 3-5 random cells
    const count = Math.floor(Math.random() * 3) + 3;
    const shuffled = [...digits].sort(() => Math.random() - 0.5).slice(0, count);
    shuffled.forEach(cell => {
      cell.textContent = Math.floor(Math.random() * 10);
      cell.classList.add('active');
    });
    // Schedule random digit text changes
    digits.forEach(cell => {
      if (!cell.classList.contains('active')) {
        if (Math.random() > 0.6) cell.textContent = Math.floor(Math.random() * 10);
      }
    });
  }

  randomActivate();
  setInterval(randomActivate, 1200);
})();
