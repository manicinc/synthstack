<script setup lang="ts">
/**
 * HeroDAGVisualization Component
 * 
 * Animated DAG (Directed Acyclic Graph) visualization for the hero section
 * showing data flowing between workflow nodes: Trigger → AI Agent → Action → Output
 */

import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const isCalmLightMode = computed(() => !themeStore.isDark)

// In light mode, completely disable heavy features for performance
const disableHeavyEffects = computed(() => !themeStore.isDark)

// Computed fill color for node inner circle - adapts to light/dark mode
const nodeInnerFill = computed(() =>
  themeStore.isDark ? 'rgba(10, 10, 26, 0.8)' : '#ffffff'
)

interface DAGNode {
  id: string
  label: string
  icon: string
  x: number
  y: number
  color: string
  glowColor: string
  type: 'trigger' | 'agent' | 'action' | 'output'
}

interface DAGEdge {
  from: string
  to: string
  animated: boolean
}

const containerRef = ref<HTMLElement | null>(null)
const mouseX = ref(0.5)
const mouseY = ref(0.5)

// DAG nodes representing a typical workflow
const nodes: DAGNode[] = [
  { id: 'trigger', label: 'Webhook', icon: 'webhook', x: 10, y: 50, color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.4)', type: 'trigger' },
  { id: 'ai1', label: 'AI Qualify', icon: 'psychology', x: 30, y: 25, color: '#6366f1', glowColor: 'rgba(99, 102, 241, 0.4)', type: 'agent' },
  { id: 'ai2', label: 'AI Respond', icon: 'smart_toy', x: 30, y: 75, color: '#8b5cf6', glowColor: 'rgba(139, 92, 246, 0.4)', type: 'agent' },
  { id: 'condition', label: 'Router', icon: 'call_split', x: 50, y: 50, color: '#00d4aa', glowColor: 'rgba(0, 212, 170, 0.4)', type: 'action' },
  { id: 'slack', label: 'Slack', icon: 'chat', x: 70, y: 25, color: '#e91e8f', glowColor: 'rgba(233, 30, 143, 0.4)', type: 'action' },
  { id: 'email', label: 'Email', icon: 'email', x: 70, y: 75, color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.4)', type: 'action' },
  { id: 'db', label: 'Database', icon: 'storage', x: 90, y: 50, color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.4)', type: 'output' },
]

const edges: DAGEdge[] = [
  { from: 'trigger', to: 'ai1', animated: true },
  { from: 'trigger', to: 'ai2', animated: true },
  { from: 'ai1', to: 'condition', animated: true },
  { from: 'ai2', to: 'condition', animated: true },
  { from: 'condition', to: 'slack', animated: true },
  { from: 'condition', to: 'email', animated: true },
  { from: 'slack', to: 'db', animated: true },
  { from: 'email', to: 'db', animated: true },
]

// Compute edge paths
const edgePaths = computed(() => {
  return edges.map(edge => {
    const fromNode = nodes.find(n => n.id === edge.from)!
    const toNode = nodes.find(n => n.id === edge.to)!
    
    const x1 = fromNode.x
    const y1 = fromNode.y
    const x2 = toNode.x
    const y2 = toNode.y
    
    // Calculate control points for curved bezier
    const midX = (x1 + x2) / 2
    const dx = x2 - x1
    const dy = y2 - y1
    
    // Create smooth S-curve
    const cx1 = x1 + dx * 0.4
    const cy1 = y1
    const cx2 = x2 - dx * 0.4
    const cy2 = y2
    
    return {
      ...edge,
      path: `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`,
      fromNode,
      toNode,
      length: Math.sqrt(dx * dx + dy * dy)
    }
  })
})

// Parallax effect
const parallaxStyle = computed(() => ({
  transform: `translate(${(mouseX.value - 0.5) * 20}px, ${(mouseY.value - 0.5) * 10}px)`
}))

function handleMouseMove(e: MouseEvent) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  mouseX.value = (e.clientX - rect.left) / rect.width
  mouseY.value = (e.clientY - rect.top) / rect.height
}

// Particle animation state
const particles = ref<Array<{ id: number; edgeIndex: number; progress: number; speed: number }>>([])
let particleId = 0
let animationFrame: number | null = null
let particlesLoopActive = false

const prefersReducedMotion = ref(false)
let reduceMotionMediaQuery: MediaQueryList | null = null
const reduceMotionHandler = (e: MediaQueryListEvent) => {
  prefersReducedMotion.value = e.matches
}

// Disable particles in light mode AND when heavy effects are off
const shouldAnimateParticles = computed(() =>
  !prefersReducedMotion.value && !isCalmLightMode.value && !disableHeavyEffects.value
)

function createParticle() {
  const edgeIndex = Math.floor(Math.random() * edges.length)
  particles.value.push({
    id: particleId++,
    edgeIndex,
    progress: 0,
    speed: 0.005 + Math.random() * 0.01
  })
}

function updateParticles() {
  if (!particlesLoopActive) return

  particles.value = particles.value
    .map(p => ({ ...p, progress: p.progress + p.speed }))
    .filter(p => p.progress < 1)
  
  // Create new particles periodically
  if (Math.random() < 0.05) {
    createParticle()
  }
  
  animationFrame = requestAnimationFrame(updateParticles)
}

function startParticleAnimation() {
  if (particlesLoopActive) return
  particlesLoopActive = true

  particles.value = []
  particleId = 0

  // Initial particles
  for (let i = 0; i < 8; i++) {
    createParticle()
  }

  updateParticles()
}

function stopParticleAnimation() {
  particlesLoopActive = false

  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  particles.value = []
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    reduceMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = reduceMotionMediaQuery.matches

    reduceMotionMediaQuery.addEventListener('change', reduceMotionHandler)
  }

  if (shouldAnimateParticles.value) startParticleAnimation()
})

onUnmounted(() => {
  if (reduceMotionMediaQuery) {
    reduceMotionMediaQuery.removeEventListener('change', reduceMotionHandler)
  }

  stopParticleAnimation()
})

watch(shouldAnimateParticles, (enabled) => {
  if (enabled) startParticleAnimation()
  else stopParticleAnimation()
})

// Get particle position along bezier curve
function getParticlePosition(edgeIndex: number, t: number) {
  const edge = edgePaths.value[edgeIndex]
  if (!edge) return { x: 0, y: 0 }
  
  const { fromNode, toNode } = edge
  const x1 = fromNode.x
  const y1 = fromNode.y
  const x2 = toNode.x
  const y2 = toNode.y
  
  const dx = x2 - x1
  const cx1 = x1 + dx * 0.4
  const cx2 = x2 - dx * 0.4
  
  // Cubic bezier interpolation
  const mt = 1 - t
  const x = mt * mt * mt * x1 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x2
  const y = mt * mt * mt * y1 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y2
  
  return { x, y }
}
</script>

<template>
  <div 
    ref="containerRef"
    class="hero-dag-visualization"
    :class="{ 'calm-light': isCalmLightMode }"
    @mousemove="handleMouseMove"
  >
    <!-- Background glow effects - hidden in light mode for performance -->
    <div v-if="!disableHeavyEffects" class="dag-glow-layer">
      <div class="glow-orb orb-1" />
      <div class="glow-orb orb-2" />
      <div class="glow-orb orb-3" />
    </div>

    <!-- Main DAG SVG -->
    <svg 
      class="dag-svg" 
      viewBox="0 0 100 100" 
      preserveAspectRatio="xMidYMid meet"
      :style="parallaxStyle"
    >
      <!-- Gradient definitions -->
      <defs>
        <linearGradient
          id="edgeGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            stop-color="#6366f1"
            stop-opacity="0.2"
          />
          <stop
            offset="50%"
            stop-color="#00d4aa"
            stop-opacity="0.6"
          />
          <stop
            offset="100%"
            stop-color="#6366f1"
            stop-opacity="0.2"
          />
        </linearGradient>
        
        <filter
          id="glow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur
            stdDeviation="0.8"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter
          id="particleGlow"
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur
            stdDeviation="0.3"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Animated dash pattern -->
        <pattern
          id="flowPattern"
          patternUnits="userSpaceOnUse"
          width="4"
          height="1"
        >
          <rect
            width="2"
            height="1"
            fill="#00d4aa"
            opacity="0.8"
          >
            <animate 
              attributeName="x" 
              from="0" 
              to="4" 
              dur="0.5s" 
              repeatCount="indefinite" 
            />
          </rect>
        </pattern>
      </defs>

      <!-- Edge connections - always visible, simplified in light mode -->
      <g class="edges-layer">
        <path
          v-for="(edge, index) in edgePaths"
          :key="`edge-${index}`"
          :d="edge.path"
          class="dag-edge"
          fill="none"
          :stroke="disableHeavyEffects ? '#94a3b8' : 'url(#edgeGradient)'"
          :stroke-width="disableHeavyEffects ? 0.4 : 0.3"
          stroke-linecap="round"
        />

        <!-- Animated flow lines - only in dark mode -->
        <template v-if="!disableHeavyEffects">
          <path
            v-for="(edge, index) in edgePaths"
            :key="`flow-${index}`"
            :d="edge.path"
            class="dag-edge-flow"
            fill="none"
            stroke="#00d4aa"
            stroke-width="0.15"
            stroke-dasharray="2 3"
            stroke-linecap="round"
            :style="{ animationDelay: `${index * 0.3}s` }"
          />
        </template>
      </g>

      <!-- Data particles - only render in dark mode for performance -->
      <g v-if="!disableHeavyEffects" class="particles-layer">
        <circle
          v-for="particle in particles"
          :key="particle.id"
          :cx="getParticlePosition(particle.edgeIndex, particle.progress).x"
          :cy="getParticlePosition(particle.edgeIndex, particle.progress).y"
          r="0.6"
          fill="#00d4aa"
          class="data-particle"
        />
      </g>

      <!-- Nodes - simplified in light mode -->
      <g class="nodes-layer">
        <g
          v-for="node in nodes"
          :key="node.id"
          class="dag-node"
          :transform="`translate(${node.x}, ${node.y})`"
        >
          <!-- Node glow - only in dark mode -->
          <circle
            v-if="!disableHeavyEffects"
            r="4"
            :fill="node.glowColor"
            class="node-glow"
          />

          <!-- Node background - only in dark mode -->
          <circle
            v-if="!disableHeavyEffects"
            r="3"
            :fill="node.color"
            class="node-bg"
            filter="url(#glow)"
          />

          <!-- Node inner circle - white in light mode -->
          <circle
            r="2.5"
            :fill="nodeInnerFill"
            :stroke-width="disableHeavyEffects ? 0.4 : 0.3"
            :stroke="node.color"
          />

          <!-- Node icon -->
          <text
            text-anchor="middle"
            dominant-baseline="central"
            font-size="1.8"
            :fill="node.color"
            class="node-icon-text"
          >
            {{ node.type === 'trigger' ? '⚡' : node.type === 'agent' ? '🤖' : node.type === 'action' ? '⚙' : '💾' }}
          </text>
        </g>
      </g>
    </svg>

    <!-- Floating labels -->
    <div
      class="dag-labels"
      :style="parallaxStyle"
    >
      <div
        v-for="node in nodes"
        :key="`label-${node.id}`"
        class="node-label"
        :style="{
          left: `${node.x}%`,
          top: `${node.y + 8}%`,
          '--node-color': node.color,
          background: disableHeavyEffects ? '#ffffff' : undefined,
          backdropFilter: disableHeavyEffects ? 'none' : undefined,
          boxShadow: disableHeavyEffects ? '0 1px 4px rgba(0,0,0,0.1)' : undefined
        }"
      >
        <q-icon
          :name="node.icon"
          size="12px"
          :style="{ color: node.color }"
        />
        <span :style="{ color: disableHeavyEffects ? '#1a1a2e' : undefined }">{{ node.label }}</span>
      </div>
    </div>

    <!-- Tech badge -->
    <div
      class="langgraph-badge"
      :style="{
        background: disableHeavyEffects ? '#ffffff' : undefined,
        backdropFilter: disableHeavyEffects ? 'none' : undefined,
        boxShadow: disableHeavyEffects ? '0 1px 4px rgba(0,0,0,0.1)' : undefined
      }"
    >
      <span class="badge-icon" :style="{ color: disableHeavyEffects ? '#6366f1' : undefined }">⬡</span>
      <span class="badge-text" :style="{ color: disableHeavyEffects ? '#1a1a2e' : undefined }">Powered by LangGraph</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hero-dag-visualization {
  position: relative;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 4 / 3;
  margin: 0 auto;
  margin-top: -80px; // Move diagram up on desktop
}

.hero-dag-visualization.calm-light {
  --glow-opacity: 0.08;
  --node-glow-opacity: 0.12;
  --edge-opacity: 0.22;
  --particle-opacity: 0;

  .glow-orb,
  .node-glow,
  .dag-edge-flow,
  .data-particle,
  .langgraph-badge .badge-icon {
    animation: none !important;
  }

  .node-label {
    opacity: 1 !important;
    animation: none !important;
    backdrop-filter: none !important;
  }

  .langgraph-badge {
    backdrop-filter: none !important;
  }
}

// Glow layer
.dag-glow-layer {
  position: absolute;
  inset: -20%;
  pointer-events: none;
  overflow: hidden;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  animation: float-orb 12s ease-in-out infinite;

  &.orb-1 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%);
    top: 10%;
    left: 10%;
  }

  &.orb-2 {
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, rgba(0, 212, 170, 0.3) 0%, transparent 70%);
    bottom: 20%;
    right: 15%;
    animation-delay: -4s;
  }

  &.orb-3 {
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: -8s;
  }
}

@keyframes float-orb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20px, -15px) scale(1.1); }
  66% { transform: translate(-15px, 10px) scale(0.95); }
}

// Main SVG
.dag-svg {
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease-out;
}

// Edge animations
.dag-edge {
  opacity: 0.6;
}

.dag-edge-flow {
  animation: dash-flow 3s linear infinite;
}

@keyframes dash-flow {
  to {
    stroke-dashoffset: -20;
  }
}

// Node styling
.dag-node {
  cursor: pointer;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.2);
  }
}

.node-glow {
  opacity: 0.4;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.3; r: 4; }
  50% { opacity: 0.6; r: 5; }
}

.node-bg {
  transition: all 0.3s ease;
}

.node-icon-text {
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  pointer-events: none;
}

// Data particles
.data-particle {
  animation: particle-pulse 1s ease-in-out infinite;
}

@keyframes particle-pulse {
  0%, 100% { opacity: 0.6; r: 0.5; }
  50% { opacity: 1; r: 0.8; }
}

// Floating labels
// =============================================
// CSS Variables for theme-aware styling
// =============================================
.hero-dag-visualization {
  // Dark mode defaults
  --node-bg: rgba(10, 10, 26, 0.85);
  --node-border: rgba(255, 255, 255, 0.1);
  --node-text: rgba(255, 255, 255, 0.9);
  --node-icon: currentColor;
  --node-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  --badge-bg: rgba(99, 102, 241, 0.15);
  --badge-border: rgba(99, 102, 241, 0.3);
  --badge-text: #a5b4fc;
  --glow-opacity: 1;
  --node-glow-opacity: 0.6;
  --edge-opacity: 0.6;
  --particle-opacity: 0.8;
}

// Light mode - clean, performant, no heavy effects
:global(.body--light) .hero-dag-visualization {
  --node-bg: #ffffff;
  --node-border: rgba(0, 0, 0, 0.08);
  --node-text: #1e293b;
  --node-icon: #334155;
  --node-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  --badge-bg: rgba(99, 102, 241, 0.08);
  --badge-border: rgba(99, 102, 241, 0.15);
  --badge-text: #4f46e5;
  --glow-opacity: 0;
  --node-glow-opacity: 0;
  --edge-opacity: 0.25;
  --particle-opacity: 0;

  // Remove backdrop-filter for performance
  .node-label {
    backdrop-filter: none;
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  .langgraph-badge {
    backdrop-filter: none;
    background: rgba(255, 255, 255, 0.95);
  }

  // Disable ALL animations in light mode
  * {
    animation: none !important;
    transition: none !important;
  }
}

.dag-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: transform 0.3s ease-out;
}

.node-label {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--node-bg);
  border: 1px solid var(--node-border);
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--node-text);
  white-space: nowrap;
  backdrop-filter: blur(8px);
  box-shadow: var(--node-shadow);
  opacity: 0;
  animation: fade-in-label 0.5s ease forwards;
  animation-delay: calc(var(--index, 0) * 0.1s);

  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-bottom-color: var(--node-bg);
  }

  .q-icon {
    color: var(--node-icon);
  }
}

@keyframes fade-in-label {
  to { opacity: 1; }
}

// LangGraph badge
.langgraph-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--badge-bg);
  border: 1px solid var(--badge-border);
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--badge-text);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);

  .badge-icon {
    animation: rotate-hex 8s linear infinite;
  }
}

@keyframes rotate-hex {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Glow orbs - controlled by variable
.glow-orb {
  opacity: var(--glow-opacity);
}

// Node glow
.node-glow {
  opacity: var(--node-glow-opacity);
}

// Node background
.node-bg {
  opacity: calc(var(--node-glow-opacity) + 0.2);
}

// Edges
.dag-edge {
  opacity: var(--edge-opacity);
}

.dag-edge-flow {
  opacity: calc(var(--edge-opacity) + 0.1);
}

// Particles
.data-particle {
  opacity: var(--particle-opacity);
}

// Responsive - Mobile: DAG becomes small background element
@media (max-width: 768px) {
  .hero-dag-visualization {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 320px;
    width: 90%;
    aspect-ratio: 1 / 1;
    margin: 0;
    opacity: 0.15;
    z-index: 0;
    pointer-events: none;
    filter: blur(1px);
  }

  .dag-glow-layer {
    display: none;
  }

  .node-label {
    display: none; // Hide labels on mobile background mode
  }

  .langgraph-badge {
    display: none; // Hide badge on mobile background mode
  }

  .dag-edge,
  .dag-edge-flow {
    stroke-width: 0.5;
  }

  .dag-node {
    pointer-events: none;

    &:hover {
      transform: none;
    }
  }
}

// Tablet - still visible but smaller
@media (min-width: 769px) and (max-width: 1024px) {
  .hero-dag-visualization {
    max-width: 450px;
    margin-top: -60px;
  }

  .node-label {
    font-size: 0.6rem;
    padding: 3px 8px;
  }

  .langgraph-badge {
    font-size: 0.6rem;
    padding: 4px 10px;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .glow-orb,
  .node-glow,
  .dag-edge-flow,
  .data-particle,
  .langgraph-badge .badge-icon {
    animation: none;
  }
}
</style>
