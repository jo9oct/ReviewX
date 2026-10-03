import { useEffect, useRef } from "react";

/**
 * Bidirectional scroll-reveal hook using IntersectionObserver.
 *
 * - Animates IN  when the element enters the viewport (scroll down or up).
 * - Resets to hidden when the element fully leaves the viewport,
 *   so it replays every time it comes back into view.
 *
 * Respects `prefers-reduced-motion` — no styles are applied at all when the
 * user has opted out of motion, so the element stays fully visible always.
 *
 * @param options.threshold  0–1 fraction visible before triggering. Default 0.1
 * @param options.delay      Stagger delay in ms. Default 0
 * @param options.distance   Translate distance in px. Default 40
 * @param options.duration   Transition duration in ms. Default 650
 */
export function useFadeIn<T extends HTMLElement = HTMLElement>(
  options: {
    threshold?: number;
    delay?: number;
    distance?: number;
    duration?: number;
  } = {},
) {
  const { threshold = 0.1, delay = 0, distance = 40, duration = 650 } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour the user's motion preference — leave element fully visible.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) return;

    const HIDDEN: Partial<CSSStyleDeclaration> = {
      opacity: "0",
      transform: `translateY(${distance}px)`,
      transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      willChange: "opacity, transform",
    };

    const VISIBLE: Partial<CSSStyleDeclaration> = {
      opacity: "1",
      transform: "translateY(0)",
    };

    function applyStyles(styles: Partial<CSSStyleDeclaration>) {
      Object.assign(el!.style, styles);
    }

    // Start hidden before first paint.
    applyStyles(HIDDEN);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        if (entry.isIntersecting) {
          // Element entered the viewport — animate in.
          applyStyles(VISIBLE);
          // Clean up will-change after the transition completes.
          const onEnd = () => {
            el.style.willChange = "auto";
            el.removeEventListener("transitionend", onEnd);
          };
          el.addEventListener("transitionend", onEnd);
        } else {
          // Element fully left the viewport — reset so it replays next time.
          // Skip the transition for the reset so it snaps back instantly.
          el.style.transition = "none";
          applyStyles(HIDDEN);
          // Re-enable transition on the next frame so the snap doesn't
          // interfere with the next enter animation.
          requestAnimationFrame(() => {
            if (el) {
              el.style.transition = HIDDEN.transition!;
              el.style.willChange = "opacity, transform";
            }
          });
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, delay, distance, duration]);

  return ref;
}
