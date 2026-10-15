/* 프로토타입 화면 연결: 버튼·탭의 글자를 보고 해당 화면으로 이동한다(Stitch HTML은 수정하지 않음). */
(function () {
  const routes = [
    [/^(오늘|오늘 미션 보기|닫기)$/, '02-home.html'],
    [/^(달력|달력 보러 가기)$/, '05-calendar.html'],
    [/^설정$/, '06-settings.html'],
    [/^(시작하기|둘러보기)$/, '02-home.html'],
    [/^저장하기/, '04-celebrate.html'],
    [/^다시 말하기/, '02-home.html'],
  ];
  document.querySelectorAll('a, button').forEach((el) => {
    const label = el.textContent.replace(/\b[a-z_]+\b/g, '').replace(/\s+/g, ' ').trim(); // 아이콘 이름 제거
    const hit = routes.find(([re]) => re.test(label));
    if (!hit || el.closest('[data-m-no-nav]')) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      if (document.body.dataset.screen === 'home' && /\bmic\b/.test(el.textContent)) return;
      e.preventDefault();
      document.body.style.transition = 'opacity .2s';
      document.body.style.opacity = 0;
      setTimeout(() => (location.href = hit[1]), 180);
    });
  });
  // 홈의 카메라·텍스트 입력은 음성 결과 시트로
  if (document.body.dataset.screen === 'home') {
    document.querySelectorAll('button').forEach((b) => {
      if (/\b(photo_camera|edit_note|arrow_upward|send)\b/.test(b.textContent)) {
        b.addEventListener('click', () => (location.href = '03-voice-result.html'));
      }
    });
  }
  // 화면 진입 페이드
  document.body.style.opacity = 0;
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity .3s';
    document.body.style.opacity = 1;
  });
})();
