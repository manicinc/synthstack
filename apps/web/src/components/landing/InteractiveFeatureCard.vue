<script setup lang="ts">
/**
 * InteractiveFeatureCard Component
 * 
 * Sleekified feature card with glassmorphism, micro-interactions,
 * and optional mini DAG preview for workflow-related features.
 */

import { ref, computed } from 'vue'

interface FeatureCard {
  id: string
  title: string
  description: string
  icon: string
  color: string
  tags: string[]
  featured?: boolean
  preview?: 'dag' | 'code' | 'chart' | null
  link?: string
  badge?: string
}

const props = defineProps<{
  feature: FeatureCard
  index?: number
}>()

const isHovered = ref(false)
const cardRef = ref<HTMLElement | null>(null)
const mouseX = ref(0.5)
const mouseY = ref(0.5)

// 3D transform based on mouse position
const cardTransform = computed(() => {
  if (!isHovered.value) return {}
  
  const rotateX = (mouseY.value - 0.5) * -10
  const rotateY = (mouseX.value - 0.5) * 10
  
  return {
    transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`
  }
})

// Glow position follows mouse
const glowPosition = computed(() => ({
  '--glow-x': `${mouseX.value * 100}%`,
  '--glow-y': `${mouseY.value * 100}%`
}))

function handleMouseMove(e: MouseEvent) {
  if (!cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  mouseX.value = (e.clientX - rect.left) / rect.width
  mouseY.value = (e.clientY - rect.top) / rect.height
}

function handleMouseEnter() {
  isHovered.value = true
}

function handleMouseLeave() {
  isHovered.value = false
  mouseX.value = 0.5
  mouseY.value = 0.5
}

// Icon color variations
const iconStyle = computed(() => ({
  '--icon-color': props.feature.color,
  '--icon-bg': `${props.feature.color}15`,
  '--icon-glow': `${props.feature.color}40`
}))

// Animation delay based on index
const animationDelay = computed(() => ({
  animationDelay: `${(props.index || 0) * 100}ms`
}))
</script>

<template>
  <article
    ref="cardRef"
    class="interactive-feature-card"
    :class="{ 
      'is-hovered': isHovered, 
      'is-featured': feature.featured 
    }"
    :style="[cardTransform, glowPosition, animationDelay]"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousemove="handleMouseMove"
  >
    <!-- Glassmorphism background layers -->
    <div class="card-glass-bg" />
    <div class="card-glow-layer" />
    <div class="card-border-glow" />

    <!-- Featured badge -->
    <div
      v-if="feature.badge || feature.featured"
      class="card-badge"
    >
      {{ feature.badge || 'NEW' }}
    </div>

    <!-- Content -->
    <div class="card-content">
      <!-- Animated icon -->
      <div
        class="card-icon"
        :style="iconStyle"
      >
        <div class="icon-glow" />
        <div class="icon-ring" />
        <q-icon
          :name="feature.icon"
          size="28px"
        />
      </div>

      <!-- Title -->
      <h3 class="card-title">
        {{ feature.title }}
      </h3>

      <!-- Description -->
      <p class="card-description">
        {{ feature.description }}
      </p>

      <!-- Mini DAG preview for workflow cards -->
      <div
        v-if="feature.preview === 'dag'"
        class="mini-dag-preview"
      >
        <svg
          viewBox="0 0 120 40"
          class="mini-dag-svg"
        >
          <defs>
            <linearGradient
              id="miniEdgeGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop
                offset="0%"
                :stop-color="feature.color"
                stop-opacity="0.3"
              />
              <stop
                offset="50%"
                stop-color="#00d4aa"
                stop-opacity="0.8"
              />
              <stop
                offset="100%"
                :stop-color="feature.color"
                stop-opacity="0.3"
              />
            </linearGradient>
          </defs>
          
          <!-- Edges -->
          <path
            d="M 15 20 Q 35 10, 50 20"
            fill="none"
            stroke="url(#miniEdgeGrad)"
            stroke-width="1.5"
            class="mini-edge"
          />
          <path
            d="M 15 20 Q 35 30, 50 20"
            fill="none"
            stroke="url(#miniEdgeGrad)"
            stroke-width="1.5"
            class="mini-edge"
            style="animation-delay: 0.2s"
          />
          <path
            d="M 50 20 L 75 20"
            fill="none"
            stroke="url(#miniEdgeGrad)"
            stroke-width="1.5"
            class="mini-edge"
            style="animation-delay: 0.4s"
          />
          <path
            d="M 75 20 Q 95 10, 105 20"
            fill="none"
            stroke="url(#miniEdgeGrad)"
            stroke-width="1.5"
            class="mini-edge"
            style="animation-delay: 0.6s"
          />
          <path
            d="M 75 20 Q 95 30, 105 20"
            fill="none"
            stroke="url(#miniEdgeGrad)"
            stroke-width="1.5"
            class="mini-edge"
            style="animation-delay: 0.8s"
          />
          
          <!-- Nodes -->
          <circle
            cx="15"
            cy="20"
            r="5"
            fill="#f59e0b"
            class="mini-node"
          />
          <circle
            cx="50"
            cy="20"
            r="5"
            fill="#0d9488"
            class="mini-node"
            style="animation-delay: 0.2s"
          />
          <circle
            cx="75"
            cy="20"
            r="5"
            fill="#00d4aa"
            class="mini-node"
            style="animation-delay: 0.4s"
          />
          <circle
            cx="105"
            cy="20"
            r="5"
            fill="#10b981"
            class="mini-node"
            style="animation-delay: 0.6s"
          />
          
          <!-- Animated particles -->
          <circle
            r="2"
            fill="#00d4aa"
            class="mini-particle"
          >
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path="M 15 20 Q 35 10, 50 20 L 75 20 Q 95 10, 105 20"
            />
          </circle>
          <circle
            r="2"
            fill="#00d4aa"
            class="mini-particle"
            style="animation-delay: 1s"
          >
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path="M 15 20 Q 35 30, 50 20 L 75 20 Q 95 30, 105 20"
              begin="1s"
            />
          </circle>
        </svg>
        <span class="dag-label">LangGraph DAG</span>
      </div>

      <!-- Tags -->
      <div class="card-tags">
        <span 
          v-for="tag in feature.tags" 
          :key="tag" 
          class="tag"
          :class="{ 'tag-tech': ['LangGraph', 'DAG', 'RAG', 'AI'].includes(tag) }"
        >
          {{ tag }}
        </span>
      </div>

      <!-- Link arrow -->
      <div
        v-if="feature.link"
        class="card-link"
      >
        <span>Learn more</span>
        <q-icon
          name="arrow_forward"
          size="16px"
        />
      </div>
    </div>

    <!-- Hover particles -->
    <div class="hover-particles">
      <div
        v-for="i in 6"
        :key="i"
        class="particle"
        :style="{ '--i': i }"
      />
    </div>
  </article>
</template>

<style lang="scss" scoped>
.interactive-feature-card {
  position: relative;
  border-radius: 24px;
  padding: 28px;
  background: transparent;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
  animation: card-reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards;

  &:hover {
    z-index: 10;
    transform: translateY(-8px) scale(1.02);
  }
}

@keyframes card-reveal {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Premium Neumorphic Glassmorphism background
.card-glass-bg {
  position: absolute;
  inset: 0;
  border-radius: 24px;
  // Premium dark gradient with depth
  background: linear-gradient(
    145deg,
    rgba(28, 34, 56, 0.95) 0%,
    rgba(18, 24, 44, 0.98) 50%,
    rgba(12, 18, 36, 0.95) 100%
  );
  backdrop-filter: blur(24px);
  // Glossy border with highlight
  border: 1px solid rgba(255, 255, 255, 0.1);
  // Neumorphic shadow system
  box-shadow:
    // Outer shadow (depth)
    0 8px 32px rgba(0, 0, 0, 0.35),
    0 4px 16px rgba(0, 0, 0, 0.25),
    // Glossy inner highlight
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.15);
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: -2;
  overflow: hidden;

  // Top accent gradient line
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(13, 148, 136, 0.5) 20%,
      rgba(0, 212, 170, 0.6) 50%,
      rgba(13, 148, 136, 0.5) 80%,
      transparent 100%
    );
    opacity: 0.5;
    transition: opacity 0.4s ease;
  }

  .is-hovered & {
    background: linear-gradient(
      145deg,
      rgba(35, 42, 68, 0.98) 0%,
      rgba(24, 32, 56, 0.98) 50%,
      rgba(18, 26, 48, 0.98) 100%
    );
    border-color: rgba(13, 148, 136, 0.35);
    box-shadow:
      // Elevated outer shadow
      0 24px 64px rgba(0, 0, 0, 0.45),
      0 12px 32px rgba(13, 148, 136, 0.12),
      // Teal glow aura
      0 0 48px rgba(13, 148, 136, 0.1),
      // Enhanced inner highlight
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);

    &::after {
      opacity: 1;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(13, 148, 136, 0.9) 20%,
        rgba(0, 212, 170, 1) 50%,
        rgba(13, 148, 136, 0.9) 80%,
        transparent 100%
      );
    }
  }

  .is-featured & {
    background: linear-gradient(
      145deg,
      rgba(13, 65, 60, 0.5) 0%,
      rgba(12, 50, 50, 0.6) 50%,
      rgba(10, 40, 42, 0.5) 100%
    );
    border: 1px solid rgba(13, 148, 136, 0.45);
    box-shadow:
      0 12px 48px rgba(0, 0, 0, 0.4),
      0 0 64px rgba(13, 148, 136, 0.18),
      inset 0 1px 0 rgba(13, 148, 136, 0.25),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);

    &::after {
      opacity: 1;
      height: 2px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        #0d9488 20%,
        #00d4aa 50%,
        #0d9488 80%,
        transparent 100%
      );
    }
  }
}

// Glow layer that follows mouse
.card-glow-layer {
  position: absolute;
  inset: 0;
  border-radius: 24px;
  background: radial-gradient(
    450px circle at var(--glow-x, 50%) var(--glow-y, 50%),
    rgba(13, 148, 136, 0.2) 0%,
    rgba(0, 212, 170, 0.1) 30%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: -1;
  pointer-events: none;

  .is-hovered & {
    opacity: 1;
  }
}

// Animated rotating border glow
.card-border-glow {
  position: absolute;
  inset: -2px;
  border-radius: 26px;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    rgba(13, 148, 136, 0.5) 10%,
    transparent 20%,
    transparent 50%,
    rgba(0, 212, 170, 0.5) 60%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: -3;
  animation: rotate-border 6s linear infinite paused;

  .is-hovered & {
    opacity: 0.7;
    animation-play-state: running;
  }

  .is-featured & {
    background: conic-gradient(
      from 0deg,
      #0d9488 0%,
      #00d4aa 25%,
      #14b8a6 50%,
      #00d4aa 75%,
      #0d9488 100%
    );
    opacity: 0.5;
    animation-play-state: running;
  }
}

@keyframes rotate-border {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Badge
.card-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 6px;
  text-transform: uppercase;
  z-index: 5;
}

// Content
.card-content {
  position: relative;
  z-index: 1;
}

// Icon
.card-icon {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: var(--icon-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  transition: all 0.4s ease;

  .q-icon {
    color: var(--icon-color);
    transition: transform 0.4s ease;
  }

  .is-hovered & {
    transform: scale(1.1) translateY(-4px);

    .q-icon {
      transform: scale(1.1);
    }
  }
}

.icon-glow {
  position: absolute;
  inset: -10px;
  border-radius: 24px;
  background: radial-gradient(circle, var(--icon-glow) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease;

  .is-hovered & {
    opacity: 1;
    animation: pulse-icon-glow 2s ease-in-out infinite;
  }
}

@keyframes pulse-icon-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

.icon-ring {
  position: absolute;
  inset: -4px;
  border-radius: 20px;
  border: 2px solid var(--icon-color);
  opacity: 0;
  transition: all 0.4s ease;

  .is-hovered & {
    opacity: 0.3;
    animation: spin-ring 8s linear infinite;
  }
}

@keyframes spin-ring {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Title
.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 10px;
  transition: color 0.3s ease;

  .is-hovered & {
    color: #5eead4;
  }
}

// Description
.card-description {
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 16px;
  transition: color 0.3s ease;

  .is-hovered & {
    color: rgba(255, 255, 255, 0.8);
  }
}

// Mini DAG preview
.mini-dag-preview {
  position: relative;
  margin: 16px 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(13, 148, 136, 0.2);
  overflow: hidden;
}

.mini-dag-svg {
  width: 100%;
  height: 40px;
}

.mini-edge {
  stroke-dasharray: 4 2;
  animation: dash-mini 2s linear infinite;
}

@keyframes dash-mini {
  to { stroke-dashoffset: -12; }
}

.mini-node {
  animation: pulse-mini-node 1.5s ease-in-out infinite;
}

@keyframes pulse-mini-node {
  0%, 100% { r: 4; opacity: 0.8; }
  50% { r: 5; opacity: 1; }
}

.mini-particle {
  opacity: 0.8;
  filter: drop-shadow(0 0 3px #00d4aa);
}

.dag-label {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-size: 0.6rem;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(13, 148, 136, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

// Tags
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.tag {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;

  .is-hovered & {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &.tag-tech {
    background: linear-gradient(135deg, rgba(13, 148, 136, 0.2) 0%, rgba(20, 184, 166, 0.2) 100%);
    border-color: rgba(13, 148, 136, 0.3);
    color: #5eead4;
    font-family: 'JetBrains Mono', monospace;
  }
}

// Link
.card-link {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #0d9488;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;

  .is-hovered & {
    opacity: 1;
    transform: translateX(0);
  }

  .q-icon {
    transition: transform 0.3s ease;
  }

  &:hover .q-icon {
    transform: translateX(4px);
  }
}

// Hover particles
.hover-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: 20px;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #0d9488;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s ease;

  .is-hovered & {
    opacity: 0.6;
    animation: float-particle 3s ease-in-out infinite;
    animation-delay: calc(var(--i) * 0.5s);
  }

  &:nth-child(1) { top: 20%; left: 10%; }
  &:nth-child(2) { top: 60%; left: 85%; }
  &:nth-child(3) { top: 80%; left: 30%; }
  &:nth-child(4) { top: 30%; left: 70%; }
  &:nth-child(5) { top: 50%; left: 50%; }
  &:nth-child(6) { top: 10%; left: 60%; }
}

@keyframes float-particle {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(10px, -15px) scale(1.5); }
}

// Light mode - Premium neumorphic styling
:global(.body--light) {
  .interactive-feature-card {
    // Light mode neumorphic shadow system
    &::before {
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.9) 0%,
        rgba(241, 245, 249, 0.6) 100%
      );
    }
  }

  .card-glass-bg {
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.98) 0%,
      rgba(248, 250, 252, 0.95) 50%,
      rgba(241, 245, 249, 0.92) 100%
    );
    border-color: rgba(0, 0, 0, 0.06);
    // Premium neumorphic light mode shadows
    box-shadow:
      8px 8px 24px rgba(0, 0, 0, 0.08),
      -4px -4px 16px rgba(255, 255, 255, 0.9),
      inset 0 1px 0 rgba(255, 255, 255, 1),
      inset 0 -1px 0 rgba(0, 0, 0, 0.03);

    .is-hovered & {
      background: linear-gradient(
        145deg,
        rgba(255, 255, 255, 1) 0%,
        rgba(250, 252, 255, 0.98) 50%,
        rgba(245, 248, 252, 0.95) 100%
      );
      border-color: rgba(13, 148, 136, 0.2);
      box-shadow:
        12px 12px 32px rgba(0, 0, 0, 0.1),
        -6px -6px 24px rgba(255, 255, 255, 1),
        0 8px 32px rgba(13, 148, 136, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 1),
        inset 0 -1px 0 rgba(0, 0, 0, 0.02);
    }
  }

  .card-border-glow {
    background: conic-gradient(
      from 0deg,
      transparent 0%,
      rgba(13, 148, 136, 0.35) 10%,
      transparent 20%,
      transparent 50%,
      rgba(6, 182, 212, 0.35) 60%,
      transparent 70%
    );
    opacity: 0;

    .is-hovered & {
      opacity: 1;
    }
  }

  .card-top-accent {
    background: linear-gradient(
      90deg,
      rgba(13, 148, 136, 0.6) 0%,
      rgba(6, 182, 212, 0.4) 50%,
      rgba(13, 148, 136, 0.6) 100%
    );
    opacity: 0.7;

    .is-hovered & {
      opacity: 1;
      background: linear-gradient(
        90deg,
        rgba(13, 148, 136, 0.9) 0%,
        rgba(6, 182, 212, 0.7) 50%,
        rgba(13, 148, 136, 0.9) 100%
      );
    }
  }

  .card-glow-layer {
    background: radial-gradient(
      300px circle at var(--glow-x, 50%) var(--glow-y, 50%),
      rgba(13, 148, 136, 0.08) 0%,
      transparent 60%
    );

    .is-hovered & {
      background: radial-gradient(
        350px circle at var(--glow-x, 50%) var(--glow-y, 50%),
        rgba(13, 148, 136, 0.15) 0%,
        transparent 60%
      );
    }
  }

  .card-icon-wrapper {
    background: linear-gradient(
      145deg,
      rgba(248, 250, 252, 1) 0%,
      rgba(241, 245, 249, 0.95) 100%
    );
    box-shadow:
      4px 4px 12px rgba(0, 0, 0, 0.06),
      -2px -2px 8px rgba(255, 255, 255, 0.9),
      inset 0 1px 0 rgba(255, 255, 255, 1);

    .is-hovered & {
      background: linear-gradient(
        145deg,
        rgba(13, 148, 136, 0.1) 0%,
        rgba(6, 182, 212, 0.08) 100%
      );
      box-shadow:
        4px 4px 16px rgba(13, 148, 136, 0.15),
        -2px -2px 8px rgba(255, 255, 255, 1),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
    }
  }

  .icon-glow {
    background: radial-gradient(
      circle,
      rgba(13, 148, 136, 0.2) 0%,
      transparent 70%
    );
  }

  .card-title {
    color: #1e293b;

    .is-hovered & {
      color: #0d9488;
      text-shadow: 0 0 20px rgba(13, 148, 136, 0.2);
    }
  }

  .card-description {
    color: #475569;

    .is-hovered & {
      color: #334155;
    }
  }

  .tag {
    background: linear-gradient(
      145deg,
      rgba(241, 245, 249, 0.9) 0%,
      rgba(226, 232, 240, 0.8) 100%
    );
    border-color: rgba(0, 0, 0, 0.08);
    color: #475569;
    box-shadow:
      2px 2px 6px rgba(0, 0, 0, 0.04),
      -1px -1px 4px rgba(255, 255, 255, 0.8);

    &.tag-tech {
      background: linear-gradient(
        145deg,
        rgba(13, 148, 136, 0.12) 0%,
        rgba(6, 182, 212, 0.08) 100%
      );
      border-color: rgba(13, 148, 136, 0.2);
      color: #0d9488;
    }
  }

  .mini-dag-preview {
    background: linear-gradient(
      145deg,
      rgba(248, 250, 252, 0.9) 0%,
      rgba(241, 245, 249, 0.8) 100%
    );
    border-color: rgba(13, 148, 136, 0.15);
    box-shadow:
      inset 2px 2px 6px rgba(0, 0, 0, 0.03),
      inset -1px -1px 4px rgba(255, 255, 255, 0.5);
  }

  .dag-label {
    color: #0d9488;
  }

  .particle {
    background: #0d9488;
  }

  .card-link {
    color: #0d9488;

    &:hover {
      text-shadow: 0 0 12px rgba(13, 148, 136, 0.3);
    }
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .interactive-feature-card {
    animation: none;
    transition: none;
  }

  .icon-glow,
  .icon-ring,
  .mini-edge,
  .mini-node,
  .particle {
    animation: none !important;
  }
}
</style>
