# 핏로그 (FitLog AI) — Design System

Mobile app (iOS/Android, Expo). Korean UI. Reference mood: a friendly neighborhood-service app with hand-drawn illustrations — warm, light, playful, trustworthy. Not a gym app: no dark backgrounds, no neon, no aggressive sport imagery.

## Brand
- Product: 핏로그 — "말 한마디, 사진 한 장으로 끝내는 미션 중심 AI 건강 다이어리"
- Tone: 친근하고 가벼움. Short Korean sentences, polite (해요체).
- Signature: an English handwritten script tagline above the main headline, e.g. *"Just say it, FitLog logs it!"*

## Color
| Token | Hex | Use |
|---|---|---|
| primary | #2F6BFF | Main brand cobalt blue. Headlines' key words, full-bleed blue sections, active tab, primary filled buttons |
| primary-deep | #1F4FD8 | Pressed state, text on cream when emphasis needed |
| primary-soft | #E8EFFF | Chips, progress track, info rows |
| cream | #FFF9EE | Hero / illustration section background |
| surface | #FFFFFF | Cards, sheets, default page |
| ink | #1B1F2A | Body text |
| muted | #7A8194 | Captions, inactive tab icons |
| line | #E3E6EE | Dividers, card borders |
| success-yellow | #FFD43B | Mission success badge, stamp fill, streak flame, celebration confetti (with primary blue) |
| danger | #F05252 | Errors only |

Rules: blue + cream + white carry 90% of the screen. Yellow is a reward accent only (success, stamp, streak). No gradients.

## Typography
- Font: Pretendard (fallback: Noto Sans KR). English script accent: a casual handwritten script (e.g. "Caveat"), blue, used once per screen at most.
- Headline: 24–28px, bold, line-height 1.35, key words colored primary blue (e.g. "오늘 미션 **3개 중 2개** 완료!").
- Section title: 18px bold. Body: 14–15px regular, muted gray for descriptions. Caption: 12px.
- Center-aligned headlines in hero and blue sections; left-aligned inside cards and lists.

## Shape & Layout
- Screen padding 20px. Card radius 16px, 1px line border, no heavy shadows (at most a very soft 0 2px 8px rgba(27,31,42,0.06)).
- Buttons are **pills** (full radius):
  - Primary: filled blue, white text, height 48.
  - Secondary: white fill, 1.5px blue outline, blue text with a small line icon on the left (like "수거예약" button in reference).
  - Small header pill: outline blue, 12px text, top-right of header.
- Full-bleed blue sections (#2F6BFF background, white text, centered) used to break long scroll pages.
- Small "notice list" rows: a tiny blue pill label (e.g. "NEW", "미션") + one-line text + thin divider.
- Pagination dots: one elongated active pill + small dots.

## Illustration
- Hand-drawn ink line illustrations (thin black pen strokes, slightly sketchy), with **flat cobalt blue fills** on a few objects and occasional yellow accents. White/cream background, no outlines around the scene.
- Subjects: friendly people eating (burger set, rice bowl), drinking water, doing squats, walking, holding a phone and talking to it, a calendar with stamps.
- Feature icons: illustration inside a **circle outlined in blue** (~140px), as in reference service steps.

## Navigation
- Top header: logo mark (blue square badge with white line-drawn icon and "핏로그" text) on the left, small outline pill + hamburger on the right on landing; plain back-arrow + centered title on sub pages.
- Bottom tab bar (white, top divider, line icons + 10px labels): 오늘 · 달력 · 리포트 · 설정. Active = blue icon and label, inactive = muted gray.
- Side menu (from hamburger): full-height blue panel with white text links.

## Components specific to FitLog
- **Mission card**: white card, left: small category pill (식단 / 생활 / 운동), title (e.g. "단백질 30g 채우기"), progress bar (blue on primary-soft) with "24 / 30g". Success state: yellow circular check badge on the right + soft yellow tint.
- **Big input button**: large blue circular mic button (72px) centered, with a camera button and text field "말하거나 적어서 기록해요" beside it. Listening state: blue ripple rings.
- **Timeline item**: time (e.g. 12:40) on the left in muted text, food/exercise names, small chips for kcal and 단백질 g. "확인 필요" chip in yellow outline when uncertain.
- **Reward calendar**: 7-column grid; each day is a ring that fills blue by missions done (0–3); 3/3 = solid yellow stamp with a small hand-drawn star/check; streak pill "🔥 연속 11일" in yellow.
- **Celebration**: confetti in blue + yellow, short headline "미션 성공!" with script accent "Great job!".
