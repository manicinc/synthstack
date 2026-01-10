<script setup lang="ts">
/**
 * ThreeDGraphVisualization Component
 * 
 * CSS 3D transforms for a rotating graph showing workflow complexity.
 * Nodes glow when "active" and the graph rotates slowly.
 */

import { ref, onMounted, onUnmounted, computed } from 'vue'

interface GraphNode {
  id: string
  label: string
  icon: string
  color: string
  x: number
  y: number
  z: number
  active?: boolean
}

interface GraphEdge {
  from: string
  to: string
}

const containerRef = ref<HTMLElement | null>(null)
const rotationY = ref(0)
const rotationX = ref(-15)
const isHovered = ref(false)
let animationFrame: number

// 3D Graph nodes
const nodes = ref<GraphNode[]>([
  // Front layer
  { id: 'trigger', label: 'Trigger', icon: 'webhook', color: '#f59e0b', x: 0, y: 0, z: 80 },
  { id: 'validate', label: 'Validate', icon: 'fact_check', color: '#00d4aa', x: -60, y: -40, z: 40 },
  { id: 'ai', label: 'AI Agent', icon: 'psychology', color: '#6366f1', x: 60, y: -40, z: 40 },
  
  // Middle layer
  { id: 'router', label: 'Router', icon: 'call_split', color: '#8b5cf6', x: 0, y: -80, z: 0 },
  { id: 'transform', label: 'Transform', icon: 'transform', color: '#00d4aa', x: -80, y: 0, z: 0 },
  { id: 'enrich', label: 'Enrich', icon: 'auto_fix_high', color: '#3b82f6', x: 80, y: 0, z: 0 },
  
  // Back layer
  { id: 'slack', label: 'Slack', icon: 'chat', color: '#e91e8f', x: -60, y: 40, z: -40 },
  { id: 'email', label: 'Email', icon: 'email', color: '#ef4444', x: 60, y: 40, z: -40 },
  { id: 'db', label: 'Database', icon: 'storage', color: '#10b981', x: 0, y: 80, z: -80 },
])

const edges: GraphEdge[] = [
  { from: 'trigger', to: 'validate' },
  { from: 'trigger', to: 'ai' },
  { from: 'validate', to: 'router' },
  { from: 'ai', to: 'router' },
  { from: 'router', to: 'transform' },
  { from: 'router', to: 'enrich' },
  { from: 'transform', to: 'slack' },
  { from: 'enrich', to: 'email' },
  { from: 'slack', to: 'db' },
  { from: 'email', to: 'db' },
]

// Active node cycling
const activeNodeIndex = ref(0)
let activeInterval: ReturnType<typeof setInterval>

function cycleActiveNode() {
  nodes.value = nodes.value.map((node, index) => ({
    ...node,
    active: index === activeNodeIndex.value
  }))
  activeNodeIndex.value = (activeNodeIndex.value + 1) % nodes.value.length
}

// Auto-rotate animation
function animate() {
  if (!isHovered.value) {
    rotationY.value += 0.3
  }
  animationFrame = requestAnimationFrame(animate)
}

// Transform style for 3D scene
const sceneStyle = computed(() => ({
  transform: `rotateX(${rotationX.value}deg) rotateY(${rotationY.value}deg)`
}))

// Get node style with 3D position
function getNodeStyle(node: GraphNode) {
  return {
    transform: `translate3d(${node.x}px, ${node.y}px, ${node.z}px)`,
    '--node-color': node.color
  }
}

// Get edge path (simplified 2D projection)
function getEdgePath(edge: GraphEdge) {
  const from = nodes.value.find(n => n.id === edge.from)
  const to = nodes.value.find(n => n.id === edge.to)
  if (!from || !to) return ''
  
  // Simple line for 3D effect (actual 3D lines would need WebGL)
  return `M ${from.x + 150} ${from.y + 150} L ${to.x + 150} ${to.y + 150}`
}

function handleMouseEnter() {
  isHovered.value = true
}

function handleMouseLeave() {
  isHovered.value = false
}

onMounted(() => {
  animate()
  activeInterval = setInterval(cycleActiveNode, 1500)
  cycleActiveNode()
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  if (activeInterval) {
    clearInterval(activeInterval)
  }
})
</script>

<template>
  <div 
    ref="containerRef"
    class="three-d-graph"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Background effects -->
    <div class="graph-bg">
      <div class="bg-glow" />
      <div class="bg-grid" />
    </div>

    <!-- 3D Scene container -->
    <div class="scene-container">
      <div
        class="scene"
        :style="sceneStyle"
      >
        <!-- Edge lines (simplified) -->
        <svg
          class="edges-svg"
          viewBox="0 0 300 300"
        >
          <defs>
            <linearGradient
              id="edge3dGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop
                offset="0%"
                stop-color="#6366f1"
                stop-opacity="0.1"
              />
              <stop
                offset="50%"
                stop-color="#00d4aa"
                stop-opacity="0.4"
              />
              <stop
                offset="100%"
                stop-color="#6366f1"
                stop-opacity="0.1"
              />
            </linearGradient>
          </defs>
          <path
            v-for="(edge, index) in edges"
            :key="`edge-${index}`"
            :d="getEdgePath(edge)"
            fill="none"
            stroke="url(#edge3dGrad)"
            stroke-width="1"
            stroke-dasharray="4 3"
            class="edge-3d"
          />
        </svg>

        <!-- 3D Nodes -->
        <div
          v-for="node in nodes"
          :key="node.id"
          class="graph-node"
          :class="{ active: node.active }"
          :style="getNodeStyle(node)"
        >
          <div class="node-glow" />
          <div class="node-body">
            <q-icon
              :name="node.icon"
              size="20px"
            />
          </div>
          <span class="node-label">{{ node.label }}</span>
        </div>
      </div>
    </div>

    <!-- Info overlay -->
    <div class="graph-info">
      <div class="info-badge">
        <span class="badge-hex">⬡</span>
        <span>LangGraph DAG</span>
      </div>
      <p>Complex workflows, simple visualization</p>
    </div>

    <!-- Stats -->
    <div class="graph-stats">
      <div class="stat">
        <span class="stat-value">{{ nodes.length }}</span>
        <span class="stat-label">Nodes</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ edges.length }}</span>
        <span class="stat-label">Edges</span>
      </div>
      <div class="stat">
        <span class="stat-value">3</span>
        <span class="stat-label">Layers</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.three-d-graph {
  position: relative;
  width: 100%;
  max-width: 500px;
  aspect-ratio: 1;
  margin: 0 auto;
  perspective: 1000px;
}

// Background
.graph-bg {
  position: absolute;
  inset: 0;
  border-radius: 24px;
  overflow: hidden;
}

.bg-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  height: 300px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
  animation: glow-pulse 4s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 30px 30px;
}

// Scene
.scene-container {
  position: absolute;
  inset: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene {
  position: relative;
  width: 300px;
  height: 300px;
  transform-style: preserve-3d;
  transition: transform 0.1s linear;
}

// Edges SVG
.edges-svg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.edge-3d {
  animation: edge-dash 4s linear infinite;
}

@keyframes edge-dash {
  to { stroke-dashoffset: -28; }
}

// Nodes
.graph-node {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 48px;
  height: 48px;
  margin-left: -24px;
  margin-top: -24px;
  transform-style: preserve-3d;
  transition: transform 0.3s ease;

  &:hover {
    .node-body {
      transform: scale(1.2);
    }

    .node-glow {
      opacity: 0.5;
    }
  }

  &.active {
    .node-body {
      transform: scale(1.15);
      box-shadow: 0 0 30px var(--node-color);
    }

    .node-glow {
      opacity: 0.6;
      animation: active-glow 1s ease-in-out infinite;
    }

    .node-label {
      opacity: 1;
      color: var(--node-color);
    }
  }
}

@keyframes active-glow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.2); }
}

.node-glow {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--node-color) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.node-body {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(15, 15, 35, 0.95);
  border: 2px solid var(--node-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--node-color);
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backface-visibility: hidden;
}

.node-label {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  transition: all 0.3s ease;
  backface-visibility: hidden;
}

// Info overlay
.graph-info {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #a5b4fc;
  margin-bottom: 8px;

  .badge-hex {
    font-size: 0.85rem;
    color: #6366f1;
    animation: rotate-badge 10s linear infinite;
  }
}

@keyframes rotate-badge {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.graph-info p {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

// Stats
.graph-stats {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 24px;
  padding: 12px 24px;
  background: rgba(15, 15, 35, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: #6366f1;
  font-family: 'JetBrains Mono', monospace;
}

.stat-label {
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

// Light mode
:global(.body--light) {
  .bg-glow {
    background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
  }

  .node-body {
    background: rgba(255, 255, 255, 0.95);
  }

  .node-label {
    color: #64748b;
  }

  .info-badge {
    background: rgba(99, 102, 241, 0.1);
    color: #4f46e5;
  }

  .graph-info p {
    color: #64748b;
  }

  .graph-stats {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .stat-label {
    color: #64748b;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .bg-glow,
  .edge-3d,
  .graph-node.active .node-glow,
  .info-badge .badge-hex {
    animation: none;
  }

  .scene {
    transition: none;
  }
}
</style>


