import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound, isSoundEnabled } from '../../utils/sounds';
import arcwayLogo from '../../assets/logo/arcway_logo.png';

interface BootStep {
  label: string;
  detail: string;
  duration: number;
}

const BOOT_STEPS: BootStep[] = [
  { label: 'Initializing core systems', detail: 'Loading runtime environment and dependencies', duration: 600 },
  { label: 'Connecting package managers', detail: 'Detecting Flatpak, Yay, and Paru installations', duration: 700 },
  { label: 'Syncing package database', detail: 'Fetching latest app catalog from Flathub and AUR', duration: 800 },
  { label: 'Building UI components', detail: 'Preparing Material Design interface elements', duration: 500 },
  { label: 'Applying theme', detail: 'Loading color scheme and dynamic tokens', duration: 400 },
  { label: 'Finalizing', detail: 'Almost ready', duration: 300 },
];

interface SplashScreenProps {
  onComplete: () => void;
}

// ── Particle system ──
function Particles({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; hue: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.05,
        hue: Math.random() * 60 + 250, // purple-blue range
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(260, 60%, 70%, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef]);

  return null;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalDuration = BOOT_STEPS.reduce((a, b) => a + b.duration, 0);

  // Animate entrance
  useEffect(() => {
    const t1 = setTimeout(() => setLogoReady(true), 200);
    const t2 = setTimeout(() => setShowContent(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Boot sequence
  const advanceStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= BOOT_STEPS.length) {
        if (isSoundEnabled()) playSound('success');
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(onComplete, 600);
        }, 500);
        return next;
      }
      if (isSoundEnabled() && next > 0) playSound('tap');
      return next;
    });
  }, [onComplete]);

  useEffect(() => {
    if (currentStep >= BOOT_STEPS.length) return;
    const duration = BOOT_STEPS[currentStep].duration;
    stepTimerRef.current = setTimeout(advanceStep, duration);
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, [currentStep, advanceStep]);

  // Progress
  useEffect(() => {
    const elapsed = BOOT_STEPS.slice(0, currentStep).reduce((a, b) => a + b.duration, 0);
    setProgress(Math.min((elapsed / totalDuration) * 100, 100));
  }, [currentStep, totalDuration]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--md-sys-color-surface)',
      opacity: isExiting ? 0 : 1,
      transform: isExiting ? 'scale(1.03)' : 'scale(1)',
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
    }}>
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.7 }}
      />
      <Particles canvasRef={canvasRef} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(103,80,164,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
        position: 'relative', zIndex: 1,
        opacity: logoReady ? 1 : 0,
        transform: logoReady ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
      }}>
        <img
          src={arcwayLogo}
          alt="Arcway"
          style={{
            width: '88px', height: '88px',
            objectFit: 'contain',
            borderRadius: '18px',
            filter: 'drop-shadow(0 4px 20px rgba(103,80,164,0.3))',
          }}
        />
        <span style={{
          fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px',
          color: 'var(--md-sys-color-on-surface)',
        }}>
          Arcway
        </span>
      </div>

      {/* Loading section */}
      <div style={{
        position: 'relative', zIndex: 1,
        marginTop: '48px',
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
        width: '320px',
      }}>
        {/* Progress bar */}
        <div style={{
          width: '100%', height: '3px', borderRadius: '2px',
          backgroundColor: 'var(--md-sys-color-surface-variant)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            background: 'linear-gradient(90deg, var(--md-sys-color-primary), var(--md-sys-color-tertiary))',
            width: `${progress}%`,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>

        {/* Step info */}
        {currentStep < BOOT_STEPS.length && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            minHeight: '48px',
          }}>
            <span style={{
              fontSize: '13px', fontWeight: 500,
              color: 'var(--md-sys-color-on-surface)',
              transition: 'opacity 0.2s',
            }}>
              {BOOT_STEPS[currentStep].label}
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--md-sys-color-outline)',
              transition: 'opacity 0.2s',
            }}>
              {BOOT_STEPS[currentStep].detail}
            </span>
          </div>
        )}

        {currentStep >= BOOT_STEPS.length && (
          <span style={{
            fontSize: '13px', fontWeight: 500,
            color: 'var(--md-sys-color-primary)',
          }}>
            Ready
          </span>
        )}

        {/* Step dots */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {BOOT_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === currentStep ? '20px' : '6px',
              height: '6px', borderRadius: '3px',
              backgroundColor: i < currentStep
                ? 'var(--md-sys-color-primary)'
                : i === currentStep
                  ? 'var(--md-sys-color-primary)'
                  : 'var(--md-sys-color-surface-variant)',
              opacity: i <= currentStep ? 1 : 0.4,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
