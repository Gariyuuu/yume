const SHOOTING_STARS = [
  { top: "8%", left: "78%", duration: "5.5s", delay: "0s" },
  { top: "18%", left: "92%", duration: "6.5s", delay: "2.2s" },
  { top: "4%", left: "55%", duration: "7.5s", delay: "4.8s" },
  { top: "28%", left: "68%", duration: "6s", delay: "7.1s" }
];

const TWINKLE_STARS = [
  { top: "12%", left: "22%", size: 3, duration: "3.2s" },
  { top: "62%", left: "8%", size: 2, duration: "4.1s" },
  { top: "40%", left: "88%", size: 3, duration: "2.6s" },
  { top: "78%", left: "70%", size: 2, duration: "3.6s" },
  { top: "24%", left: "45%", size: 2, duration: "4.4s" }
];

/**
 * Purely decorative, fixed full-viewport night sky mounted once behind
 * everything in the root layout — see globals.css for the static
 * starfield background and the shooting-star/twinkle keyframes this
 * renders instances of.
 */
export function Starfield() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {SHOOTING_STARS.map((star, index) => (
        <span
          key={index}
          className="shooting-star"
          style={{ top: star.top, left: star.left, animationDuration: star.duration, animationDelay: star.delay }}
        />
      ))}
      {TWINKLE_STARS.map((star, index) => (
        <span
          key={index}
          className="star-twinkle absolute rounded-full bg-white"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            animationDuration: star.duration
          }}
        />
      ))}
    </div>
  );
}
