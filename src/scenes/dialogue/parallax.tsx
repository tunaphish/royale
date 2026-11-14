import * as React from 'react';
import { motion, MotionValue, useMotionValue, useSpring, useTransform } from 'framer-motion';

export type ParallaxOffset = { x: MotionValue<number>; y: MotionValue<number> };

const ParallaxContext = React.createContext<ParallaxOffset | null>(null);

/**
 * Tracks where the player is pointing as an offset from -1 to 1 on each axis,
 * relative to the center of the element. Uses motion values so moving the
 * pointer doesn't re-render React.
 *
 * Pointer events cover both mouse and touch drags. Device tilt can be added
 * here later without changing any layers.
 */
export const useParallaxOffset = (ref: React.RefObject<HTMLElement>): ParallaxOffset => {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 120, damping: 20 });
  const y = useSpring(rawY, { stiffness: 120, damping: 20 });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onPointerMove = (e: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      rawX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
      rawY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    element.addEventListener('pointermove', onPointerMove);
    return () => element.removeEventListener('pointermove', onPointerMove);
  }, [ref, rawX, rawY]);

  return { x, y };
};

export const ParallaxProvider = ParallaxContext.Provider;

/**
 * A full-size layer that shifts against the parallax offset.
 * `depth` is the most it moves, in pixels; nearer layers get a larger depth.
 * The layer extends `depth` pixels past each edge so shifting never shows a gap.
 */
export const ParallaxLayer = (props: {
  depth: number;
  className?: string;
  children?: React.ReactNode;
}): JSX.Element => {
  const { depth, className, children } = props;
  const offset = React.useContext(ParallaxContext);
  const fallback = useMotionValue(0);

  const x = useTransform(offset?.x ?? fallback, (v) => -v * depth);
  const y = useTransform(offset?.y ?? fallback, (v) => -v * depth);

  return (
    <motion.div
      className={className}
      style={{ position: 'absolute', inset: -depth, x, y }}
    >
      {children}
    </motion.div>
  );
};
