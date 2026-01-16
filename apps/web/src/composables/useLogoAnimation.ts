/**
 * Logo Animation Composable
 * Orchestrates the retro-futuristic logo animation phases
 */

import { ref, onMounted, onUnmounted, watch } from 'vue';
import {
  ALIEN_CHARS,
  COLORS,
  LOGO_RECTS,
  type Particle,
  type GlitchSlice,
  createMatrixRain,
  createAssemblyParticles,
  generateGlitchSlices,
  drawScanlines,
  drawVignette,
  drawLogoRect,
  drawLogoBackground,
  getHolographicColor,
  ease,
  lerp,
  clamp,
} from '@/utils/logoEffects';

export type AnimationPhase = 'boot' | 'assembly' | 'stabilize' | 'settle' | 'idle';
export type AnimationIntensity = 'low' | 'medium' | 'high';

export interface UseLogoAnimationOptions {
  size?: number;
  autoPlay?: boolean;
  loop?: boolean;
  intensity?: AnimationIntensity;
}

export function useLogoAnimation(
  canvasRef: ReturnType<typeof ref<HTMLCanvasElement | null>>,
  options: UseLogoAnimationOptions = {}
) {
  const {
    size = 32,
    autoPlay = true,
    loop = true,
    intensity = 'medium',
  } = options;

  // State
  const phase = ref<AnimationPhase>('boot');
  const isPlaying = ref(false);
  const progress = ref(0);

  // Animation internals
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId: number | null = null;
  let startTime: number = 0;
  let particles: Particle[] = [];
  let matrixParticles: Particle[] = [];
  let glitchSlices: GlitchSlice[] = [];
  let lastGlitchTime = 0;
  let isVisible = true;

  // Timing (in ms)
  const PHASE_TIMING = {
    boot: { start: 0, end: 500 },
    assembly: { start: 500, end: 1500 },
    stabilize: { start: 1500, end: 2500 },
    settle: { start: 2500, end: 3000 },
    idle: { start: 3000, end: Infinity },
  };

  // Intensity modifiers
  const INTENSITY_MODIFIERS = {
    low: { particles: 0.5, glitch: 0.3, scanlines: 0.5 },
    medium: { particles: 1, glitch: 0.6, scanlines: 1 },
    high: { particles: 1.5, glitch: 1, scanlines: 1.5 },
  };

  const intensityMod = INTENSITY_MODIFIERS[intensity];

  // Calculate scale and offsets for centered logo
  const scale = size / 32;
  const offsetX = 0;
  const offsetY = 0;

  // Initialize canvas
  function initCanvas(): boolean {
    const canvas = canvasRef.value;
    if (!canvas) return false;

    ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    return true;
  }

  // Initialize particles
  function initParticles(): void {
    matrixParticles = createMatrixRain(
      Math.floor(15 * intensityMod.particles),
      size
    );
    particles = createAssemblyParticles(LOGO_RECTS, scale, offsetX, offsetY);
  }

  // Get current phase based on elapsed time
  function getCurrentPhase(elapsed: number): AnimationPhase {
    if (elapsed < PHASE_TIMING.boot.end) return 'boot';
    if (elapsed < PHASE_TIMING.assembly.end) return 'assembly';
    if (elapsed < PHASE_TIMING.stabilize.end) return 'stabilize';
    if (elapsed < PHASE_TIMING.settle.end) return 'settle';
    return 'idle';
  }

  // Get phase progress (0-1)
  function getPhaseProgress(elapsed: number, currentPhase: AnimationPhase): number {
    const timing = PHASE_TIMING[currentPhase];
    if (timing.end === Infinity) return (elapsed - timing.start) / 1000; // For idle, return seconds
    return clamp((elapsed - timing.start) / (timing.end - timing.start), 0, 1);
  }

  // Draw boot phase - CRT turn on with flickering characters
  function drawBootPhase(elapsed: number, phaseProgress: number): void {
    if (!ctx) return;

    // CRT brightness flash
    const brightness = ease.easeOutQuad(Math.min(phaseProgress * 2, 1));

    // Background with brightness
    ctx.fillStyle = `rgba(13, 13, 13, ${brightness})`;
    ctx.fillRect(0, 0, size, size);

    // Flickering alien characters
    if (phaseProgress > 0.2) {
      const charAlpha = 0.3 + Math.random() * 0.4;
      ctx.font = `${6 * scale}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < 8; i++) {
        const x = 5 + Math.random() * (size - 10);
        const y = 5 + Math.random() * (size - 10);
        const char = ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)];
        const color = Math.random() > 0.5 ? COLORS.primary : COLORS.secondary;

        ctx.fillStyle = color;
        ctx.globalAlpha = charAlpha * brightness;
        ctx.fillText(char, x, y);
      }
      ctx.globalAlpha = 1;
    }

    // Scanlines
    if (phaseProgress > 0.3) {
      drawScanlines(ctx, size, size, elapsed, 0.05 * intensityMod.scanlines);
    }
  }

  // Draw assembly phase - Matrix rain + particles converging
  function drawAssemblyPhase(elapsed: number, phaseProgress: number): void {
    if (!ctx) return;

    // Background
    ctx.fillStyle = COLORS.dark;
    ctx.fillRect(0, 0, size, size);

    // Matrix rain
    ctx.font = `${5 * scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    matrixParticles.forEach((p) => {
      // Update position
      p.y += p.vy * 0.3;

      // Reset if off screen
      if (p.y > size + 20) {
        p.y = -20;
        p.x = Math.random() * size;
        p.char = ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)];
      }

      // Fade as phase progresses
      const fadeOut = 1 - ease.easeInQuad(phaseProgress);
      ctx!.fillStyle = p.color;
      ctx!.globalAlpha = p.alpha * fadeOut;
      ctx!.fillText(p.char, p.x, p.y);
    });

    ctx.globalAlpha = 1;

    // Logo background fading in
    const bgAlpha = ease.easeOutQuad(phaseProgress);
    drawLogoBackground(ctx, scale, offsetX, offsetY, bgAlpha * 0.8);

    // Assembly particles converging
    particles.forEach((p, i) => {
      if (p.targetX === undefined || p.targetY === undefined) return;

      // Stagger particle activation
      const particleDelay = (i / particles.length) * 0.6;
      const particleProgress = clamp((phaseProgress - particleDelay) / (1 - particleDelay), 0, 1);

      if (particleProgress <= 0) return;

      // Move towards target
      const easeProgress = ease.easeOutQuad(particleProgress);
      p.x = lerp(p.x, p.targetX, easeProgress * 0.15);
      p.y = lerp(p.y, p.targetY, easeProgress * 0.15);
      p.alpha = ease.easeOutQuad(particleProgress);

      // Draw particle
      ctx!.font = `${p.size * scale * 0.3}px monospace`;
      ctx!.fillStyle = p.color;
      ctx!.globalAlpha = p.alpha * 0.8;

      // Character morphs as it gets closer
      const distToTarget = Math.sqrt(
        Math.pow(p.x - p.targetX, 2) + Math.pow(p.y - p.targetY, 2)
      );
      if (distToTarget < 5) {
        // Draw as filled pixel near target
        ctx!.fillRect(p.x - 1, p.y - 1, 2, 2);
      } else {
        ctx!.fillText(p.char, p.x, p.y);
      }
    });

    ctx.globalAlpha = 1;

    // Occasional glitch
    if (Math.random() > 0.95 && phaseProgress > 0.3) {
      glitchSlices = generateGlitchSlices(size, intensityMod.glitch * 0.5);
    }

    // Draw glitch slices
    if (glitchSlices.length > 0 && Math.random() > 0.7) {
      ctx.save();
      glitchSlices.forEach((slice) => {
        ctx!.fillStyle = Math.random() > 0.5 ? COLORS.glitchCyan : COLORS.glitchMagenta;
        ctx!.globalAlpha = 0.1;
        ctx!.fillRect(slice.offsetX, slice.y, size, slice.height);
      });
      ctx.restore();
      glitchSlices = [];
    }

    // Scanlines
    drawScanlines(ctx, size, size, elapsed, 0.03 * intensityMod.scanlines);
  }

  // Draw stabilize phase - Logo locks in with chromatic aberration
  function drawStabilizePhase(elapsed: number, phaseProgress: number): void {
    if (!ctx) return;

    // Background
    ctx.fillStyle = COLORS.dark;
    ctx.fillRect(0, 0, size, size);

    // Logo background
    drawLogoBackground(ctx, scale, offsetX, offsetY, 1);

    // Chromatic aberration intensity decreasing
    const aberrationIntensity = (1 - ease.easeOutQuad(phaseProgress)) * 2 * intensityMod.glitch;

    // Draw logo rects with aberration
    LOGO_RECTS.forEach((rect, index) => {
      const rectDelay = index * 0.15;
      const rectProgress = clamp((phaseProgress - rectDelay) / (1 - rectDelay), 0, 1);

      if (rectProgress <= 0) return;

      const rectAlpha = ease.easeOutElastic(rectProgress);

      // RGB split effect
      if (aberrationIntensity > 0.5) {
        ctx!.save();
        ctx!.globalAlpha = 0.3 * rectAlpha;
        ctx!.translate(-aberrationIntensity, 0);
        drawLogoRect(ctx!, rect, scale, offsetX, offsetY, 1);
        ctx!.translate(aberrationIntensity * 2, 0);
        drawLogoRect(ctx!, rect, scale, offsetX, offsetY, 1);
        ctx!.restore();
      }

      // Main rect
      drawLogoRect(ctx!, rect, scale, offsetX, offsetY, rectAlpha);
    });

    // Holographic shimmer
    if (phaseProgress > 0.5) {
      const shimmerProgress = (phaseProgress - 0.5) * 2;
      const shimmerX = size * ease.easeInOutQuad(shimmerProgress);

      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.3 * (1 - shimmerProgress);

      const shimmerGradient = ctx.createLinearGradient(
        shimmerX - 10, 0, shimmerX + 10, 0
      );
      shimmerGradient.addColorStop(0, 'transparent');
      shimmerGradient.addColorStop(0.5, 'white');
      shimmerGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = shimmerGradient;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();
    }

    // Scanlines
    drawScanlines(ctx, size, size, elapsed, 0.02 * intensityMod.scanlines);
  }

  // Draw settle phase - Effects fade out
  function drawSettlePhase(elapsed: number, phaseProgress: number): void {
    if (!ctx) return;

    // Background
    ctx.fillStyle = COLORS.dark;
    ctx.fillRect(0, 0, size, size);

    // Logo background with subtle glow
    drawLogoBackground(ctx, scale, offsetX, offsetY, 1);

    // Draw logo rects
    LOGO_RECTS.forEach((rect) => {
      drawLogoRect(ctx!, rect, scale, offsetX, offsetY, 1);
    });

    // Fading scanlines
    const scanlineOpacity = 0.02 * (1 - ease.easeOutQuad(phaseProgress)) * intensityMod.scanlines;
    if (scanlineOpacity > 0.001) {
      drawScanlines(ctx, size, size, elapsed, scanlineOpacity);
    }

    // Subtle vignette fading out
    const vignetteOpacity = 0.2 * (1 - ease.easeOutQuad(phaseProgress));
    if (vignetteOpacity > 0.01) {
      drawVignette(ctx, size, size, vignetteOpacity);
    }
  }

  // Draw idle phase - Subtle ongoing effects
  function drawIdlePhase(elapsed: number, idleTime: number): void {
    if (!ctx) return;

    // Background
    ctx.fillStyle = COLORS.dark;
    ctx.fillRect(0, 0, size, size);

    // Logo background
    drawLogoBackground(ctx, scale, offsetX, offsetY, 1);

    // Draw logo rects with subtle holographic shift
    LOGO_RECTS.forEach((rect) => {
      // Very subtle color shift on hover-like effect
      const hue = Math.sin(idleTime * 0.001) * 5;

      ctx!.save();
      drawLogoRect(ctx!, rect, scale, offsetX, offsetY, 1);
      ctx!.restore();
    });

    // Occasional micro-glitch (every 10-15 seconds)
    const timeSinceGlitch = elapsed - lastGlitchTime;
    if (timeSinceGlitch > 10000 + Math.random() * 5000) {
      if (Math.random() > 0.5) {
        lastGlitchTime = elapsed;
        glitchSlices = generateGlitchSlices(size, intensityMod.glitch * 0.3);
      }
    }

    // Draw active glitch
    if (glitchSlices.length > 0) {
      ctx.save();
      glitchSlices.forEach((slice) => {
        ctx!.fillStyle = Math.random() > 0.5 ? COLORS.glitchCyan : COLORS.glitchMagenta;
        ctx!.globalAlpha = 0.05;
        ctx!.fillRect(slice.offsetX, slice.y, size, slice.height);
      });
      ctx.restore();

      // Clear glitch after brief display
      setTimeout(() => {
        glitchSlices = [];
      }, 50);
    }

    // Very subtle floating particles in idle
    if (loop && particles.length > 0) {
      const activeParticles = particles.slice(0, 5);
      activeParticles.forEach((p, i) => {
        const floatOffset = Math.sin(idleTime * 0.002 + i) * 2;
        const x = (p.targetX || size / 2) + floatOffset;
        const y = (p.targetY || size / 2) + Math.cos(idleTime * 0.002 + i) * 2;

        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = 0.15;
        ctx!.beginPath();
        ctx!.arc(x, y, 1, 0, Math.PI * 2);
        ctx!.fill();
      });
      ctx.globalAlpha = 1;
    }

    // Very subtle scanlines
    drawScanlines(ctx, size, size, elapsed, 0.01 * intensityMod.scanlines);
  }

  // Main render loop
  function render(timestamp: number): void {
    if (!isPlaying.value || !ctx || !isVisible) {
      if (isPlaying.value) {
        animationFrameId = requestAnimationFrame(render);
      }
      return;
    }

    const elapsed = timestamp - startTime;
    const currentPhase = getCurrentPhase(elapsed);
    const phaseProgress = getPhaseProgress(elapsed, currentPhase);

    phase.value = currentPhase;
    progress.value = elapsed;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Render based on phase
    switch (currentPhase) {
      case 'boot':
        drawBootPhase(elapsed, phaseProgress);
        break;
      case 'assembly':
        drawAssemblyPhase(elapsed, phaseProgress);
        break;
      case 'stabilize':
        drawStabilizePhase(elapsed, phaseProgress);
        break;
      case 'settle':
        drawSettlePhase(elapsed, phaseProgress);
        break;
      case 'idle':
        if (loop) {
          drawIdlePhase(elapsed, phaseProgress * 1000);
        } else {
          // Just draw static logo
          ctx.fillStyle = COLORS.dark;
          ctx.fillRect(0, 0, size, size);
          drawLogoBackground(ctx, scale, offsetX, offsetY, 1);
          LOGO_RECTS.forEach((rect) => {
            drawLogoRect(ctx!, rect, scale, offsetX, offsetY, 1);
          });
        }
        break;
    }

    animationFrameId = requestAnimationFrame(render);
  }

  // Control functions
  function play(): void {
    if (isPlaying.value) return;

    if (!initCanvas()) return;
    initParticles();

    isPlaying.value = true;
    startTime = performance.now();
    lastGlitchTime = 0;
    phase.value = 'boot';

    animationFrameId = requestAnimationFrame(render);
  }

  function pause(): void {
    isPlaying.value = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function reset(): void {
    pause();
    phase.value = 'boot';
    progress.value = 0;
    glitchSlices = [];

    if (ctx) {
      ctx.clearRect(0, 0, size, size);
    }
  }

  function restart(): void {
    reset();
    play();
  }

  // Draw static logo (for reduced motion or fallback)
  function drawStatic(): void {
    if (!initCanvas() || !ctx) return;

    ctx.fillStyle = COLORS.dark;
    ctx.fillRect(0, 0, size, size);
    drawLogoBackground(ctx, scale, offsetX, offsetY, 1);
    LOGO_RECTS.forEach((rect) => {
      drawLogoRect(ctx!, rect, scale, offsetX, offsetY, 1);
    });
  }

  // Visibility change handler
  function handleVisibilityChange(): void {
    isVisible = !document.hidden;
    if (isVisible && isPlaying.value) {
      // Adjust start time to account for hidden duration
      startTime = performance.now() - progress.value;
    }
  }

  // Lifecycle
  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      drawStatic();
    } else if (autoPlay) {
      play();
    }
  });

  onUnmounted(() => {
    pause();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return {
    phase,
    isPlaying,
    progress,
    play,
    pause,
    reset,
    restart,
    drawStatic,
  };
}
