<script setup lang="ts">
/**
 * AnimatedTerminal Component
 * Windows XP alien retro-futuristic terminal animation for hero section
 *
 * Features:
 * - CRT boot sequence with scanlines
 * - Matrix-style character rain
 * - Glitch effects and chromatic aberration
 * - Personalized messages based on user state
 * - Animated SVG effects emanating from terminal
 * - Time-based variations and ambient loops
 */
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useThemeStore } from '@/stores/theme';

// Props
interface Props {
  autoPlay?: boolean;
  loop?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoPlay: true,
  loop: true,
});

const themeStore = useThemeStore();
const isCalmLightMode = computed(() => !themeStore.isDark);

// Alien terminal characters
const ALIEN_CHARS = '░▒▓█◢◣◤◥⬡⬢╔╗╚╝═║▲▼◀▶◉◎●⟨⟩⟪⟫⌬⌭⌮∆∇⊕⊖⊗λΣΩπ∞≋≈01';
const DATA_CHARS = '⟨⟩◈◇◆⬡⬢▸▹►▻◂◃◄◅⊳⊲';

// Time of day greetings
const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return { greeting: 'Night owl mode', emoji: '🦉', vibe: 'nocturnal' };
  if (hour < 12) return { greeting: 'Good morning', emoji: '☀️', vibe: 'energetic' };
  if (hour < 17) return { greeting: 'Good afternoon', emoji: '🌤️', vibe: 'productive' };
  if (hour < 21) return { greeting: 'Good evening', emoji: '🌅', vibe: 'creative' };
  return { greeting: 'Late night coding', emoji: '🌙', vibe: 'focused' };
};

// Check if returning user
const isReturningUser = () => {
  const visited = localStorage.getItem('synthstack_visited');
  if (!visited) {
    localStorage.setItem('synthstack_visited', Date.now().toString());
    return false;
  }
  return true;
};

// Get visit count
const getVisitCount = () => {
  const count = parseInt(localStorage.getItem('synthstack_visits') || '0');
  localStorage.setItem('synthstack_visits', (count + 1).toString());
  return count + 1;
};

// Random quotes/messages
const QUOTES = {
  new: [
    'Initializing your journey...',
    'Welcome to the future of development',
    'Preparing neural interface...',
    'Quantum bootstrap sequence engaged',
  ],
  returning: [
    'Welcome back, developer',
    'Neural link re-established',
    'Resuming previous session...',
    'Good to see you again',
    'Picking up where you left off...',
  ],
  frequent: [
    'Power user detected ⚡',
    'Core contributor status: Active',
    'Your dedication is noted 🏆',
    'Elite developer mode: ON',
  ],
  timeSpecific: {
    nocturnal: ['The best code is written at night', 'Burning the midnight oil?', 'Night shift activated'],
    energetic: ['Fresh start, fresh code', 'Morning productivity boost', 'Coffee.exe loaded'],
    productive: ['Peak performance hours', 'In the zone', 'Maximum efficiency mode'],
    creative: ['Evening inspiration mode', 'Creative coding session', 'Golden hour for devs'],
    focused: ['Deep work mode engaged', 'Distraction-free zone', 'Focus level: Maximum'],
  },
};

// User state
const timeInfo = ref(getTimeGreeting());
const returning = ref(false);
const visitCount = ref(0);
const personalMessage = ref('');

// Terminal content generator
const generateTerminalContent = () => {
  const lines = [
    { type: 'system', text: `[${timeInfo.value.emoji}] ${timeInfo.value.greeting}`, delay: 0 },
    { type: 'command', text: '$ pnpm create synthstack', delay: 400 },
    { type: 'output', text: '✓ Cloning repository...', delay: 1000 },
    { type: 'output', text: '✓ Installing dependencies...', delay: 1500 },
    { type: 'output', text: '✓ Configuring AI copilot...', delay: 2000 },
    { type: 'output', text: '✓ Starting services...', delay: 2500 },
    { type: 'empty', text: '', delay: 2800 },
    { type: 'success', text: '🚀 SynthStack ready at http://localhost:4100', delay: 3000 },
    { type: 'empty', text: '', delay: 3200 },
    { type: 'quote', text: personalMessage.value, delay: 3400 },
  ];
  return lines;
};

// Visualization types for the showcase loop
type VisualizationType = 'neural' | 'dashboard' | 'flow' | 'crm' | 'analytics';

interface NeuralNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulsePhase: number;
  connections: number[];
  color: string;
  glow: number;
}

interface DashboardElement {
  id: number;
  type: 'bar' | 'circle' | 'line' | 'dot';
  x: number;
  y: number;
  width: number;
  height: number;
  progress: number;
  targetProgress: number;
  color: string;
  delay: number;
}

interface FlowParticle {
  id: number;
  pathIndex: number;
  progress: number;
  speed: number;
  size: number;
  color: string;
  trail: Array<{ x: number; y: number; opacity: number }>;
}

interface CrmCard {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  opacity: number;
  color: string;
  pulsePhase: number;
}

// Minimize/collapse state
const isMinimized = ref(false);
const isCollapsing = ref(false);
const collapseProgress = ref(0);
const voidParticles = ref<Array<{ id: number; x: number; y: number; angle: number; speed: number; size: number; opacity: number }>>([]);

// State
const phase = ref<'boot' | 'matrix' | 'typing' | 'idle' | 'showcase'>('boot');
const bootProgress = ref(0);
const matrixChars = ref<Array<{ x: number; y: number; char: string; speed: number; opacity: number; color: string }>>([]);
const terminalLines = ref<ReturnType<typeof generateTerminalContent>>([]);
const visibleLines = ref<number>(0);
const currentCharIndex = ref<number>(0);
const showCursor = ref(true);
const glitchActive = ref(false);
const scanlineOffset = ref(0);

// Ambient effects state
const particles = ref<Array<{ id: number; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; char: string; color: string }>>([]);
const dataStreams = ref<Array<{ id: number; x: number; progress: number; chars: string[]; speed: number }>>([]);
const pulseRings = ref<Array<{ id: number; scale: number; opacity: number }>>([]);
const ambientGlow = ref({ hue: 240, intensity: 0.5 });
const idleTime = ref(0);

// Showcase visualization state
const currentVisualization = ref<VisualizationType>('neural');
const visualizationProgress = ref(0);
const showcaseTransition = ref(false);
const neuralNodes = ref<NeuralNode[]>([]);
const dashboardElements = ref<DashboardElement[]>([]);
const flowParticles = ref<FlowParticle[]>([]);
const crmCards = ref<CrmCard[]>([]);
const flowPaths = ref<Array<{ points: Array<{ x: number; y: number }> }>>([]);

// Visualization colors - neon palette for each type
const VIZ_COLORS = {
  neural: { primary: '#818CF8', secondary: '#c084fc', accent: '#22d3ee', glow: 'rgba(129, 140, 248, 0.6)' },
  dashboard: { primary: '#00d4aa', secondary: '#34d399', accent: '#6ee7b7', glow: 'rgba(0, 212, 170, 0.6)' },
  flow: { primary: '#f472b6', secondary: '#ec4899', accent: '#f9a8d4', glow: 'rgba(244, 114, 182, 0.6)' },
  crm: { primary: '#fbbf24', secondary: '#f59e0b', accent: '#fcd34d', glow: 'rgba(251, 191, 36, 0.6)' },
  analytics: { primary: '#60a5fa', secondary: '#3b82f6', accent: '#93c5fd', glow: 'rgba(96, 165, 250, 0.6)' },
};

const VISUALIZATION_LABELS: Record<VisualizationType, string> = {
  neural: 'Neural Network',
  dashboard: 'Dashboard',
  flow: 'Data Flow',
  crm: 'CRM System',
  analytics: 'Analytics',
};

// Animation timing
let animationFrame: number | null = null;
let bootTimeout: ReturnType<typeof setTimeout> | null = null;
let typeTimeout: ReturnType<typeof setTimeout> | null = null;
let cursorInterval: ReturnType<typeof setInterval> | null = null;
let glitchInterval: ReturnType<typeof setInterval> | null = null;
let particleInterval: ReturnType<typeof setInterval> | null = null;
let ambientFrame: number | null = null;
let showcaseFrame: number | null = null;
let showcaseInterval: ReturnType<typeof setInterval> | null = null;
let showcaseTimeout: ReturnType<typeof setTimeout> | null = null;
let collapseFrame: number | null = null;

// Emit for setup wizard link
const emit = defineEmits<{
  (e: 'open-branding-wizard'): void;
}>();

// Minimize/collapse animation - void eating itself effect
function minimizeTerminal() {
  if (isCollapsing.value || isMinimized.value) return;

  isCollapsing.value = true;
  collapseProgress.value = 0;

  // Create void particles that spiral inward
  const particleCount = 30;
  const newParticles: typeof voidParticles.value = [];
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    newParticles.push({
      id: i,
      x: 50 + Math.cos(angle) * 45,
      y: 50 + Math.sin(angle) * 45,
      angle,
      speed: 0.8 + Math.random() * 0.4,
      size: 2 + Math.random() * 3,
      opacity: 1,
    });
  }
  voidParticles.value = newParticles;

  const startTime = performance.now();
  const duration = 800;

  function animateCollapse() {
    const elapsed = performance.now() - startTime;
    collapseProgress.value = Math.min(elapsed / duration, 1);

    // Update void particles - spiral inward
    voidParticles.value = voidParticles.value.map(p => {
      const progress = collapseProgress.value;
      const spiralFactor = 1 - progress * 0.95;
      const newAngle = p.angle + progress * 3;
      return {
        ...p,
        x: 50 + Math.cos(newAngle) * 45 * spiralFactor,
        y: 50 + Math.sin(newAngle) * 45 * spiralFactor,
        size: p.size * (1 - progress * 0.8),
        opacity: 1 - progress,
      };
    });

    if (collapseProgress.value < 1) {
      collapseFrame = requestAnimationFrame(animateCollapse);
    } else {
      isMinimized.value = true;
      isCollapsing.value = false;
      voidParticles.value = [];
    }
  }

  collapseFrame = requestAnimationFrame(animateCollapse);
}

// Expand from minimized state
function expandTerminal() {
  if (!isMinimized.value) return;

  isMinimized.value = false;
  collapseProgress.value = 0;

  // Re-trigger glitch on expand
  triggerGlitch();
}

// Close terminal (same as minimize)
function closeTerminal() {
  minimizeTerminal();
}

// Open the branding wizard (hero interactive setup)
function openBrandingWizard() {
  emit('open-branding-wizard');
}

// Initialize user state
function initUserState() {
  returning.value = isReturningUser();
  visitCount.value = getVisitCount();
  timeInfo.value = getTimeGreeting();

  // Select appropriate message
  let messages: string[];
  if (visitCount.value > 10) {
    messages = QUOTES.frequent;
  } else if (returning.value) {
    messages = QUOTES.returning;
  } else {
    messages = QUOTES.new;
  }

  // Mix in time-specific messages occasionally
  if (Math.random() > 0.5) {
    const timeMessages = QUOTES.timeSpecific[timeInfo.value.vibe as keyof typeof QUOTES.timeSpecific];
    messages = [...messages, ...timeMessages];
  }

  personalMessage.value = messages[Math.floor(Math.random() * messages.length)];
  terminalLines.value = generateTerminalContent();
}

// Initialize matrix rain characters
function initMatrix() {
  const chars: typeof matrixChars.value = [];
  const colors = ['#00d4aa', '#818CF8', '#6366F1', '#22d3ee', '#a78bfa'];

  for (let i = 0; i < 50; i++) {
    chars.push({
      x: Math.random() * 100,
      y: -10 - Math.random() * 50,
      char: ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)],
      speed: 1 + Math.random() * 4,
      opacity: 0.2 + Math.random() * 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  matrixChars.value = chars;
}

// Update matrix rain
function updateMatrix() {
  matrixChars.value = matrixChars.value.map(char => {
    let newY = char.y + char.speed;
    if (newY > 110) {
      return {
        ...char,
        y: -10,
        x: Math.random() * 100,
        char: ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)],
        speed: 1 + Math.random() * 4,
      };
    }
    // Occasionally change character
    if (Math.random() > 0.95) {
      return { ...char, y: newY, char: ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)] };
    }
    return { ...char, y: newY };
  });
}

// Spawn particle from terminal
function spawnParticle() {
  const colors = ['#00d4aa', '#818CF8', '#6366F1', '#22d3ee'];
  const id = Date.now() + Math.random();
  const side = Math.random();

  let x, y, vx, vy;
  if (side < 0.25) { // Top
    x = Math.random() * 100;
    y = 0;
    vx = (Math.random() - 0.5) * 2;
    vy = -1 - Math.random() * 2;
  } else if (side < 0.5) { // Right
    x = 100;
    y = Math.random() * 100;
    vx = 1 + Math.random() * 2;
    vy = (Math.random() - 0.5) * 2;
  } else if (side < 0.75) { // Bottom
    x = Math.random() * 100;
    y = 100;
    vx = (Math.random() - 0.5) * 2;
    vy = 1 + Math.random() * 2;
  } else { // Left
    x = 0;
    y = Math.random() * 100;
    vx = -1 - Math.random() * 2;
    vy = (Math.random() - 0.5) * 2;
  }

  particles.value.push({
    id,
    x,
    y,
    vx,
    vy,
    life: 1,
    maxLife: 2 + Math.random() * 2,
    char: DATA_CHARS[Math.floor(Math.random() * DATA_CHARS.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
  });
}

// Spawn data stream
function spawnDataStream() {
  const id = Date.now() + Math.random();
  const chars = Array(5 + Math.floor(Math.random() * 5))
    .fill(0)
    .map(() => ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)]);

  dataStreams.value.push({
    id,
    x: Math.random() * 80 + 10,
    progress: 0,
    chars,
    speed: 0.5 + Math.random() * 1.5,
  });
}

// Spawn pulse ring
function spawnPulseRing() {
  const id = Date.now() + Math.random();
  pulseRings.value.push({
    id,
    scale: 0.5,
    opacity: 0.6,
  });
}

// Update ambient effects
function updateAmbientEffects(deltaTime: number) {
  // Update particles
  particles.value = particles.value
    .map(p => ({
      ...p,
      x: p.x + p.vx * deltaTime * 20,
      y: p.y + p.vy * deltaTime * 20,
      life: p.life - deltaTime / p.maxLife,
    }))
    .filter(p => p.life > 0 && p.x > -20 && p.x < 120 && p.y > -20 && p.y < 120);

  // Update data streams
  dataStreams.value = dataStreams.value
    .map(s => ({
      ...s,
      progress: s.progress + s.speed * deltaTime,
    }))
    .filter(s => s.progress < 1.5);

  // Update pulse rings
  pulseRings.value = pulseRings.value
    .map(r => ({
      ...r,
      scale: r.scale + deltaTime * 0.8,
      opacity: r.opacity - deltaTime * 0.3,
    }))
    .filter(r => r.opacity > 0);

  // Update ambient glow
  ambientGlow.value.hue = (ambientGlow.value.hue + deltaTime * 10) % 360;
  ambientGlow.value.intensity = 0.4 + Math.sin(idleTime.value * 0.5) * 0.2;

  idleTime.value += deltaTime;
}

// Boot sequence
function runBootSequence() {
  phase.value = 'boot';
  bootProgress.value = 0;

  const bootDuration = 1200;
  const startTime = performance.now();

  function updateBoot() {
    const elapsed = performance.now() - startTime;
    bootProgress.value = Math.min(elapsed / bootDuration, 1);

    if (bootProgress.value < 1) {
      animationFrame = requestAnimationFrame(updateBoot);
    } else {
      runMatrixPhase();
    }
  }

  animationFrame = requestAnimationFrame(updateBoot);
}

// Matrix rain phase
function runMatrixPhase() {
  phase.value = 'matrix';
  initMatrix();

  const matrixDuration = 1800;
  const startTime = performance.now();

  function updateMatrixPhase() {
    const elapsed = performance.now() - startTime;
    updateMatrix();
    scanlineOffset.value = (scanlineOffset.value + 1) % 4;

    if (elapsed < matrixDuration) {
      animationFrame = requestAnimationFrame(updateMatrixPhase);
    } else {
      runTypingPhase();
    }
  }

  animationFrame = requestAnimationFrame(updateMatrixPhase);
}

// Typing phase
function runTypingPhase() {
  phase.value = 'typing';
  visibleLines.value = 0;
  currentCharIndex.value = 0;

  let lineIndex = 0;

  function typeNextLine() {
    if (lineIndex >= terminalLines.value.length) {
      phase.value = 'idle';
      startIdleEffects();
      return;
    }

    const line = terminalLines.value[lineIndex];
    visibleLines.value = lineIndex + 1;

    if (line.type === 'command') {
      // Type character by character
      let charIdx = 0;
      const typeChar = () => {
        if (charIdx <= line.text.length) {
          currentCharIndex.value = charIdx;
          charIdx++;
          typeTimeout = setTimeout(typeChar, 25 + Math.random() * 40);
        } else {
          lineIndex++;
          typeTimeout = setTimeout(typeNextLine, 200);
        }
      };
      typeChar();
    } else {
      // Show instantly with glitch
      if (line.type !== 'empty') {
        triggerGlitch();
      }
      lineIndex++;
      const nextLine = terminalLines.value[lineIndex];
      const nextDelay = nextLine
        ? Math.max(nextLine.delay - line.delay, 150)
        : 300;
      typeTimeout = setTimeout(typeNextLine, nextDelay);
    }
  }

  typeNextLine();
}

// Trigger glitch effect
function triggerGlitch() {
  if (isCalmLightMode.value) return;
  glitchActive.value = true;
  setTimeout(() => {
    glitchActive.value = false;
  }, 80 + Math.random() * 120);
}

function stopIdleEffects() {
  if (cursorInterval) {
    clearInterval(cursorInterval);
    cursorInterval = null;
  }
  if (glitchInterval) {
    clearInterval(glitchInterval);
    glitchInterval = null;
  }
  if (particleInterval) {
    clearInterval(particleInterval);
    particleInterval = null;
  }
  if (ambientFrame) {
    cancelAnimationFrame(ambientFrame);
    ambientFrame = null;
  }
  if (showcaseFrame) {
    cancelAnimationFrame(showcaseFrame);
    showcaseFrame = null;
  }
  if (showcaseInterval) {
    clearInterval(showcaseInterval);
    showcaseInterval = null;
  }
  if (showcaseTimeout) {
    clearTimeout(showcaseTimeout);
    showcaseTimeout = null;
  }
}

// Start idle effects
function startIdleEffects() {
  stopIdleEffects();

  showCursor.value = true;
  glitchActive.value = false;
  showcaseTransition.value = false;

  // Calm light-mode presets: keep the terminal stable (no glitch/particle/cursor blinking)
  if (isCalmLightMode.value) {
    return;
  }

  // Cursor blink
  cursorInterval = setInterval(() => {
    showCursor.value = !showCursor.value;
  }, 530);

  // Occasional glitch
  glitchInterval = setInterval(() => {
    if (Math.random() > 0.75) {
      triggerGlitch();
    }
  }, 4000);

  // Spawn particles periodically
  particleInterval = setInterval(() => {
    if (particles.value.length < 15) {
      spawnParticle();
    }
    if (Math.random() > 0.7 && dataStreams.value.length < 3) {
      spawnDataStream();
    }
    if (Math.random() > 0.85 && pulseRings.value.length < 2) {
      spawnPulseRing();
    }
  }, 300);

  // Ambient animation loop
  let lastTime = performance.now();
  function animateAmbient() {
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    updateAmbientEffects(deltaTime);
    scanlineOffset.value = (scanlineOffset.value + 0.3) % 4;

    ambientFrame = requestAnimationFrame(animateAmbient);
  }
  animateAmbient();

  // Start showcase after 3 seconds of idle
  showcaseTimeout = setTimeout(() => {
    startShowcase();
  }, 3000);
}

// ===== SHOWCASE VISUALIZATION SYSTEM =====

// Initialize neural network visualization
function initNeuralNetwork() {
  const colors = VIZ_COLORS.neural;
  const nodes: NeuralNode[] = [];
  const nodeCount = 12;

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    const radius = 25 + Math.random() * 15;
    nodes.push({
      id: i,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 2 + Math.random() * 2,
      pulsePhase: Math.random() * Math.PI * 2,
      connections: [],
      color: [colors.primary, colors.secondary, colors.accent][Math.floor(Math.random() * 3)],
      glow: 0.5 + Math.random() * 0.5,
    });
  }

  // Create organic connections
  nodes.forEach((node, i) => {
    const connectionCount = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < connectionCount; j++) {
      const targetIdx = (i + 1 + Math.floor(Math.random() * 4)) % nodeCount;
      if (!node.connections.includes(targetIdx)) {
        node.connections.push(targetIdx);
      }
    }
  });

  neuralNodes.value = nodes;
}

// Initialize dashboard visualization
function initDashboard() {
  const colors = VIZ_COLORS.dashboard;
  const elements: DashboardElement[] = [];

  // Bar chart
  for (let i = 0; i < 5; i++) {
    elements.push({
      id: i,
      type: 'bar',
      x: 15 + i * 14,
      y: 70,
      width: 8,
      height: 20 + Math.random() * 30,
      progress: 0,
      targetProgress: 1,
      color: i % 2 === 0 ? colors.primary : colors.secondary,
      delay: i * 100,
    });
  }

  // Circular progress indicators
  for (let i = 0; i < 3; i++) {
    elements.push({
      id: 10 + i,
      type: 'circle',
      x: 20 + i * 25,
      y: 25,
      width: 12,
      height: 12,
      progress: 0,
      targetProgress: 0.3 + Math.random() * 0.6,
      color: [colors.primary, colors.secondary, colors.accent][i],
      delay: 300 + i * 150,
    });
  }

  // Floating data dots
  for (let i = 0; i < 8; i++) {
    elements.push({
      id: 20 + i,
      type: 'dot',
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      width: 2,
      height: 2,
      progress: 0,
      targetProgress: 1,
      color: colors.accent,
      delay: 500 + i * 50,
    });
  }

  dashboardElements.value = elements;
}

// Initialize flow visualization
function initFlow() {
  const colors = VIZ_COLORS.flow;

  // Create organic bezier paths
  const paths = [
    { points: [{ x: 10, y: 50 }, { x: 30, y: 30 }, { x: 50, y: 50 }, { x: 70, y: 30 }, { x: 90, y: 50 }] },
    { points: [{ x: 10, y: 30 }, { x: 35, y: 60 }, { x: 65, y: 40 }, { x: 90, y: 70 }] },
    { points: [{ x: 10, y: 70 }, { x: 40, y: 50 }, { x: 60, y: 70 }, { x: 90, y: 30 }] },
  ];
  flowPaths.value = paths;

  // Create particles along paths
  const particles: FlowParticle[] = [];
  paths.forEach((_, pathIdx) => {
    for (let i = 0; i < 4; i++) {
      particles.push({
        id: pathIdx * 10 + i,
        pathIndex: pathIdx,
        progress: i * 0.25,
        speed: 0.15 + Math.random() * 0.1,
        size: 2 + Math.random() * 2,
        color: [colors.primary, colors.secondary, colors.accent][pathIdx % 3],
        trail: [],
      });
    }
  });

  flowParticles.value = particles;
}

// Initialize CRM visualization
function initCrm() {
  const colors = VIZ_COLORS.crm;
  const cards: CrmCard[] = [];

  // Create floating cards representing contacts/deals
  for (let i = 0; i < 6; i++) {
    const baseX = 20 + (i % 3) * 25;
    const baseY = 25 + Math.floor(i / 3) * 35;
    cards.push({
      id: i,
      x: 50,
      y: 50,
      targetX: baseX,
      targetY: baseY,
      width: 18,
      height: 22,
      opacity: 0,
      color: [colors.primary, colors.secondary, colors.accent][i % 3],
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  crmCards.value = cards;
}

// Update neural network animation
function updateNeural(deltaTime: number) {
  neuralNodes.value = neuralNodes.value.map(node => {
    let newX = node.x + node.vx;
    let newY = node.y + node.vy;

    // Bounce off boundaries with organic feel
    if (newX < 15 || newX > 85) node.vx *= -0.8;
    if (newY < 15 || newY > 85) node.vy *= -0.8;

    // Keep within bounds
    newX = Math.max(15, Math.min(85, newX));
    newY = Math.max(15, Math.min(85, newY));

    return {
      ...node,
      x: newX,
      y: newY,
      pulsePhase: (node.pulsePhase + deltaTime * 2) % (Math.PI * 2),
      glow: 0.5 + Math.sin(node.pulsePhase) * 0.3,
    };
  });
}

// Update dashboard animation
function updateDashboard(deltaTime: number, elapsed: number) {
  dashboardElements.value = dashboardElements.value.map(el => {
    if (elapsed * 1000 < el.delay) return el;

    const newProgress = Math.min(el.progress + deltaTime * 1.5, el.targetProgress);
    return { ...el, progress: newProgress };
  });
}

// Update flow animation
function updateFlow(deltaTime: number) {
  flowParticles.value = flowParticles.value.map(p => {
    let newProgress = p.progress + p.speed * deltaTime;
    if (newProgress > 1) newProgress = 0;

    // Calculate position on path
    const path = flowPaths.value[p.pathIndex];
    if (path) {
      const pos = getPointOnPath(path.points, newProgress);
      const trail = [...p.trail, { x: pos.x, y: pos.y, opacity: 1 }]
        .slice(-8)
        .map((t, i, arr) => ({ ...t, opacity: (i + 1) / arr.length }));
      return { ...p, progress: newProgress, trail };
    }

    return { ...p, progress: newProgress };
  });
}

// Helper to get point on bezier-like path
function getPointOnPath(points: Array<{ x: number; y: number }>, t: number): { x: number; y: number } {
  if (points.length < 2) return points[0] || { x: 0, y: 0 };

  const segmentCount = points.length - 1;
  const segment = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
  const localT = (t * segmentCount) - segment;

  const p0 = points[segment];
  const p1 = points[segment + 1];

  // Simple lerp with easing
  const easeT = localT * localT * (3 - 2 * localT);
  return {
    x: p0.x + (p1.x - p0.x) * easeT,
    y: p0.y + (p1.y - p0.y) * easeT,
  };
}

// Update CRM animation
function updateCrm(deltaTime: number) {
  crmCards.value = crmCards.value.map(card => {
    const newX = card.x + (card.targetX - card.x) * deltaTime * 3;
    const newY = card.y + (card.targetY - card.y) * deltaTime * 3;
    const newOpacity = Math.min(card.opacity + deltaTime * 2, 1);

    return {
      ...card,
      x: newX,
      y: newY,
      opacity: newOpacity,
      pulsePhase: (card.pulsePhase + deltaTime * 1.5) % (Math.PI * 2),
    };
  });
}

// Start showcase mode
function startShowcase() {
  if (isCalmLightMode.value) return;
  phase.value = 'showcase';
  currentVisualization.value = 'neural';
  initNeuralNetwork();
  visualizationProgress.value = 0;

  let lastTime = performance.now();
  let visualizationTime = 0;

  function animateShowcase() {
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;
    visualizationTime += deltaTime;
    visualizationProgress.value = Math.min(visualizationTime / 6, 1); // 6 second per viz

    // Update current visualization
    switch (currentVisualization.value) {
      case 'neural':
        updateNeural(deltaTime);
        break;
      case 'dashboard':
        updateDashboard(deltaTime, visualizationTime);
        break;
      case 'flow':
        updateFlow(deltaTime);
        break;
      case 'crm':
        updateCrm(deltaTime);
        break;
      case 'analytics':
        updateNeural(deltaTime); // Reuse neural for analytics
        break;
    }

    scanlineOffset.value = (scanlineOffset.value + 0.3) % 4;
    showcaseFrame = requestAnimationFrame(animateShowcase);
  }

  animateShowcase();

  // Cycle through visualizations
  showcaseInterval = setInterval(() => {
    transitionToNextVisualization();
  }, 6000);
}

// Transition to next visualization
function transitionToNextVisualization() {
  showcaseTransition.value = true;
  triggerGlitch();

  setTimeout(() => {
    const vizOrder: VisualizationType[] = ['neural', 'dashboard', 'flow', 'crm', 'analytics'];
    const currentIdx = vizOrder.indexOf(currentVisualization.value);
    const nextIdx = (currentIdx + 1) % vizOrder.length;
    currentVisualization.value = vizOrder[nextIdx];
    visualizationProgress.value = 0;

    // Initialize the new visualization
    switch (currentVisualization.value) {
      case 'neural':
        initNeuralNetwork();
        break;
      case 'dashboard':
        initDashboard();
        break;
      case 'flow':
        initFlow();
        break;
      case 'crm':
        initCrm();
        break;
      case 'analytics':
        initNeuralNetwork(); // Reuse with different colors
        break;
    }

    showcaseTransition.value = false;
  }, 200);
}

// Get current visualization colors
const currentVizColors = computed(() => VIZ_COLORS[currentVisualization.value]);

// Get displayed text for a line
function getDisplayedText(lineIndex: number): string {
  const line = terminalLines.value[lineIndex];
  if (!line) return '';

  if (lineIndex < visibleLines.value - 1) {
    return line.text;
  }

  if (lineIndex === visibleLines.value - 1 && line.type === 'command') {
    return line.text.slice(0, currentCharIndex.value);
  }

  return line.text;
}

// Computed styles
const terminalStyle = computed(() => ({
  '--scanline-offset': `${scanlineOffset.value}px`,
  '--glow-hue': `${ambientGlow.value.hue}`,
  '--glow-intensity': ambientGlow.value.intensity,
}));

// Lifecycle
onMounted(() => {
  initUserState();
  if (props.autoPlay) {
    bootTimeout = setTimeout(runBootSequence, 100);
  }
});

watch(isCalmLightMode, (calm) => {
  if (calm) {
    stopIdleEffects();
    glitchActive.value = false;
    showcaseTransition.value = false;
    showCursor.value = true;
    if (phase.value === 'showcase') {
      phase.value = 'idle';
    }
    return;
  }

  // If we're already in an idle/showcase phase, restart effects in the new mode.
  if (phase.value === 'idle') {
    startIdleEffects();
  }
  if (phase.value === 'showcase') {
    startShowcase();
  }
});

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (ambientFrame) cancelAnimationFrame(ambientFrame);
  if (showcaseFrame) cancelAnimationFrame(showcaseFrame);
  if (collapseFrame) cancelAnimationFrame(collapseFrame);
  if (bootTimeout) clearTimeout(bootTimeout);
  if (typeTimeout) clearTimeout(typeTimeout);
  if (cursorInterval) clearInterval(cursorInterval);
  if (glitchInterval) clearInterval(glitchInterval);
  if (particleInterval) clearInterval(particleInterval);
  if (showcaseInterval) clearInterval(showcaseInterval);
  if (showcaseTimeout) clearTimeout(showcaseTimeout);
});
</script>

<template>
  <div
    class="animated-terminal-wrapper"
    :class="{
      'is-collapsing': isCollapsing,
      'is-minimized': isMinimized,
    }"
    :style="terminalStyle"
  >
    <!-- Ambient SVG Effects Layer (Behind Terminal) -->
    <svg
      class="ambient-effects"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <!-- Glow filter -->
        <filter
          id="glow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur
            stdDeviation="2"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Gradient for data streams -->
        <linearGradient
          id="streamGrad"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#818CF8"
            stop-opacity="0"
          />
          <stop
            offset="50%"
            stop-color="#818CF8"
            stop-opacity="1"
          />
          <stop
            offset="100%"
            stop-color="#00d4aa"
            stop-opacity="0"
          />
        </linearGradient>
      </defs>

      <!-- Pulse rings -->
      <g class="pulse-rings">
        <circle
          v-for="ring in pulseRings"
          :key="ring.id"
          cx="50"
          cy="50"
          :r="ring.scale * 60"
          fill="none"
          stroke="#818CF8"
          :stroke-opacity="ring.opacity"
          stroke-width="0.5"
        />
      </g>

      <!-- Data streams -->
      <g
        class="data-streams"
        filter="url(#glow)"
      >
        <g
          v-for="stream in dataStreams"
          :key="stream.id"
          :transform="`translate(${stream.x}, ${stream.progress * 150 - 50})`"
        >
          <text
            v-for="(char, i) in stream.chars"
            :key="i"
            :y="i * 4"
            fill="#818CF8"
            font-size="3"
            font-family="monospace"
            :opacity="1 - stream.progress"
          >
            {{ char }}
          </text>
        </g>
      </g>

      <!-- Floating particles -->
      <g
        class="floating-particles"
        filter="url(#glow)"
      >
        <text
          v-for="p in particles"
          :key="p.id"
          :x="p.x"
          :y="p.y"
          :fill="p.color"
          font-size="4"
          font-family="monospace"
          :opacity="p.life"
        >
          {{ p.char }}
        </text>
      </g>

      <!-- Connection lines to terminal -->
      <g
        v-if="phase === 'idle'"
        class="connection-lines"
      >
        <line
          v-for="p in particles.slice(0, 5)"
          :key="'line-' + p.id"
          :x1="p.x"
          :y1="p.y"
          x2="50"
          y2="50"
          stroke="#818CF8"
          :stroke-opacity="p.life * 0.15"
          stroke-width="0.3"
          stroke-dasharray="2,2"
        />
      </g>
    </svg>

    <!-- Main Terminal -->
    <div
      class="animated-terminal"
      :class="{
        'glitch-active': glitchActive,
        [`phase-${phase}`]: true
      }"
    >
      <!-- CRT Screen Effect -->
      <div class="crt-overlay">
        <div class="scanlines" />
        <div class="crt-flicker" />
        <div class="crt-glow" />
      </div>

      <!-- Window Chrome -->
      <div class="window-header">
        <div class="window-dots">
          <span
            class="dot red"
            title="Close"
            @click="closeTerminal"
          >
            <span class="dot-icon">×</span>
          </span>
          <span
            class="dot yellow"
            title="Minimize"
            @click="minimizeTerminal"
          >
            <span class="dot-icon">−</span>
          </span>
          <span
            class="dot green"
            title="Open Branding Wizard"
            @click="openBrandingWizard"
          >
            <span class="dot-icon">+</span>
          </span>
        </div>
        <span class="window-title">
          <span class="title-icon">⌬</span>
          synthstack.terminal
          <span
            v-if="phase === 'idle'"
            class="title-status"
          >● connected</span>
        </span>
        <div class="window-controls">
          <span
            class="control minimize-btn"
            title="Minimize"
            @click="minimizeTerminal"
          >─</span>
          <span
            class="control maximize-btn"
            title="Open Branding Wizard"
            @click="openBrandingWizard"
          >□</span>
          <span class="control close-btn">×</span>
        </div>
      </div>

      <!-- Terminal Content -->
      <div class="window-content">
        <!-- Boot Phase -->
        <div
          v-if="phase === 'boot'"
          class="boot-screen"
        >
          <div class="boot-logo">
            <span
              v-for="(char, i) in '⌬ SYNTHSTACK ⌬'.split('')"
              :key="i"
              class="boot-char"
              :style="{ animationDelay: `${i * 40}ms`, opacity: bootProgress > i / 15 ? 1 : 0 }"
            >
              {{ char }}
            </span>
          </div>
          <div class="boot-progress">
            <div
              class="progress-bar"
              :style="{ width: `${bootProgress * 100}%` }"
            />
            <div
              class="progress-glow"
              :style="{ left: `${bootProgress * 100}%` }"
            />
          </div>
          <div class="boot-text">
            <span class="boot-text-main">INITIALIZING NEURAL INTERFACE</span>
            <span class="boot-dots">...</span>
          </div>
          <div class="boot-stats">
            <span>RAM: {{ Math.floor(bootProgress * 32) }}GB</span>
            <span>CPU: {{ Math.floor(bootProgress * 100) }}%</span>
            <span>QUANTUM: {{ bootProgress > 0.5 ? 'STABLE' : 'SYNC' }}</span>
          </div>
        </div>

        <!-- Matrix Phase -->
        <div
          v-else-if="phase === 'matrix'"
          class="matrix-rain"
        >
          <span
            v-for="(char, i) in matrixChars"
            :key="i"
            class="matrix-char"
            :style="{
              left: `${char.x}%`,
              top: `${char.y}%`,
              opacity: char.opacity,
              color: char.color,
              textShadow: `0 0 8px ${char.color}`
            }"
          >
            {{ char.char }}
          </span>
          <div class="matrix-fade" />
          <div class="matrix-text">
            ESTABLISHING CONNECTION
          </div>
        </div>

        <!-- Showcase Phase - Looping Visualizations -->
        <div
          v-else-if="phase === 'showcase'"
          class="showcase-container"
          :class="{ 'transitioning': showcaseTransition }"
        >
          <!-- Visualization Label -->
          <div class="viz-label">
            <span class="viz-icon">◈</span>
            <span class="viz-name">{{ VISUALIZATION_LABELS[currentVisualization] }}</span>
            <span class="viz-progress">
              <span
                class="progress-fill"
                :style="{ width: `${visualizationProgress * 100}%`, background: currentVizColors.primary }"
              />
            </span>
          </div>

          <!-- Neural Network Visualization -->
          <svg
            v-if="currentVisualization === 'neural' || currentVisualization === 'analytics'"
            class="viz-canvas"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter
                :id="`neural-glow-${currentVisualization}`"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur
                  stdDeviation="1"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- Connection lines - subtle -->
            <g class="neural-connections">
              <template
                v-for="(node, i) in neuralNodes"
                :key="`node-group-${i}`"
              >
                <line
                  v-for="connIdx in node.connections"
                  :key="`conn-${i}-${connIdx}`"
                  :x1="node.x"
                  :y1="node.y"
                  :x2="neuralNodes[connIdx]?.x || 50"
                  :y2="neuralNodes[connIdx]?.y || 50"
                  :stroke="currentVizColors.primary"
                  :stroke-opacity="0.15 + node.glow * 0.15"
                  stroke-width="0.4"
                />
              </template>
            </g>

            <!-- Neural nodes - dimmed but colorful -->
            <g
              class="neural-nodes"
              :filter="`url(#neural-glow-${currentVisualization})`"
            >
              <circle
                v-for="node in neuralNodes"
                :key="node.id"
                :cx="node.x"
                :cy="node.y"
                :r="node.radius * 0.8 + Math.sin(node.pulsePhase) * 0.3"
                :fill="node.color"
                :opacity="0.5 + node.glow * 0.2"
              />
              <!-- Subtle pulse ring -->
              <circle
                v-for="node in neuralNodes"
                :key="`pulse-${node.id}`"
                :cx="node.x"
                :cy="node.y"
                :r="node.radius + 1.5 + Math.sin(node.pulsePhase) * 1"
                fill="none"
                :stroke="node.color"
                :stroke-opacity="0.15 * (1 - Math.sin(node.pulsePhase) * 0.3)"
                stroke-width="0.2"
              />
            </g>
          </svg>

          <!-- Dashboard Visualization -->
          <svg
            v-else-if="currentVisualization === 'dashboard'"
            class="viz-canvas"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter
                id="dashboard-glow"
                x="-30%"
                y="-30%"
                width="160%"
                height="160%"
              >
                <feGaussianBlur
                  stdDeviation="0.8"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- Bar chart - elegant thin bars -->
            <g
              class="dashboard-bars"
              filter="url(#dashboard-glow)"
            >
              <rect
                v-for="el in dashboardElements.filter(e => e.type === 'bar')"
                :key="el.id"
                :x="el.x"
                :y="el.y - el.height * el.progress"
                :width="el.width * 0.7"
                :height="el.height * el.progress"
                :fill="el.color"
                :opacity="0.6"
                rx="1"
              />
            </g>

            <!-- Circular progress - subtle rings -->
            <g class="dashboard-circles">
              <g
                v-for="el in dashboardElements.filter(e => e.type === 'circle')"
                :key="el.id"
              >
                <!-- Background circle -->
                <circle
                  :cx="el.x"
                  :cy="el.y"
                  :r="el.width / 2"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  stroke-width="1.5"
                />
                <!-- Progress arc -->
                <circle
                  :cx="el.x"
                  :cy="el.y"
                  :r="el.width / 2"
                  fill="none"
                  :stroke="el.color"
                  :stroke-opacity="0.6"
                  stroke-width="1.5"
                  :stroke-dasharray="`${el.progress * el.width * Math.PI} ${el.width * Math.PI}`"
                  :transform="`rotate(-90 ${el.x} ${el.y})`"
                  stroke-linecap="round"
                  filter="url(#dashboard-glow)"
                />
                <!-- Center value - dimmed -->
                <text
                  :x="el.x"
                  :y="el.y + 1"
                  :fill="el.color"
                  :fill-opacity="0.5"
                  font-size="2.5"
                  text-anchor="middle"
                >
                  {{ Math.round(el.progress * 100) }}%
                </text>
              </g>
            </g>

            <!-- Floating dots - very subtle -->
            <g class="dashboard-dots">
              <circle
                v-for="el in dashboardElements.filter(e => e.type === 'dot')"
                :key="el.id"
                :cx="el.x"
                :cy="el.y"
                :r="el.width * el.progress * 0.8"
                :fill="el.color"
                :opacity="el.progress * 0.4"
              />
            </g>
          </svg>

          <!-- Flow Visualization -->
          <svg
            v-else-if="currentVisualization === 'flow'"
            class="viz-canvas"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter
                id="flow-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur
                  stdDeviation="1"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- Flow paths (very faint) -->
            <g class="flow-paths">
              <polyline
                v-for="(path, i) in flowPaths"
                :key="`path-${i}`"
                :points="path.points.map(p => `${p.x},${p.y}`).join(' ')"
                fill="none"
                :stroke="currentVizColors.primary"
                stroke-opacity="0.08"
                stroke-width="0.8"
              />
            </g>

            <!-- Flow particles with trails - subtle -->
            <g
              class="flow-particles"
              filter="url(#flow-glow)"
            >
              <g
                v-for="p in flowParticles"
                :key="p.id"
              >
                <!-- Trail -->
                <circle
                  v-for="(t, ti) in p.trail"
                  :key="`trail-${p.id}-${ti}`"
                  :cx="t.x"
                  :cy="t.y"
                  :r="p.size * t.opacity * 0.5"
                  :fill="p.color"
                  :opacity="t.opacity * 0.35"
                />
                <!-- Main particle -->
                <circle
                  v-if="p.trail.length"
                  :cx="p.trail[p.trail.length - 1]?.x || 0"
                  :cy="p.trail[p.trail.length - 1]?.y || 0"
                  :r="p.size * 0.8"
                  :fill="p.color"
                  :opacity="0.6"
                />
              </g>
            </g>
          </svg>

          <!-- CRM Visualization -->
          <svg
            v-else-if="currentVisualization === 'crm'"
            class="viz-canvas"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter
                id="crm-glow"
                x="-30%"
                y="-30%"
                width="160%"
                height="160%"
              >
                <feGaussianBlur
                  stdDeviation="0.8"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- Connection lines between cards - draw first so cards are on top -->
            <g class="crm-connections">
              <line
                v-for="(card, i) in crmCards.slice(0, -1)"
                :key="`crm-line-${i}`"
                :x1="card.x"
                :y1="card.y"
                :x2="crmCards[i + 1]?.x || 50"
                :y2="crmCards[i + 1]?.y || 50"
                :stroke="currentVizColors.primary"
                :stroke-opacity="card.opacity * 0.12"
                stroke-width="0.3"
                stroke-dasharray="1.5,1.5"
              />
            </g>

            <!-- CRM Cards - elegant and subtle -->
            <g
              class="crm-cards"
              filter="url(#crm-glow)"
            >
              <g
                v-for="card in crmCards"
                :key="card.id"
                :opacity="card.opacity * 0.8"
              >
                <!-- Card background -->
                <rect
                  :x="card.x - card.width / 2"
                  :y="card.y - card.height / 2"
                  :width="card.width"
                  :height="card.height"
                  :fill="card.color"
                  fill-opacity="0.08"
                  :stroke="card.color"
                  :stroke-opacity="0.3"
                  stroke-width="0.4"
                  rx="1.5"
                />
                <!-- Subtle pulse overlay -->
                <rect
                  :x="card.x - card.width / 2"
                  :y="card.y - card.height / 2"
                  :width="card.width"
                  :height="card.height"
                  fill="none"
                  :stroke="card.color"
                  :stroke-opacity="0.15 + Math.sin(card.pulsePhase) * 0.1"
                  stroke-width="0.6"
                  rx="1.5"
                />
                <!-- Card content lines - very subtle -->
                <rect
                  :x="card.x - card.width / 2 + 2"
                  :y="card.y - card.height / 2 + 2.5"
                  :width="card.width - 4"
                  height="1.5"
                  :fill="card.color"
                  fill-opacity="0.35"
                  rx="0.5"
                />
                <rect
                  :x="card.x - card.width / 2 + 2"
                  :y="card.y - card.height / 2 + 5.5"
                  :width="card.width * 0.6"
                  height="1"
                  fill="rgba(255,255,255,0.15)"
                  rx="0.5"
                />
                <rect
                  :x="card.x - card.width / 2 + 2"
                  :y="card.y - card.height / 2 + 8"
                  :width="card.width * 0.75"
                  height="1"
                  fill="rgba(255,255,255,0.1)"
                  rx="0.5"
                />
              </g>
            </g>
          </svg>

          <!-- Visualization indicators -->
          <div class="viz-indicators">
            <span
              v-for="viz in (['neural', 'dashboard', 'flow', 'crm', 'analytics'] as VisualizationType[])"
              :key="viz"
              class="viz-dot"
              :class="{ active: currentVisualization === viz }"
              :style="{ background: VIZ_COLORS[viz].primary }"
            />
          </div>
        </div>

        <!-- Typing Phase & Idle -->
        <div
          v-else
          class="terminal-output"
        >
          <div
            v-for="(line, index) in terminalLines.slice(0, visibleLines)"
            :key="index"
            class="terminal-line"
            :class="[`line-${line.type}`]"
          >
            <span
              v-if="line.type === 'command'"
              class="prompt"
            >$</span>
            <span
              v-if="line.type === 'output'"
              class="check"
            >✓</span>
            <span
              v-if="line.type === 'system'"
              class="system-icon"
            >◈</span>
            <span
              v-if="line.type === 'quote'"
              class="quote-icon"
            >›</span>
            <span class="text">{{ getDisplayedText(index) }}</span>
            <span
              v-if="index === visibleLines - 1 && terminalLines[index]?.type === 'command' && phase === 'typing'"
              class="typing-cursor"
            >▊</span>
          </div>

          <!-- Idle cursor with ambient info -->
          <div
            v-if="phase === 'idle'"
            class="terminal-line idle-line"
          >
            <span
              class="idle-cursor"
              :class="{ visible: showCursor }"
            >▊</span>
            <span class="idle-hint">{{ returning ? 'Ready to continue...' : 'Type to begin...' }}</span>
          </div>

          <!-- Live stats bar -->
          <div
            v-if="phase === 'idle'"
            class="stats-bar"
          >
            <span class="stat">
              <span class="stat-icon">◉</span>
              <span class="stat-label">UPTIME:</span>
              <span class="stat-value">{{ Math.floor(idleTime) }}s</span>
            </span>
            <span class="stat">
              <span class="stat-icon">⬡</span>
              <span class="stat-label">PARTICLES:</span>
              <span class="stat-value">{{ particles.length }}</span>
            </span>
            <span class="stat">
              <span class="stat-icon">◈</span>
              <span class="stat-label">VISITS:</span>
              <span class="stat-value">{{ visitCount }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Glitch Slices -->
      <div
        v-if="glitchActive"
        class="glitch-slices"
      >
        <div class="glitch-slice slice-1" />
        <div class="glitch-slice slice-2" />
        <div class="glitch-slice slice-3" />
      </div>

      <!-- RGB Split Effect -->
      <div class="rgb-split" />

      <!-- Holographic Shimmer -->
      <div class="holo-shimmer" />

      <!-- Edge glow -->
      <div class="edge-glow" />

      <!-- Void Collapse Animation Overlay -->
      <div
        v-if="isCollapsing"
        class="void-collapse-overlay"
      >
        <svg
          class="void-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter
              id="void-glow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur
                :stdDeviation="2 + collapseProgress * 3"
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient
              id="void-gradient"
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop
                offset="0%"
                stop-color="#0a0a0f"
                stop-opacity="1"
              />
              <stop
                offset="60%"
                stop-color="#0a0a0f"
                :stop-opacity="collapseProgress * 0.9"
              />
              <stop
                offset="100%"
                stop-color="transparent"
                stop-opacity="0"
              />
            </radialGradient>
          </defs>

          <!-- Central void -->
          <circle
            cx="50"
            cy="50"
            :r="3 + (1 - collapseProgress) * 45"
            fill="url(#void-gradient)"
          />

          <!-- Spiraling particles being consumed -->
          <g filter="url(#void-glow)">
            <circle
              v-for="p in voidParticles"
              :key="p.id"
              :cx="p.x"
              :cy="p.y"
              :r="p.size"
              :fill="['#818CF8', '#00d4aa', '#c084fc', '#22d3ee'][p.id % 4]"
              :opacity="p.opacity * 0.8"
            />
          </g>

          <!-- Event horizon ring -->
          <circle
            cx="50"
            cy="50"
            :r="5 + (1 - collapseProgress) * 40"
            fill="none"
            stroke="#818CF8"
            :stroke-opacity="0.5 - collapseProgress * 0.4"
            :stroke-width="1 + collapseProgress * 2"
          />

          <!-- Inner distortion rings -->
          <circle
            v-for="i in 3"
            :key="`ring-${i}`"
            cx="50"
            cy="50"
            :r="8 + i * 8 - collapseProgress * (8 + i * 8)"
            fill="none"
            :stroke="['#818CF8', '#00d4aa', '#c084fc'][i - 1]"
            :stroke-opacity="(1 - collapseProgress) * 0.3"
            stroke-width="0.5"
          />
        </svg>
      </div>
    </div>

    <!-- Minimized Floating Button -->
    <div
      v-if="isMinimized"
      class="minimized-button"
      title="Expand Terminal"
      @click="expandTerminal"
    >
      <div class="mini-icon">
        <span class="mini-s">S</span>
        <div class="mini-pulse" />
      </div>
      <div class="mini-glow" />
    </div>

    <!-- Emanating effects (In front) -->
    <div
      v-if="phase === 'idle'"
      class="emanating-effects"
    >
      <div class="corner-accent top-left" />
      <div class="corner-accent top-right" />
      <div class="corner-accent bottom-left" />
      <div class="corner-accent bottom-right" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.animated-terminal-wrapper {
  position: relative;
  // Fixed size terminal that scales responsively
  width: 520px;
  height: 420px;
  padding: 30px;
  margin: 0 auto;
}

// Ambient SVG Effects
.ambient-effects {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  opacity: 0.8;
}

.animated-terminal {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0f;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.3),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 80px rgba(99, 102, 241, calc(var(--glow-intensity, 0.3) * 0.3)),
    inset 0 0 60px rgba(99, 102, 241, 0.03);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  z-index: 1;

  // CRT curvature effect
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 0%,
      rgba(0, 0, 0, 0.15) 80%,
      rgba(0, 0, 0, 0.3) 100%
    );
    pointer-events: none;
    z-index: 10;
  }
}

// Edge Glow
.edge-glow {
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    rgba(129, 140, 248, 0.3) 0%,
    transparent 30%,
    transparent 70%,
    rgba(0, 212, 170, 0.3) 100%
  );
  z-index: -1;
  animation: edge-pulse 4s ease-in-out infinite;
}

@keyframes edge-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

// CRT Overlay Effects
.crt-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.12) 2px,
    rgba(0, 0, 0, 0.12) 4px
  );
  background-position: 0 var(--scanline-offset, 0);
}

.crt-flicker {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.01);
  animation: flicker 0.15s infinite;
}

.crt-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(129, 140, 248, 0.05) 0%,
    transparent 60%
  );
}

@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.97; }
  75% { opacity: 1.02; }
}

// Window Header
.window-header {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
  position: relative;
  z-index: 25; // Above CRT overlay (z-index: 5) and glitch slices (z-index: 20)
}

.window-dots {
  display: flex;
  gap: 8px;

  // Show icons on hover of the container (macOS style)
  &:hover .dot-icon {
    opacity: 1;
  }
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.15);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    pointer-events: none;
  }

  &.red {
    background: #ff5f57;
    box-shadow: 0 0 8px rgba(255, 95, 87, 0.5);

    &:hover {
      box-shadow: 0 0 12px rgba(255, 95, 87, 0.8);
    }
  }
  &.yellow {
    background: #ffbd2e;
    box-shadow: 0 0 8px rgba(255, 189, 46, 0.5);

    &:hover {
      box-shadow: 0 0 12px rgba(255, 189, 46, 0.8);
    }
  }
  &.green {
    background: #28c840;
    box-shadow: 0 0 8px rgba(40, 200, 64, 0.5);

    &:hover {
      box-shadow: 0 0 12px rgba(40, 200, 64, 0.8);
    }
  }
}

.dot-icon {
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 1;
  color: rgba(0, 0, 0, 0.6);
  user-select: none;
}

.window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.5px;

  .title-icon {
    color: #818CF8;
    font-size: 1rem;
    animation: icon-pulse 2s ease-in-out infinite;
  }

  .title-status {
    margin-left: 8px;
    color: #00d4aa;
    font-size: 0.7rem;
    animation: status-blink 2s ease-in-out infinite;
  }
}

@keyframes icon-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
}

@keyframes status-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// Window Content
.window-content {
  padding: 24px;
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
}

// Boot Screen
.boot-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 16px;
}

.boot-logo {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 4px;
  display: flex;
}

.boot-char {
  color: #818CF8;
  text-shadow: 0 0 10px rgba(129, 140, 248, 0.5);
  animation: boot-glow 0.4s ease-out forwards;
  opacity: 0;
}

@keyframes boot-glow {
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(1.2);
    text-shadow: 0 0 30px rgba(129, 140, 248, 1);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    text-shadow: 0 0 10px rgba(129, 140, 248, 0.5);
  }
}

.boot-progress {
  width: 220px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: visible;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #818CF8 0%, #00d4aa 100%);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-glow {
  position: absolute;
  top: -4px;
  width: 20px;
  height: 12px;
  background: radial-gradient(ellipse, rgba(129, 140, 248, 0.8) 0%, transparent 70%);
  transform: translateX(-50%);
  transition: left 0.1s linear;
}

.boot-text {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 2px;

  .boot-dots {
    animation: boot-dots 1s steps(3) infinite;
  }
}

@keyframes boot-dots {
  0% { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
}

.boot-stats {
  display: flex;
  gap: 20px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 1px;

  span {
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
  }
}

// Matrix Rain
.matrix-rain {
  position: relative;
  min-height: 200px;
  overflow: hidden;
}

.matrix-char {
  position: absolute;
  font-size: 0.85rem;
  font-weight: 600;
  transition: top 0.05s linear;
}

.matrix-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 15, 0) 0%,
    rgba(10, 10, 15, 0.7) 70%,
    rgba(10, 10, 15, 1) 100%
  );
}

.matrix-text {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.7rem;
  letter-spacing: 3px;
  animation: matrix-text-pulse 0.5s ease-in-out infinite;
}

@keyframes matrix-text-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

// ===== SHOWCASE VISUALIZATIONS =====
.showcase-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: opacity 0.3s ease;

  &.transitioning {
    opacity: 0.6;
  }
}

.viz-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  .viz-icon {
    color: rgba(129, 140, 248, 0.7);
    font-size: 0.85rem;
    animation: viz-icon-pulse 3s ease-in-out infinite;
  }

  .viz-name {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .viz-progress {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 1px;
    overflow: hidden;
    margin-left: auto;
    max-width: 60px;

    .progress-fill {
      height: 100%;
      border-radius: 1px;
      opacity: 0.6;
      transition: width 0.1s linear;
    }
  }
}

@keyframes viz-icon-pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.95); }
}

.viz-canvas {
  flex: 1;
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  opacity: 0.85;
}

.viz-indicators {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 6px;
}

.viz-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  opacity: 0.2;
  transition: all 0.4s ease;

  &.active {
    opacity: 0.8;
    transform: scale(1.4);
    box-shadow: 0 0 8px currentColor;
  }
}

// Neural network - subtle organic feel
.neural-connections line {
  transition: stroke-opacity 0.5s ease;
}

.neural-nodes circle {
  transition: r 0.3s ease, opacity 0.3s ease;
}

// Dashboard - clean minimal
.dashboard-bars rect {
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1), y 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.dashboard-circles circle {
  transition: stroke-dasharray 0.6s ease;
}

// Flow - smooth trails
.flow-particles circle {
  transition: none;
}

.flow-paths polyline {
  stroke-linecap: round;
  stroke-linejoin: round;
}

// CRM - elegant cards
.crm-cards rect {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.crm-connections line {
  transition: stroke-opacity 0.4s ease;
}

// Responsive showcase
@media (max-width: 600px) {
  .viz-label {
    gap: 6px;
    margin-bottom: 6px;

    .viz-name {
      font-size: 0.55rem;
    }
    .viz-progress {
      max-width: 40px;
    }
  }

  .viz-indicators {
    gap: 5px;
    margin-top: 8px;
  }

  .viz-dot {
    width: 4px;
    height: 4px;
  }
}

// Terminal Output
.terminal-output {
  font-size: 0.85rem;
  line-height: 1.7;
}

.terminal-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 1.7em;
  transition: opacity 0.2s;

  &.line-command {
    .text { color: #4ec9b0; }
  }

  &.line-output {
    .check { color: #6a9955; }
    .text { color: #d4d4d4; }
  }

  &.line-success {
    .text {
      color: #00d4aa;
      font-weight: 600;
      text-shadow: 0 0 10px rgba(0, 212, 170, 0.3);
    }
  }

  &.line-system {
    .system-icon { color: #818CF8; }
    .text {
      color: rgba(255, 255, 255, 0.7);
      font-style: italic;
    }
  }

  &.line-quote {
    .quote-icon { color: #00d4aa; }
    .text {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.8rem;
    }
  }

  &.line-empty {
    height: 0.8em;
  }

  &.idle-line {
    margin-top: 8px;
    opacity: 0.6;
  }
}

.prompt {
  color: #818CF8;
  font-weight: 600;
}

.typing-cursor {
  color: #818CF8;
  animation: cursor-blink 0.5s step-end infinite;
}

.idle-cursor {
  color: #818CF8;
  opacity: 0;
  transition: opacity 0.1s;

  &.visible {
    opacity: 1;
  }
}

.idle-hint {
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.75rem;
  margin-left: 8px;
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

// Stats Bar
.stats-bar {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);

  .stat-icon {
    color: #818CF8;
    font-size: 0.7rem;
  }

  .stat-label {
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    color: #00d4aa;
    font-weight: 600;
  }
}

// Glitch Effects
.glitch-active {
  animation: glitch-shake 0.08s linear;
}

@keyframes glitch-shake {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-3px, 1px); }
  40% { transform: translate(3px, -1px); }
  60% { transform: translate(-2px, 2px); }
  80% { transform: translate(2px, -2px); }
}

.glitch-slices {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.glitch-slice {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;

  &.slice-1 {
    top: 15%;
    transform: translateX(-8px);
    background: rgba(0, 255, 255, 0.15);
  }

  &.slice-2 {
    top: 45%;
    transform: translateX(5px);
    background: rgba(255, 0, 255, 0.15);
  }

  &.slice-3 {
    top: 80%;
    transform: translateX(-3px);
    background: rgba(0, 255, 255, 0.1);
  }
}

// RGB Split
.rgb-split {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  mix-blend-mode: screen;
  opacity: 0;

  .glitch-active & {
    opacity: 1;
    background:
      linear-gradient(90deg, rgba(255, 0, 0, 0.05) 0%, transparent 50%),
      linear-gradient(-90deg, rgba(0, 255, 255, 0.05) 0%, transparent 50%);
  }
}

// Holographic Shimmer
.holo-shimmer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.02) 45%,
    rgba(255, 255, 255, 0.04) 50%,
    rgba(255, 255, 255, 0.02) 55%,
    transparent 60%
  );
  background-size: 200% 100%;
  animation: shimmer 5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// Emanating Effects
.emanating-effects {
  position: absolute;
  inset: 20px;
  pointer-events: none;
  z-index: 0;
}

.corner-accent {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(129, 140, 248, 0.3);

  &.top-left {
    top: 0;
    left: 0;
    border-right: none;
    border-bottom: none;
    animation: corner-pulse 3s ease-in-out infinite;
  }

  &.top-right {
    top: 0;
    right: 0;
    border-left: none;
    border-bottom: none;
    animation: corner-pulse 3s ease-in-out infinite 0.5s;
  }

  &.bottom-left {
    bottom: 0;
    left: 0;
    border-right: none;
    border-top: none;
    animation: corner-pulse 3s ease-in-out infinite 1s;
  }

  &.bottom-right {
    bottom: 0;
    right: 0;
    border-left: none;
    border-top: none;
    animation: corner-pulse 3s ease-in-out infinite 1.5s;
  }
}

@keyframes corner-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

// ===== MINIMIZE/COLLAPSE STYLES =====

// Collapsing state
.animated-terminal-wrapper {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;

  &.is-collapsing {
    .animated-terminal {
      transform: scale(0.95);
      opacity: 0.8;
    }

    .ambient-effects,
    .emanating-effects {
      opacity: 0;
    }
  }

  &.is-minimized {
    .animated-terminal,
    .ambient-effects,
    .emanating-effects {
      display: none;
    }
  }
}

// Void collapse overlay
.void-collapse-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  animation: void-fade-in 0.2s ease-out;
}

@keyframes void-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.void-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

// Minimized floating button
.minimized-button {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0f 100%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 0 0 1px rgba(129, 140, 248, 0.4),
    0 8px 32px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(129, 140, 248, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: mini-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    transform: scale(1.1);
    box-shadow:
      0 0 0 2px rgba(129, 140, 248, 0.6),
      0 12px 40px rgba(0, 0, 0, 0.7),
      0 0 60px rgba(129, 140, 248, 0.3);

    .mini-icon {
      transform: scale(1.05);
    }

    .mini-glow {
      opacity: 1;
    }
  }

  &:active {
    transform: scale(0.95);
  }
}

@keyframes mini-appear {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-180deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

.mini-icon {
  position: relative;
  z-index: 2;
  transition: transform 0.3s ease;
}

.mini-s {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.4rem;
  font-weight: 700;
  color: #818CF8;
  text-shadow: 0 0 10px rgba(129, 140, 248, 0.5);
  animation: mini-s-pulse 2s ease-in-out infinite;
}

@keyframes mini-s-pulse {
  0%, 100% {
    text-shadow: 0 0 10px rgba(129, 140, 248, 0.5);
  }
  50% {
    text-shadow: 0 0 20px rgba(129, 140, 248, 0.8), 0 0 30px rgba(0, 212, 170, 0.4);
  }
}

.mini-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(129, 140, 248, 0.3);
  animation: mini-pulse-ring 2s ease-out infinite;
}

@keyframes mini-pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.mini-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.3) 0%, transparent 70%);
  opacity: 0.5;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

// Window control button styling
.window-controls {
  margin-left: auto;
  display: flex;
  gap: 12px;
  position: relative;
  z-index: 30;

  .control {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.9rem;
    cursor: pointer !important;
    transition: all 0.2s ease;
    padding: 4px 6px;
    border-radius: 4px;
    user-select: none;

    &:hover {
      color: rgba(255, 255, 255, 0.9);
    }

    &.minimize-btn {
      cursor: pointer !important;

      &:hover {
        background: rgba(255, 189, 46, 0.2);
        color: #ffbd2e;
      }
    }

    &.maximize-btn {
      cursor: pointer !important;

      &:hover {
        background: rgba(40, 200, 64, 0.2);
        color: #28c840;
      }
    }

    &.close-btn {
      cursor: not-allowed;

      &:hover {
        background: rgba(255, 95, 87, 0.2);
        color: #ff5f57;
      }
    }
  }
}

// Responsive - scale down for smaller screens while maintaining aspect ratio
@media (max-width: 1100px) {
  .animated-terminal-wrapper {
    width: 480px;
    height: 390px;
  }
}

@media (max-width: 900px) {
  .animated-terminal-wrapper {
    width: 100%;
    max-width: 520px;
    height: 380px;
    padding: 20px;
  }
}

@media (max-width: 600px) {
  .animated-terminal-wrapper {
    width: 100%;
    max-width: 100%;
    height: 340px;
    padding: 15px;
  }

  .window-content {
    padding: 16px;
  }

  .window-header {
    padding: 10px 12px;
  }

  .terminal-output {
    font-size: 0.75rem;
  }

  .boot-logo {
    font-size: 1rem;
    letter-spacing: 2px;
  }

  .boot-stats {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .stats-bar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .stat {
    font-size: 0.6rem;
  }
}

@media (max-width: 400px) {
  .animated-terminal-wrapper {
    height: 320px;
    padding: 10px;
  }

  .window-header {
    padding: 8px 10px;
    gap: 8px;

    .window-title {
      font-size: 0.7rem;
    }
  }

  .window-content {
    padding: 12px;
  }

  .terminal-output {
    font-size: 0.7rem;
    line-height: 1.5;
  }

  .boot-logo {
    font-size: 0.85rem;
    letter-spacing: 1px;
  }

  .boot-progress {
    width: 180px;
  }

  .boot-text {
    font-size: 0.6rem;
  }

  .boot-stats {
    font-size: 0.55rem;
    gap: 6px;

    span {
      padding: 3px 6px;
    }
  }
}
</style>
