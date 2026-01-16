/**
 * Logo Animation Effects
 * Windows XP alien retro-futuristic inspired effects
 */

// Alien terminal characters for boot sequence
export const ALIEN_CHARS = '░▒▓█◢◣◤◥⬡⬢╔╗╚╝═║▲▼◀▶◉◎●⟨⟩⟪⟫⌬⌭⌮∆∇⊕⊖⊗λΣΩπ∞≋≈';

// Color palette
export const COLORS = {
  primary: '#818CF8',
  primaryEnd: '#6366F1',
  secondary: '#34D399',
  secondaryEnd: '#10B981',
  glitchCyan: '#00FFFF',
  glitchMagenta: '#FF00FF',
  glitchBlue: '#00D4FF',
  white: '#F5F3EF',
  dark: '#0D0D0D',
  scanline: 'rgba(255,255,255,0.03)',
};

// Logo shape definition (S-shape made of 5 rectangles)
export interface LogoRect {
  x: number;
  y: number;
  width: number;
  height: number;
  gradient: 'primary' | 'secondary' | 'white';
}

export const LOGO_RECTS: LogoRect[] = [
  { x: 6, y: 5, width: 20, height: 4, gradient: 'primary' },    // Top bar
  { x: 6, y: 5, width: 4, height: 10, gradient: 'primary' },    // Left top vertical
  { x: 6, y: 14, width: 20, height: 4, gradient: 'white' },     // Middle bar
  { x: 22, y: 14, width: 4, height: 10, gradient: 'secondary' }, // Right bottom vertical
  { x: 6, y: 23, width: 20, height: 4, gradient: 'secondary' },  // Bottom bar
];

// Particle interface
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  color: string;
  alpha: number;
  targetX?: number;
  targetY?: number;
  size: number;
  life: number;
  maxLife: number;
}

// Create a particle
export function createParticle(
  x: number,
  y: number,
  options: Partial<Particle> = {}
): Particle {
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    char: ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)],
    color: COLORS.primary,
    alpha: 1,
    size: 10,
    life: 1,
    maxLife: 1,
    ...options,
  };
}

// Create particles for matrix rain effect
export function createMatrixRain(count: number, canvasWidth: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push(
      createParticle(Math.random() * canvasWidth, -20 - Math.random() * 100, {
        vy: 2 + Math.random() * 4,
        vx: 0,
        color: Math.random() > 0.5 ? COLORS.primary : COLORS.secondary,
        alpha: 0.3 + Math.random() * 0.7,
        size: 8 + Math.random() * 4,
        life: 1,
        maxLife: 1,
      })
    );
  }
  return particles;
}

// Create particles that will assemble into logo
export function createAssemblyParticles(
  logoRects: LogoRect[],
  scale: number,
  offsetX: number,
  offsetY: number
): Particle[] {
  const particles: Particle[] = [];

  logoRects.forEach((rect, _rectIndex) => {
    // Create particles along the rectangle edges
    const density = 0.5; // particle per pixel
    const color = rect.gradient === 'primary'
      ? COLORS.primary
      : rect.gradient === 'secondary'
        ? COLORS.secondary
        : COLORS.white;

    // Sample points within the rectangle
    const steps = Math.max(4, Math.floor((rect.width + rect.height) * density));
    for (let i = 0; i < steps; i++) {
      const targetX = offsetX + (rect.x + Math.random() * rect.width) * scale;
      const targetY = offsetY + (rect.y + Math.random() * rect.height) * scale;

      // Start from random positions around the canvas
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 100;
      const startX = targetX + Math.cos(angle) * distance;
      const startY = targetY + Math.sin(angle) * distance;

      particles.push(
        createParticle(startX, startY, {
          targetX,
          targetY,
          color,
          alpha: 0,
          size: 6 + Math.random() * 4,
          life: 0,
          maxLife: 0.5 + Math.random() * 0.5,
          char: ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)],
        })
      );
    }
  });

  return particles;
}

// Glitch effect data
export interface GlitchSlice {
  y: number;
  height: number;
  offsetX: number;
  rgbSplit: number;
}

// Generate random glitch slices
export function generateGlitchSlices(
  canvasHeight: number,
  intensity: number = 0.5
): GlitchSlice[] {
  const slices: GlitchSlice[] = [];
  const numSlices = Math.floor(3 + intensity * 5);

  for (let i = 0; i < numSlices; i++) {
    slices.push({
      y: Math.random() * canvasHeight,
      height: 2 + Math.random() * 10 * intensity,
      offsetX: (Math.random() - 0.5) * 20 * intensity,
      rgbSplit: Math.random() * 4 * intensity,
    });
  }

  return slices;
}

// Holographic color shift
export function getHolographicColor(
  baseColor: string,
  time: number,
  x: number,
  y: number
): string {
  const hueShift = Math.sin(time * 0.002 + x * 0.01 + y * 0.01) * 30;
  // Parse hex color
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  // Convert to HSL, shift hue, convert back
  const [h, s, l] = rgbToHsl(r, g, b);
  const newH = (h + hueShift / 360 + 1) % 1;
  const [nr, ng, nb] = hslToRgb(newH, s, l);

  return `rgb(${Math.round(nr)}, ${Math.round(ng)}, ${Math.round(nb)})`;
}

// RGB to HSL conversion
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h, s, l];
}

// HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r * 255, g * 255, b * 255];
}

// Scanline effect
export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  opacity: number = 0.03
): void {
  ctx.save();

  // Scrolling scanlines
  const scrollOffset = (time * 0.05) % 4;

  for (let y = scrollOffset; y < height; y += 4) {
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fillRect(0, y, width, 1);
  }

  // Occasional bright scanline
  if (Math.random() > 0.97) {
    const brightY = Math.random() * height;
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 5})`;
    ctx.fillRect(0, brightY, width, 2);
  }

  ctx.restore();
}

// CRT vignette effect
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number = 0.3
): void {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 1.5
  );

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// Draw logo rectangle with gradient
export function drawLogoRect(
  ctx: CanvasRenderingContext2D,
  rect: LogoRect,
  scale: number,
  offsetX: number,
  offsetY: number,
  alpha: number = 1
): void {
  const x = offsetX + rect.x * scale;
  const y = offsetY + rect.y * scale;
  const w = rect.width * scale;
  const h = rect.height * scale;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (rect.gradient === 'white') {
    ctx.fillStyle = COLORS.white;
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    if (rect.gradient === 'primary') {
      gradient.addColorStop(0, COLORS.primary);
      gradient.addColorStop(1, COLORS.primaryEnd);
    } else {
      gradient.addColorStop(0, COLORS.secondary);
      gradient.addColorStop(1, COLORS.secondaryEnd);
    }
    ctx.fillStyle = gradient;
  }

  // Rounded rectangle
  const radius = scale * 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  ctx.restore();
}

// Draw logo background
export function drawLogoBackground(
  ctx: CanvasRenderingContext2D,
  scale: number,
  offsetX: number,
  offsetY: number,
  alpha: number = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS.dark;

  const radius = scale * 6;
  ctx.beginPath();
  ctx.roundRect(offsetX, offsetY, 32 * scale, 32 * scale, radius);
  ctx.fill();

  ctx.restore();
}

// Apply chromatic aberration to a region
export function drawWithChromaticAberration(
  ctx: CanvasRenderingContext2D,
  drawFn: () => void,
  intensity: number = 2
): void {
  // This is a simplified version - for full effect you'd need offscreen canvases
  ctx.save();

  // Red channel offset
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.3;
  ctx.translate(-intensity, 0);
  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
  drawFn();
  ctx.translate(intensity, 0);

  // Cyan channel offset
  ctx.translate(intensity, 0);
  ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
  drawFn();

  ctx.restore();
}

// Easing functions
export const ease = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutElastic: (t: number) => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  },
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};

// Lerp utility
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Clamp utility
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
