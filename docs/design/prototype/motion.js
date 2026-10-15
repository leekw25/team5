/* 핏로그 프로토타입 모션 — Stitch HTML 위에 얹는 공통 스크립트.
   기준값은 awesome-ai-motion 카드 기본값:
   stagger 0.06s / 0.55s / 24px · bar-grow 1.05s power2.out · count-up · underline-draw 1.35s
   ripple-rings 1.6s×3 (0.4s 간격) · scale-pop 0.5s power3.out · particle-burst 80개 1.2s 중력 600 · stamp-impact 180ms
   transform·opacity만 움직이고, prefers-reduced-motion이면 모두 끈다. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_OUT = 'cubic-bezier(.22,1,.36,1)'; // power3.out 근사
  const EASE_BAR = 'cubic-bezier(.33,1,.68,1)'; // power2.out 근사
  const EASE_BACK = 'cubic-bezier(.34,1.56,.64,1)'; // back.out(1.5) 근사

  const css = `
  [data-m-reveal]{opacity:0;transform:translateY(24px)}
  [data-m-reveal].m-in{opacity:1;transform:none;transition:opacity .55s ${EASE_OUT},transform .55s ${EASE_OUT};transition-delay:var(--m-delay,0s)}
  .m-ripple{position:relative;isolation:isolate}
  .m-ripple::before,.m-ripple::after,.m-ripple>.m-ring{content:"";position:absolute;inset:0;border-radius:9999px;background:#2F6BFF;opacity:0;z-index:-1;animation:m-ring 2.4s cubic-bezier(.33,1,.68,1) infinite;pointer-events:none}
  .m-ripple::after{animation-delay:.4s}.m-ripple>.m-ring{animation-delay:.8s}
  .m-ripple.m-listening::before,.m-ripple.m-listening::after,.m-ripple.m-listening>.m-ring{animation-duration:1.6s}
  @keyframes m-ring{0%{transform:scale(1);opacity:.28}100%{transform:scale(1.5);opacity:0}}
  .m-pop{animation:m-pop .5s ${EASE_BACK} both}
  @keyframes m-pop{0%{transform:scale(0)}100%{transform:scale(1)}}
  .m-stamp{animation:m-stamp .18s cubic-bezier(.5,0,.75,0) both, m-shake .1s steps(2) .18s 2}
  @keyframes m-stamp{0%{transform:scale(1.2);opacity:0}100%{transform:scale(1);opacity:1}}
  @keyframes m-shake{0%{translate:2px -2px}100%{translate:-2px 2px}}
  .m-underline{background:linear-gradient(currentColor,currentColor) left bottom/0 3px no-repeat;transition:background-size 1.35s linear .3s}
  .m-underline.m-in{background-size:100% 3px}
  #m-confetti{position:fixed;inset:0;pointer-events:none;z-index:9999}
  .m-toast{position:fixed;left:50%;bottom:96px;translate:-50% 0;background:#1B1F2A;color:#fff;padding:10px 18px;border-radius:9999px;font-size:14px;z-index:9998;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis;animation:m-pop .4s ${EASE_BACK} both}
  @media (prefers-reduced-motion: reduce){[data-m-reveal]{opacity:1;transform:none}.m-ripple::before,.m-ripple::after,.m-ripple>.m-ring{display:none}}
  `;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

  // ── 1. 스크롤 리빌(stagger) ──
  // 섹션·카드·리스트 행을 자동으로 찾아 화면에 들어올 때 0.06초 간격으로 올라오게 한다.
  // 화면보다 큰 감싸개는 건너뛰고 그 안의 덩어리(카드·제목·문단·이미지)를 대상으로 삼는다.
  const revealTargets = document.querySelectorAll(
    '[class*="rounded-"], li, h1, h2, h3, p, img'
  );
  const groups = new Map();
  revealTargets.forEach((el) => {
    if (el.closest('nav, header, [data-m-reveal]')) return;
    const h = el.getBoundingClientRect().height;
    if (h < 24 || h > innerHeight * 0.6) return;
    if (el.closest('[class*="rounded-full"]') && el.getBoundingClientRect().height < 48) return; // 알약·배지 안쪽은 제외
    el.setAttribute('data-m-reveal', '');
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    groups.set(parent, i + 1);
    el.style.setProperty('--m-delay', `${Math.min(i, 6) * 0.06}s`);
  });

  // ── 2. 진행률 막대(bar-grow) + 숫자 카운트업 ──
  // 트랙 안의 채움 막대(w-1/2, style width 등)를 0에서 제 길이까지 1.05초에 채운다.
  const bars = [...document.querySelectorAll('[class*="rounded-full"] > [class*="rounded-full"]')].filter((b) => {
    const p = b.parentElement.getBoundingClientRect();
    return p.height > 0 && p.height <= 12 && b.getBoundingClientRect().width > 0;
  });
  bars.forEach((b) => {
    b.style.transformOrigin = 'left center';
    b.style.transform = 'scaleX(0)';
    b.dataset.mBar = '';
  });

  function countUp(el) {
    const m = el.textContent.match(/^(\D*)(\d[\d,]*)(.*)$/s);
    if (!m) return;
    const target = Number(m[2].replace(/,/g, ''));
    if (!target || target > 99999) return;
    const t0 = performance.now(), dur = 1000;
    const fmt = (n) => (m[2].includes(',') ? n.toLocaleString('ko-KR') : String(n));
    (function tick(now) {
      const p = Math.min(1, (now - t0) / dur), e = 1 - (1 - p) ** 2;
      el.textContent = m[1] + fmt(Math.round(target * e)) + m[3];
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  // ── 3. 헤드라인의 파란 강조 단어 밑줄(underline-draw) ──
  document.querySelectorAll('h1 [class*="text-primary"], h2 [class*="text-primary"], h1 span, h2 span').forEach((s) => {
    if (s.children.length || s.textContent.trim().length > 8) return;
    s.classList.add('m-underline');
    s.setAttribute('data-m-reveal', '');
  });

  // 화면에 들어오면 리빌·막대·카운트업 실행
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('m-in');
      if (el.dataset.mBar !== undefined) {
        el.style.transition = `transform 1.05s ${EASE_BAR}`;
        el.style.transform = 'scaleX(1)';
      }
      if (el.dataset.mCount !== undefined) countUp(el);
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  if (reduce) {
    document.querySelectorAll('[data-m-reveal]').forEach((el) => el.classList.add('m-in'));
    bars.forEach((b) => (b.style.transform = 'none'));
  } else {
    document.querySelectorAll('[data-m-reveal]').forEach((el) => io.observe(el));
    bars.forEach((b) => io.observe(b));
    // "13 / 30g", "1,500ml", "860 kcal" 같은 숫자 텍스트
    document.querySelectorAll('span, p, div').forEach((el) => {
      // 단위가 붙은 10 이상의 수치만 센다(“2개”처럼 작은 수는 그대로 둔다)
      const mm = el.textContent.trim().match(/^\D{0,3}(\d[\d,]*)\s?(g|ml|kcal|%)/);
      if (el.children.length || !mm || Number(mm[1].replace(/,/g, '')) < 10) return;
      el.dataset.mCount = '';
      io.observe(el);
    });
  }

  // ── 4. 마이크 리플(ripple-rings) ──
  const mic = [...document.querySelectorAll('button')].find((b) => /\bmic\b/.test(b.textContent));
  if (mic && !reduce) {
    mic.classList.add('m-ripple');
    mic.appendChild(Object.assign(document.createElement('span'), { className: 'm-ring' }));
  }

  // ── 5. 성공 배지 팝(scale-pop) — 노란 체크 배지가 보일 때 ──
  const badges = document.querySelectorAll('[class*="success-yellow"], [class*="bg-[#FFD43B]"]');
  const pio = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('m-pop');
      pio.unobserve(en.target);
    });
  }, { threshold: 0.6 });
  if (!reduce) badges.forEach((b) => b.getBoundingClientRect().width < 64 && pio.observe(b));

  // ── 6. 폭죽(particle-burst) — 시드 고정, 80개, 1.2초, 중력 600 ──
  function confetti(x = innerWidth / 2, y = innerHeight * 0.35, seed = 7) {
    if (reduce) return;
    const c = document.getElementById('m-confetti') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'm-confetti' }));
    const dpr = devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const colors = ['#2F6BFF', '#FFD43B', '#2F6BFF', '#FFD43B', '#E8EFFF'];
    const ps = Array.from({ length: 80 }, () => {
      const a = rnd() * Math.PI * 2, v = 240 + rnd() * 380;
      return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, r: 4 + rnd() * 5, c: colors[(rnd() * colors.length) | 0], rot: rnd() * 6 };
    });
    const t0 = performance.now(), life = 1200;
    (function frame(now) {
      const t = (now - t0) / 1000, p = (now - t0) / life;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (p >= 1) return c.remove();
      const fade = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1, k = 1 - 0.6 * p;
      ps.forEach((q) => {
        ctx.save();
        ctx.globalAlpha = fade; ctx.fillStyle = q.c;
        ctx.translate(q.x + q.vx * t, q.y + q.vy * t + 300 * t * t); // 중력 600px/s² → ½gt²
        ctx.rotate(q.rot + t * 6);
        ctx.fillRect(-q.r * k / 2, -q.r * k / 4, q.r * k, q.r * k / 2);
        ctx.restore();
      });
      requestAnimationFrame(frame);
    })(t0);
  }

  function toast(text) {
    const t = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'm-toast', textContent: text }));
    setTimeout(() => t.remove(), 1800);
  }

  // ── 7. 시연 인터랙션 ──
  // 오늘 홈: 마이크를 누르면 리플이 빨라지고(듣는 중) 1.4초 뒤 단백질 미션이 채워지며 폭죽.
  if (mic && document.body.dataset.screen === 'home') {
    mic.addEventListener('click', (e) => {
      e.preventDefault();
      mic.classList.add('m-listening');
      toast('듣는 중… "싸이버거 세트 먹고 콜라는 제로로"');
      setTimeout(() => {
        mic.classList.remove('m-listening');
        const proteinBar = bars[0];
        if (proteinBar) {
          proteinBar.style.transition = `transform 1.05s ${EASE_BAR}`;
          // 레이아웃 width 대신 transform으로 트랙 끝까지 늘린다
          const full = proteinBar.parentElement.getBoundingClientRect().width / proteinBar.offsetWidth;
          proteinBar.style.transform = `scaleX(${full})`;
        }
        setTimeout(() => {
          const r = mic.getBoundingClientRect();
          confetti(innerWidth / 2, Math.max(120, r.top - 200));
          toast('미션 성공! 오늘 3/3 완수 🎉');
        }, 1050);
      }, 1400);
    });
  }
  // 축하 화면: 열리자마자 폭죽 + 스탬프
  if (document.body.dataset.screen === 'celebrate') {
    setTimeout(() => confetti(innerWidth / 2, innerHeight * 0.3), 250);
    document.querySelectorAll('img').forEach((img) => img.classList.add('m-stamp'));
  }
  // 달력: 날짜 진행 링(progress-ring)을 12시 방향에서 1초 동안 채운다
  if (document.body.dataset.screen === 'calendar' && !reduce) {
    document.querySelectorAll('svg circle[stroke-dasharray]').forEach((c, i) => {
      const final = c.getAttribute('stroke-dashoffset') || '0';
      const len = (c.getAttribute('stroke-dasharray') || '100').split(/[ ,]/)[0];
      c.style.strokeDashoffset = len;
      setTimeout(() => {
        c.style.transition = 'stroke-dashoffset 1s cubic-bezier(.33,1,.68,1)';
        c.style.strokeDashoffset = final;
      }, 300 + i * 80);
    });
  }
  // 달력: 노란 스탬프(3/3 완수일)를 순서대로 쿵 찍는다
  if (document.body.dataset.screen === 'calendar' && !reduce) {
    document.querySelectorAll('[class*="success-yellow"], [class*="FFD43B"]').forEach((d, i) => {
      if (d.getBoundingClientRect().width > 64) return;
      d.style.opacity = 0;
      setTimeout(() => { d.style.opacity = ''; d.classList.add('m-stamp'); }, 400 + i * 70);
    });
  }
  window.fitlogConfetti = confetti;
})();
