import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Animated SVG dog mascot for the Order Manager login screen.
 *
 * Poses are driven by a single `state` prop:
 *   - "idle"      : floating, blinking, eyes follow mouse
 *   - "username"  : head gently follows cursor while typing
 *   - "password"  : both paws raise to cover the eyes
 *   - "peek"      : one paw lowers so it can peek (password visible)
 *   - "loading"   : paws stay up, subtle waiting breath
 *   - "success"   : smiles, tail wags
 *   - "error"     : tilts head
 *
 * All animation is transform / attribute based to stay at 60 FPS.
 */

const TAN = '#C89B7B';
const TAN_DARK = '#A6785A';
const TAN_LIGHT = '#D9B48C';
const CREAM = '#F0E2D2';
const INK = '#2A1F1A';
const BLUSH = '#E8A59A';

const EYE = { left: { cx: 82, cy: 76 }, right: { cx: 118, cy: 76 }, r: 11 };
const PUPIL_R = 5;
const MAX_PUPIL = 4;

const PAW_REST = {
  left: { cx: 70, cy: 152, rotate: 0 },
  right: { cx: 130, cy: 152, rotate: 0 },
};
const PAW_COVER = {
  left: { cx: 84, cy: 80, rotate: -8 },
  right: { cx: 116, cy: 80, rotate: 8 },
};
const PAW_PEEK_RIGHT = { cx: 118, cy: 96, rotate: 22 };

const MOUTH = {
  neutral: 'M 86 100 Q 100 106 114 100',
  smile: 'M 83 97 Q 100 116 117 97',
  frown: 'M 86 108 Q 100 100 114 108',
  open: 'M 90 98 Q 100 112 110 98 Q 100 104 90 98',
};

function Eye({ side, pupil, blink }) {
  const { cx, cy, r } = EYE[side];
  const px = cx + pupil.x;
  const py = cy + pupil.y;
  return (
    <g>
      {/* sclera */}
      <circle cx={cx} cy={cy} r={r} fill="#FFFFFF" />
      {/* pupil */}
      <motion.circle
        cx={px}
        cy={py}
        r={PUPIL_R}
        fill={INK}
        animate={{ cx: px, cy: py }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.4 }}
      />
      {/* eye highlight */}
      <circle cx={px - 1.5} cy={py - 1.5} r={1.6} fill="#FFFFFF" />
      {/* eyelid (head-coloured) grows to cover the eye on blink */}
      <motion.ellipse
        cx={cx}
        cy={cy}
        rx={r + 1}
        ry={0}
        fill={TAN}
        animate={{ ry: blink ? r + 1 : 0 }}
        transition={{ duration: blink ? 0.09 : 0.12, ease: 'easeOut' }}
      />
    </g>
  );
}

export default function Mascot({ state = 'idle', size = 220 }) {
  const reduceMotion = useReducedMotion();
  const wrapRef = useRef(null);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [wiggle, setWiggle] = useState(false);

  // Eyes follow the mouse (rAF throttled for smooth 60fps).
  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        setPupil({ x: nx * MAX_PUPIL, y: ny * MAX_PUPIL });
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduceMotion]);

  // Random blinking.
  useEffect(() => {
    if (reduceMotion) return;
    let timeout;
    const loop = () => {
      const next = 2200 + Math.random() * 3200;
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, next);
    };
    loop();
    return () => clearTimeout(timeout);
  }, [reduceMotion]);

  // Occasional ear wiggle.
  useEffect(() => {
    if (reduceMotion) return;
    let timeout;
    const loop = () => {
      const next = 4000 + Math.random() * 4000;
      timeout = setTimeout(() => {
        setWiggle(true);
        setTimeout(() => setWiggle(false), 620);
        loop();
      }, next);
    };
    loop();
    return () => clearTimeout(timeout);
  }, [reduceMotion]);

  const isPasswordPose = state === 'password' || state === 'peek' || state === 'loading';
  const leftPaw = isPasswordPose ? PAW_COVER.left : PAW_REST.left;
  const rightPaw =
    state === 'peek' ? PAW_PEEK_RIGHT : isPasswordPose ? PAW_COVER.right : PAW_REST.right;

  const headFollow = state === 'username' && !reduceMotion;
  const headX = headFollow ? pupil.x * 1.6 : 0;
  const headY = headFollow ? pupil.y * 1.6 : 0;
  const headRotate = state === 'error' ? 12 : 0;

  const mouthPath =
    state === 'success' ? MOUTH.smile : state === 'error' ? MOUTH.frown : MOUTH.neutral;

  const tailWag = state === 'success' && !reduceMotion;
  const tailRotate = state === 'success' ? [0, 26, -16, 22, -10, 0] : [0, 6, 0];

  const floatY = reduceMotion ? 0 : [0, -8, 0];

  return (
    <div ref={wrapRef} className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 210"
        width="100%"
        height="100%"
        role="img"
        aria-label="Order Manager mascot"
        className="overflow-visible"
      >
        {/* ground shadow */}
        <motion.ellipse
          cx="100"
          cy="202"
          rx="42"
          ry="7"
          fill="#000000"
          opacity={0.28}
          animate={{ rx: [42, 38, 42], opacity: [0.28, 0.22, 0.28] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.g
          animate={{ y: floatY }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* tail */}
          <motion.g
            style={{ transformOrigin: '150px 158px' }}
            animate={{ rotate: tailRotate }}
            transition={
              tailWag
                ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <path
              d="M 150 158 Q 172 152 174 132 Q 175 120 164 124"
              fill="none"
              stroke={TAN_DARK}
              strokeWidth="11"
              strokeLinecap="round"
            />
          </motion.g>

          {/* body */}
          <ellipse cx="100" cy="160" rx="40" ry="27" fill={TAN} />
          <ellipse cx="100" cy="164" rx="26" ry="18" fill={CREAM} />

          {/* head group (follows cursor on username, tilts on error) */}
          <motion.g
            animate={{ x: headX, y: headY, rotate: headRotate }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
            style={{ transformOrigin: '100px 90px' }}
          >
            {/* ears */}
            <motion.ellipse
              cx="58"
              cy="40"
              rx="15"
              ry="22"
              fill={TAN_DARK}
              style={{ transformOrigin: '58px 56px' }}
              animate={{ rotate: wiggle ? -10 : -18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 12 }}
            />
            <motion.ellipse
              cx="142"
              cy="40"
              rx="15"
              ry="22"
              fill={TAN_DARK}
              style={{ transformOrigin: '142px 56px' }}
              animate={{ rotate: wiggle ? 10 : 18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 12 }}
            />

            {/* head */}
            <circle cx="100" cy="78" r="46" fill={TAN} />
            {/* muzzle */}
            <ellipse cx="100" cy="96" rx="24" ry="17" fill={TAN_LIGHT} />

            {/* cheeks */}
            <circle cx="66" cy="92" r="7" fill={BLUSH} opacity="0.55" />
            <circle cx="134" cy="92" r="7" fill={BLUSH} opacity="0.55" />

            {/* eyes */}
            <Eye side="left" pupil={pupil} blink={blink} />
            <Eye side="right" pupil={pupil} blink={blink} />

            {/* nose */}
            <ellipse cx="100" cy="90" rx="6" ry="4.4" fill={INK} />
            <circle cx="98" cy="88.5" r="1.4" fill="#FFFFFF" opacity="0.7" />

            {/* mouth */}
            <motion.path
              d={MOUTH.neutral}
              fill={state === 'success' ? INK : 'none'}
              stroke={INK}
              strokeWidth="3"
              strokeLinecap="round"
              animate={{ d: mouthPath }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            />
          </motion.g>

          {/* paws */}
          <motion.ellipse
            cx={leftPaw.cx}
            cy={leftPaw.cy}
            rx="13"
            ry="16"
            fill={TAN_DARK}
            animate={{ cx: leftPaw.cx, cy: leftPaw.cy, rotate: leftPaw.rotate }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{ transformOrigin: `${leftPaw.cx}px ${leftPaw.cy}px` }}
          />
          <motion.ellipse
            cx={rightPaw.cx}
            cy={rightPaw.cy}
            rx="13"
            ry="16"
            fill={TAN_DARK}
            animate={{ cx: rightPaw.cx, cy: rightPaw.cy, rotate: rightPaw.rotate }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{ transformOrigin: `${rightPaw.cx}px ${rightPaw.cy}px` }}
          />
        </motion.g>
      </svg>
    </div>
  );
}