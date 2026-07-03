import { useEffect, useState, useRef, useCallback } from 'react';

// ── Types ──

export type AnimationVariant =
  | 'fadeIn' | 'fadeOut'
  | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight'
  | 'scaleIn' | 'scaleOut'
  | 'popIn' | 'bounceIn'
  | 'flipIn' | 'blurIn' | 'rotateIn';

export interface AnimationConfig {
  variant?: AnimationVariant;
  duration?: number;
  delay?: number;
  easing?: string;
  stagger?: number;
}

// ── Spring physics (CSS approximation) ──

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const SMOOTH = 'cubic-bezier(0.4, 0, 0.2, 1)';
const GENTLE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

const defaultConfig: Required<AnimationConfig> = {
  variant: 'fadeIn',
  duration: 400,
  delay: 0,
  easing: SMOOTH,
  stagger: 0,
};

// ── Core animation getter ──

export function getAnimationStyles(config: AnimationConfig = {}): React.CSSProperties {
  const cfg = { ...defaultConfig, ...config };

  const variants: Record<AnimationVariant, React.CSSProperties> = {
    fadeIn: { opacity: 0, transform: 'translateY(12px)' },
    fadeOut: { opacity: 0 },
    slideUp: { opacity: 0, transform: 'translateY(32px)' },
    slideDown: { opacity: 0, transform: 'translateY(-32px)' },
    slideLeft: { opacity: 0, transform: 'translateX(32px)' },
    slideRight: { opacity: 0, transform: 'translateX(-32px)' },
    scaleIn: { opacity: 0, transform: 'scale(0.85)' },
    scaleOut: { opacity: 0, transform: 'scale(1.15)' },
    popIn: { opacity: 0, transform: 'scale(0.5)' },
    bounceIn: { opacity: 0, transform: 'scale(0.3)' },
    flipIn: { opacity: 0, transform: 'perspective(600px) rotateX(90deg)' },
    blurIn: { opacity: 0, filter: 'blur(12px)' },
    rotateIn: { opacity: 0, transform: 'rotate(-15deg) scale(0.85)' },
  };

  return {
    ...variants[cfg.variant],
    transition: `all ${cfg.duration}ms ${cfg.easing} ${cfg.delay}ms`,
  };
}

// ── Mount animation (entrance) ──

export function useAnimateOnMount(config: AnimationConfig = {}) {
  const [visible, setVisible] = useState(false);
  const cfg = { ...defaultConfig, ...config };

  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(frame);
  }, []);

  return {
    style: visible
      ? { opacity: 1, transform: 'none', filter: 'none' }
      : getAnimationStyles(cfg),
  };
}

// ── Staggered animation (sequential reveal) ──

export function useStaggeredAnimation(
  itemCount: number,
  config: AnimationConfig = {}
) {
  const [visibleCount, setVisibleCount] = useState(0);
  const cfg = { ...defaultConfig, stagger: 50, ...config };

  useEffect(() => {
    if (visibleCount >= itemCount) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), cfg.stagger);
    return () => clearTimeout(timer);
  }, [visibleCount, itemCount, cfg.stagger]);

  const getItemStyle = useCallback(
    (index: number): React.CSSProperties => {
      if (index < visibleCount) {
        return { opacity: 1, transform: 'none', transition: `all ${cfg.duration}ms ${cfg.easing}` };
      }
      return getAnimationStyles({ ...cfg, delay: index * cfg.stagger });
    },
    [visibleCount, cfg]
  );

  return { getItemStyle, visibleCount };
}

// ── Scroll reveal (IntersectionObserver) ──

export function useScrollReveal(options: { threshold?: number; rootMargin?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: options.threshold ?? 0.1, rootMargin: options.rootMargin ?? '0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    style: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'none' : 'translateY(24px)',
      transition: `all 0.6s ${SMOOTH}`,
    } as React.CSSProperties,
  };
}

// ── Magnetic hover (element follows cursor slightly) ──

export function useMagneticHover(strength: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * strength;
    const dy = (e.clientY - cy) * strength;
    setOffset({ x: dx, y: dy });
  }, [strength]);

  const handleMouseLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  return {
    ref,
    offset,
    handlers: { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave },
    style: {
      transform: `translate(${offset.x}px, ${offset.y}px)`,
      transition: offset.x === 0 && offset.y === 0 ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'transform 0.1s ease-out',
    } as React.CSSProperties,
  };
}

// ── 3D Tilt on hover ──

export function useTilt(maxTilt: number = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  return {
    ref,
    style: {
      transform: `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
      transition: tilt.rotateX === 0 ? `transform 0.5s ${GENTLE}` : 'transform 0.1s ease-out',
      transformStyle: 'preserve-3d' as const,
    } as React.CSSProperties,
    handlers: {
      onMouseMove: (e: React.MouseEvent) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({ rotateX: -y * maxTilt, rotateY: x * maxTilt });
      },
      onMouseLeave: () => setTilt({ rotateX: 0, rotateY: 0 }),
    },
  };
}

// ── Press animation ──

export function usePressAnimation(config: { scale?: number; duration?: number } = {}) {
  const { scale = 0.96, duration = 120 } = config;
  const [isPressed, setIsPressed] = useState(false);

  return {
    style: {
      transform: isPressed ? `scale(${scale})` : 'scale(1)',
      transition: `transform ${duration}ms ${SPRING}`,
    } as React.CSSProperties,
    handlers: {
      onMouseDown: () => setIsPressed(true),
      onMouseUp: () => setIsPressed(false),
      onMouseLeave: () => setIsPressed(false),
    },
  };
}

// ── Ripple effect ──

export function useRipple() {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);

  const addRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now();

    setRipples((prev) => [...prev, { id, x, y, size }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
  }, []);

  return { ripples, addRipple };
}

// ── Counter animation ──

export function useCountUp(target: number, duration: number = 800) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
}

// ── Typewriter effect ──

export function useTypewriter(text: string, speed: number = 40) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

// ── Smooth counter with commas ──

export function useAnimatedNumber(target: number, duration: number = 600): string {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const from = value;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);

  return value.toLocaleString();
}
