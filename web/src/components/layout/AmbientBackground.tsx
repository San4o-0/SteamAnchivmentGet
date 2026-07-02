/* Living background behind every page — user-selectable scene (Settings):
 *  cosmos    — iridescent counter-rotating swirls + starfield + embers
 *  aurora    — calm drifting glow blobs + embers
 *  rain      — digital streaks falling (matrix vibe)
 *  grid      — synthwave floor scrolling toward a glowing horizon
 *  fireflies — soft drifting glow dots
 *  off       — nothing (static body backdrop only)
 * Purely decorative — fixed, pointer-events-none, aria-hidden, -z-10.
 * Keyframes live in index.css. Applies instantly via appearance events. */

import { useEffect, useState } from "react";
import {
  getBackground,
  onBackgroundChange,
  type Background,
} from "@/lib/appearance";

// Deterministic pseudo-random spread so scenes are stable across renders.
const rnd = (i: number, salt: number) =>
  (((i * 2654435761 + salt * 97) >>> 0) % 1000) / 1000;

const STARS = Array.from({ length: 46 }, (_, i) => ({
  left: `${rnd(i, 1) * 100}%`,
  top: `${rnd(i, 2) * 100}%`,
  size: 1 + Math.round(rnd(i, 3) * 2),
  duration: 2.4 + rnd(i, 4) * 4.4,
  delay: -rnd(i, 5) * 6,
  kind: i % 9 === 0 ? "star--mythic" : i % 4 === 0 ? "star--accent" : "",
}));

const SHOOTING = [
  { top: "12%", left: "8%", duration: 9, delay: 2 },
  { top: "34%", left: "55%", duration: 13, delay: 6.5 },
  { top: "62%", left: "22%", duration: 17, delay: 11 },
];

const EMBERS = Array.from({ length: 10 }, (_, i) => ({
  left: `${(rnd(i, 6) * 96 + 2).toFixed(1)}%`,
  size: 2 + (i % 3),
  duration: 14 + Math.round(rnd(i, 7) * 12),
  delay: -rnd(i, 8) * 22,
  tint: i % 8 === 0 ? "bg-gold/40" : i % 5 === 0 ? "bg-mythic/30" : "bg-accent/30",
}));

const DROPS = Array.from({ length: 26 }, (_, i) => ({
  left: `${(rnd(i, 9) * 98 + 1).toFixed(1)}%`,
  height: 12 + Math.round(rnd(i, 10) * 12), // vh
  duration: 3.2 + rnd(i, 11) * 4.2,
  delay: -rnd(i, 12) * 8,
}));

const FIREFLIES = Array.from({ length: 22 }, (_, i) => ({
  left: `${rnd(i, 13) * 96 + 2}%`,
  top: `${rnd(i, 14) * 90 + 5}%`,
  size: 3 + (i % 2),
  duration: 16 + Math.round(rnd(i, 15) * 14),
  delay: -rnd(i, 16) * 20,
  green: i % 6 === 0,
}));

// Static scene: fixed stars, no animation (uses a slice of the star spread).
const STATIC_STARS = Array.from({ length: 34 }, (_, i) => ({
  left: `${rnd(i, 17) * 100}%`,
  top: `${rnd(i, 18) * 100}%`,
  size: 1 + Math.round(rnd(i, 19) * 2),
  opacity: 0.25 + rnd(i, 20) * 0.55,
}));

function Embers() {
  return (
    <>
      {EMBERS.map((e, i) => (
        <span
          key={`e${i}`}
          className={`ember ${e.tint}`}
          style={{
            left: e.left,
            width: `${e.size}px`,
            height: `${e.size}px`,
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function Scene({ bg }: { bg: Background }) {
  switch (bg) {
    case "cosmos":
      return (
        <>
          <div className="swirl swirl-a" />
          <div className="swirl swirl-b" />
          {STARS.map((s, i) => (
            <span
              key={`s${i}`}
              className={`star ${s.kind}`}
              style={{
                left: s.left,
                top: s.top,
                width: `${s.size}px`,
                height: `${s.size}px`,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
          {SHOOTING.map((s, i) => (
            <span
              key={`f${i}`}
              className="shooting-star"
              style={{
                top: s.top,
                left: s.left,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
          <Embers />
        </>
      );

    case "aurora":
      return (
        <>
          <div className="aurora aurora-a" />
          <div className="aurora aurora-b" />
          <div className="aurora aurora-c" />
          <div className="aurora-curtain" />
          <Embers />
        </>
      );

    case "rain":
      return (
        <>
          {DROPS.map((d, i) => (
            <span
              key={`d${i}`}
              className="rain-drop"
              style={{
                left: d.left,
                height: `${d.height}vh`,
                animationDuration: `${d.duration}s`,
                animationDelay: `${d.delay}s`,
              }}
            />
          ))}
        </>
      );

    case "grid":
      return (
        <div className="synth-wrap">
          <div className="synth-sky" />
          <div className="synth-plane" />
          <div className="synth-horizon" />
        </div>
      );

    case "fireflies":
      return (
        <>
          <div className="firefly-dusk" />
          {FIREFLIES.map((f, i) => (
            <span
              key={`ff${i}`}
              className={`firefly ${f.green ? "firefly--green" : ""}`}
              style={{
                left: f.left,
                top: f.top,
                width: `${f.size}px`,
                height: `${f.size}px`,
                animationDuration: `${f.duration}s`,
                animationDelay: `${f.delay}s`,
              }}
            />
          ))}
        </>
      );

    // "off" = вимкнені АНІМАЦІЇ, а не порожнеча: застигла туманність + зорі.
    case "off":
      return (
        <>
          <div className="static-nebula" />
          {STATIC_STARS.map((s, i) => (
            <span
              key={`st${i}`}
              className="star-static"
              style={{
                left: s.left,
                top: s.top,
                width: `${s.size}px`,
                height: `${s.size}px`,
                opacity: s.opacity,
              }}
            />
          ))}
        </>
      );
  }
}

export function AmbientBackground() {
  const [bg, setBg] = useState<Background>(() => getBackground());

  useEffect(() => onBackgroundChange(setBg), []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <Scene bg={bg} />
    </div>
  );
}
