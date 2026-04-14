import type { Transition } from "framer-motion";

export function getMotionTransition(
  prefersReducedMotion: boolean,
  normal: Transition
): Transition {
  if (prefersReducedMotion) {
    return { duration: 0.01 };
  }
  return normal;
}
