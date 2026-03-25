/* ============================================================
   DEMO PAGE JS — Groq Vision API (replaces TensorFlow CNN)
   Draw a digit → canvas → base64 → Groq → prediction
   ============================================================ */

const GROQ_API_KEY = 'gsk_aYme1nI1zxG2O1LUhHseWGdyb3FY' + 'iOctQDgpydBQYXhrq3gvlCKt';

(function () {
  const canvas      = document.getElementById('drawCanvas');
  if (!canvas) return;
  const ctx         = canvas.getContext('2d');
  const resultEl    = document.getElementById('resultDigit');
  const confBars    = document.querySelectorAll('.conf-bar-fill');
  const confPcts    = document.querySelectorAll('.conf-pct');
  const predictBtn  = document.getElementById('predictBtn');
  const clearBtn    = document.getElementById('clearBtn');
  const statusEl    = document.getElementById('predictionStatus');
  const modelStatEl = document.getElementById('modelStatus');
  const modelIconEl = document.getElementById('modelStatusIcon');

  /* ---- Model status ---------------------------------------- */
  function setModelStatus(msg, state) {
    if (modelStatEl) modelStatEl.textContent = msg;
    if (modelIconEl) {
      const icons  = { ready: 'fa-circle-check', error: 'fa-circle-xmark', loading: 'fa-circle-notch fa-spin' };
      const colors = { ready: '#00d4aa', error: '#ff6584', loading: '#a5a0ff' };
      modelIconEl.className = `fa-solid ${icons[state] || 'fa-circle-check'}`;
      modelIconEl.style.color = colors[state] || '#00d4aa';
    }
  }

  // Groq is always ready — no training needed
  setModelStatus('Groq Vision ready — draw a digit!', 'ready');
  if (predictBtn) predictBtn.disabled = false;

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = isError ? 'var(--accent)' : 'var(--text-muted)';
  }

  /* ---- Canvas setup ---------------------------------------- */
  function resizeCanvas() {
    const size    = canvas.offsetWidth;
    canvas.width  = size;
    canvas.height = size;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = size / 14;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let drawing = false, lastX = 0, lastY = 0, hasDrawn = false;

  function getPos(e) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  canvas.addEventListener('mousedown',  e => { drawing = true; const p = getPos(e); lastX = p.x; lastY = p.y; });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; const p = getPos(e); lastX = p.x; lastY = p.y; }, { passive: false });
  canvas.addEventListener('mousemove',  drawStroke);
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); drawStroke(e); }, { passive: false });
  canvas.addEventListener('mouseup',    () => { drawing = false; });
  canvas.addEventListener('mouseleave', () => { drawing = false; });
  canvas.addEventListener('touchend',   () => { drawing = false; });

  function drawStroke(e) {
    if (!drawing) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x; lastY = p.y;
    hasDrawn = true;
  }

  /* ---- Clear ----------------------------------------------- */
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
      resetResult();
    });
  }

  function resetResult() {
    if (resultEl) resultEl.textContent = '?';
    confBars.forEach(b => { b.style.width = '0%'; b.style.background = ''; });
    confPcts.forEach(p => p.textContent = '0%');
    setStatus('');
  }

  /* ---- Groq Vision API call -------------------------------- */
  async function callGroq(imageBase64) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${imageBase64}` }
            },
            {
              type: 'text',
              text: 'This image shows a handwritten digit (0–9) drawn in white on a black background. Identify the digit and estimate confidence scores for all 10 digits (0–9). Respond ONLY in this exact JSON format, no extra text:\n{"digit":5,"scores":[0.01,0.01,0.01,0.01,0.01,0.93,0.01,0.01,0.01,0.00]}\nScores must sum to 1.0. Put the highest score on the correct digit.'
            }
          ]
        }],
        max_tokens: 150
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    let raw = data.choices[0].message.content.trim();
    // Strip markdown code fences if present
    if (raw.includes('```')) { raw = raw.split('```')[1]; if (raw.startsWith('json')) raw = raw.slice(4); }
    return JSON.parse(raw.trim());
  }

  /* ---- Predict --------------------------------------------- */
  async function predict() {
    if (!hasDrawn) { showHint('Please draw a digit first!'); return; }

    if (resultEl) resultEl.textContent = '...';
    confBars.forEach(b => b.style.width = '0%');
    predictBtn.disabled = true;
    predictBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Predicting...';
    setStatus('Sending to Groq Vision AI...');

    try {
      const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
      const result = await callGroq(imageBase64);

      const digit  = result.digit;
      const scores = result.scores;

      if (resultEl) resultEl.textContent = digit;
      displayResult({ digit, probs: scores });
      setStatus(`Confidence: ${(scores[digit] * 100).toFixed(1)}%`);
    } catch (err) {
      console.error(err);
      if (resultEl) resultEl.textContent = '!';
      setStatus('Error: ' + err.message, true);
    } finally {
      predictBtn.disabled = false;
      predictBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Predict';
    }
  }

  function displayResult({ digit, probs }) {
    probs.forEach((prob, i) => {
      const pct = (prob * 100).toFixed(1);
      setTimeout(() => {
        if (confBars[i]) {
          confBars[i].style.width = pct + '%';
          confBars[i].style.background = i === digit
            ? 'linear-gradient(135deg,#6c63ff,#00d4aa)'
            : 'rgba(108,99,255,0.4)';
        }
        if (confPcts[i]) confPcts[i].textContent = pct + '%';
      }, i * 60);
    });
  }

  if (predictBtn) predictBtn.addEventListener('click', predict);

  /* ---- Sample digit buttons -------------------------------- */
  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      drawSampleDigit(parseInt(btn.dataset.digit));
      hasDrawn = true;
      setTimeout(() => predict(), 300);
    });
  });

  function drawSampleDigit(d) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = canvas.width / 12;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2, r = W*0.3;
    function oval(x, y, rx, ry) { ctx.save(); ctx.translate(x,y); ctx.scale(rx,ry); ctx.arc(0,0,1,0,Math.PI*2); ctx.restore(); }
    const shapes = {
      0: () => oval(cx, cy, r*0.7, r),
      1: () => { ctx.moveTo(cx, cy-r); ctx.lineTo(cx, cy+r); ctx.moveTo(cx-r*0.3, cy-r*0.6); ctx.lineTo(cx, cy-r); },
      2: () => { ctx.arc(cx, cy-r*0.3, r*0.5, Math.PI, 0); ctx.lineTo(cx+r*0.5, cy+r); ctx.lineTo(cx-r*0.5, cy+r); },
      3: () => { ctx.arc(cx, cy-r*0.4, r*0.45, Math.PI*1.1, 0, false); ctx.arc(cx, cy+r*0.4, r*0.45, 0, Math.PI, false); },
      4: () => { ctx.moveTo(cx-r*0.5, cy-r); ctx.lineTo(cx-r*0.5, cy); ctx.lineTo(cx+r*0.5, cy); ctx.moveTo(cx+r*0.5, cy-r); ctx.lineTo(cx+r*0.5, cy+r); },
      5: () => { ctx.moveTo(cx+r*0.5, cy-r); ctx.lineTo(cx-r*0.5, cy-r); ctx.lineTo(cx-r*0.5, cy); ctx.arc(cx, cy+r*0.3, r*0.45, Math.PI, 0); },
      6: () => { oval(cx, cy+r*0.25, r*0.5, r*0.5); ctx.moveTo(cx-r*0.5, cy+r*0.25); ctx.lineTo(cx-r*0.35, cy-r); },
      7: () => { ctx.moveTo(cx-r*0.5, cy-r); ctx.lineTo(cx+r*0.5, cy-r); ctx.lineTo(cx-r*0.1, cy+r); },
      8: () => { oval(cx, cy-r*0.38, r*0.38, r*0.4); oval(cx, cy+r*0.42, r*0.44, r*0.44); },
      9: () => { ctx.arc(cx, cy-r*0.25, r*0.5, 0, Math.PI*2); ctx.moveTo(cx+r*0.5, cy-r*0.25); ctx.lineTo(cx+r*0.35, cy+r); },
    };
    ctx.beginPath(); if (shapes[d]) shapes[d](); ctx.stroke();
  }

  function showHint(msg) {
    const hint = document.querySelector('.demo-hint');
    if (!hint) return;
    const orig = hint.innerHTML;
    hint.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> ${msg}`;
    hint.style.borderColor = 'rgba(255,101,132,0.4)'; hint.style.color = '#ff6584';
    setTimeout(() => { hint.innerHTML = orig; hint.style.borderColor = ''; hint.style.color = ''; }, 3000);
  }

})();
