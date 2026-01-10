<template>
  <div
    ref="container"
    class="stl-viewer-container relative-position"
  >
    <div
      v-if="loading"
      class="absolute-center column flex-center z-top"
    >
      <q-spinner
        color="primary"
        size="3em"
      />
      <div class="text-caption q-mt-sm text-white">
        Loading Model...
      </div>
    </div>
    <div
      v-if="error"
      class="absolute-center text-negative z-top"
    >
      {{ error }}
    </div>
    <canvas ref="canvas" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, shallowRef } from 'vue'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

const props = defineProps<{
  file?: File | null
  url?: string
  color?: string
  autoRotate?: boolean
}>()

const container = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Three.js instances
// Use shallowRef for Three.js objects to avoid Vue reactivity overhead
const scene = shallowRef<THREE.Scene | null>(null)
const camera = shallowRef<THREE.PerspectiveCamera | null>(null)
const renderer = shallowRef<THREE.WebGLRenderer | null>(null)
const controls = shallowRef<OrbitControls | null>(null)
const mesh = shallowRef<THREE.Mesh | null>(null)

let animationId: number | null = null

// Initialize Three.js scene
const initScene = () => {
  if (!container.value || !canvas.value) return

  // Scene
  const s = new THREE.Scene()
  s.background = new THREE.Color(0x111111)
  // Add some fog for depth
  s.fog = new THREE.Fog(0x111111, 200, 1000)
  scene.value = s

  // Camera
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  const cam = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
  cam.position.set(150, 150, 150)
  camera.value = cam

  // Renderer
  const r = new THREE.WebGLRenderer({ 
    canvas: canvas.value, 
    antialias: true,
    alpha: true 
  })
  r.setSize(width, height)
  r.setPixelRatio(window.devicePixelRatio)
  r.shadowMap.enabled = true
  renderer.value = r

  // Controls
  const c = new OrbitControls(cam, canvas.value)
  c.enableDamping = true
  c.dampingFactor = 0.05
  c.screenSpacePanning = false
  c.minDistance = 10
  c.maxDistance = 500
  c.maxPolarAngle = Math.PI / 2
  controls.value = c

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040) // Soft white light
  s.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(100, 100, 50)
  dirLight.castShadow = true
  s.add(dirLight)

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
  dirLight2.position.set(-100, 50, -50)
  s.add(dirLight2)

  // Grid
  const gridHelper = new THREE.GridHelper(300, 30, 0x444444, 0x222222)
  s.add(gridHelper)
  
  // Axes
  const axesHelper = new THREE.AxesHelper(50)
  s.add(axesHelper)

  animate()
}

// Load STL File
const loadModel = async () => {
  if (!scene.value) return
  
  // Clear previous mesh
  if (mesh.value) {
    scene.value.remove(mesh.value)
    mesh.value.geometry.dispose()
    if (Array.isArray(mesh.value.material)) {
      mesh.value.material.forEach(m => m.dispose())
    } else {
      mesh.value.material.dispose()
    }
    mesh.value = null
  }

  let urlToLoad = props.url
  
  if (props.file) {
    urlToLoad = URL.createObjectURL(props.file)
  }

  if (!urlToLoad) return

  loading.value = true
  error.value = null

  const loader = new STLLoader()

  try {
    const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
      loader.load(
        urlToLoad!,
        (geo) => resolve(geo),
        undefined,
        (err) => reject(err)
      )
    })

    // Center geometry
    geometry.center()
    
    // Calculate bounding box to center camera
    geometry.computeBoundingBox()
    const boundingBox = geometry.boundingBox
    if (boundingBox) {
      const center = new THREE.Vector3()
      boundingBox.getCenter(center)
      const size = new THREE.Vector3()
      boundingBox.getSize(size)
      
      // Auto-scale if too small or too big (optional, but good for visualization)
      // For 3D printing, we usually want 1 unit = 1 mm, so maybe just fit camera
    }

    // Material
    const material = new THREE.MeshStandardMaterial({ 
      color: props.color || 0xff6b35, // Printverse orange
      metalness: 0.2,
      roughness: 0.5,
    })

    const m = new THREE.Mesh(geometry, material)
    m.castShadow = true
    m.receiveShadow = true
    m.rotation.x = -Math.PI / 2 // STL is usually Z-up, Three.js is Y-up, but STLs often come in different orientations. 
    // Usually STLs are exported with Z as up. Three.js Y is up. 
    // Rotating X by -90deg (-PI/2) usually aligns it to the grid which is XZ plane.
    
    // However, geometry.center() centers it around (0,0,0).
    // Let's just add it and let user rotate.
    // Re-adjust rotation: if we assume Z-up from CAD, we want Z to match Y in Three.js or just lay it flat on the grid (XZ plane).
    // Standard is usually: Mesh lies on XZ plane (Y=0).
    
    // Let's just ensure it sits ON the grid.
    const box = new THREE.Box3().setFromObject(m)
    const height = box.max.y - box.min.y
    m.position.y = height / 2 // Sit on top of grid
    
    scene.value.add(m)
    mesh.value = m

    // Adjust camera to fit object
    fitCameraToSelection(camera.value!, controls.value!, [m])

  } catch (e) {
    logError('Error loading STL:', e)
    error.value = 'Failed to load model'
  } finally {
    loading.value = false
    if (props.file && urlToLoad) {
      URL.revokeObjectURL(urlToLoad)
    }
  }
}

const fitCameraToSelection = (camera: THREE.PerspectiveCamera, controls: OrbitControls, selection: THREE.Object3D[], fitOffset = 1.5) => {
  const box = new THREE.Box3()
  
  for(const object of selection) box.expandByObject(object)
  
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  
  const maxSize = Math.max(size.x, size.y, size.z)
  const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360))
  const fitWidthDistance = fitHeightDistance / camera.aspect
  const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance)
  
  const direction = controls.target.clone().sub(camera.position).normalize().multiplyScalar(distance)

  controls.maxDistance = distance * 10
  controls.target.copy(center)
  
  camera.near = distance / 100
  camera.far = distance * 100
  camera.updateProjectionMatrix()

  camera.position.copy(controls.target).sub(direction)
  
  controls.update()
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  if (controls.value) controls.value.update()
  
  if (renderer.value && scene.value && camera.value) {
    renderer.value.render(scene.value, camera.value)
  }
}

const handleResize = () => {
  if (!container.value || !camera.value || !renderer.value) return
  
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  
  camera.value.aspect = width / height
  camera.value.updateProjectionMatrix()
  
  renderer.value.setSize(width, height)
}

watch(() => props.file, loadModel)
watch(() => props.url, loadModel)

onMounted(() => {
  initScene()
  loadModel()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
  
  // Dispose Three.js resources
  if (mesh.value) {
    mesh.value.geometry.dispose()
    if (Array.isArray(mesh.value.material)) {
      mesh.value.material.forEach(m => m.dispose())
    } else {
      mesh.value.material.dispose()
    }
  }
  renderer.value?.dispose()
})

</script>

<style scoped>
.stl-viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
}

.z-top {
  z-index: 10;
}
</style>





