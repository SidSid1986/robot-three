<template>
  <div class="three-container">
    <h3>🎯 Three.js：左键拖小球 + 轨迹，右上角按钮控制相机移动（前后左右）</h3>

    <!-- 右上角：4个方向控制按钮 -->
    <div class="controls">
      <button @click="moveCamera('forward')" class="control-btn">↑ 前进</button>
      <button @click="moveCamera('backward')" class="control-btn">↓ 后退</button>
      <button @click="moveCamera('left')" class="control-btn">← 向左</button>
      <button @click="moveCamera('right')" class="control-btn">→ 向右</button>
    </div>

    <div ref="mountRef" class="three-canvas"></div>

    <!-- X Y Z 轴文字标签 -->
    <div id="label-x" class="axis-label" style="color: #ff4444; font-weight: bold; font-size: 24px;">X</div>
    <div id="label-y" class="axis-label" style="color: #44ff44; font-weight: bold; font-size: 24px;">Y</div>
    <div id="label-z" class="axis-label" style="color: #4444ff; font-weight: bold; font-size: 24px;">Z</div>

    <div class="info">
      <p>
        <strong>当前小球坐标:</strong><br />
        X: {{ currentPos.x.toFixed(2) }}, Y: {{ currentPos.y.toFixed(2) }}, Z: {{ currentPos.z.toFixed(2) }}
      </p>
      <p><strong>轨迹点数:</strong> {{ trajectory.length }}</p>
      <button @click="clearTrajectory">清除轨迹</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

// Refs
const mountRef = ref(null)
const currentPos = ref({ x: 0, y: 0, z: 0 })
const trajectory = ref([])

// DOM 文字标签
const labelX = document.getElementById('label-x')
const labelY = document.getElementById('label-y')
const labelZ = document.getElementById('label-z')

// Three
let scene, camera, renderer, sphere, grid
let raycaster, mouse
let isDraggingSphere = false
let sphereOffset = new THREE.Vector3()
let trajectoryLine = null

// ======================
// 初始化
// ======================
function initThreeJS() {
  const container = mountRef.value
  if (!container) return

  // 1. Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  // 2. Camera
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  )
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  // 4. Lights
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(10, 10, 5)
  scene.add(dirLight)

  // 5. 网格
  const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222)
  gridHelper.position.y = -0.01
  scene.add(gridHelper)
  grid = gridHelper

  // 6. 球体（可拖动）
  const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32)
  const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xff4444 })
  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
  sphere.position.set(0, 0.5, 0)
  scene.add(sphere)

  // 7. X/Y/Z 轴（视觉）
  const axisLength = 3
  const xAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0xff0040 })
  )
  const yAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0x40ff40 })
  )
  const zAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength),
    ]),
    new THREE.LineBasicMaterial({ color: 0x4040ff })
  )
  scene.add(xAxis)
  scene.add(yAxis)
  scene.add(zAxis)

  // 8. 鼠标事件：左键拖动小球
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  renderer.domElement.addEventListener('mousedown', onMouseDown)
  renderer.domElement.addEventListener('mousemove', onMouseMove)
  renderer.domElement.addEventListener('mouseup', onMouseUp)

  window.addEventListener('resize', onWindowResize)
}

// ======================
// 拖动小球逻辑
// ======================
function getMousePosition(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
}

function onMouseDown(event) {
  if (event.button !== 0) return // 只处理左键

  getMousePosition(event.clientX, event.clientY)
  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObject(sphere, true)
  if (intersects.length > 0) {
    isDraggingSphere = true
    const intersectPoint = intersects[0].point
    sphereOffset.copy(intersectPoint).sub(sphere.position)
  }
}

function onMouseMove(event) {
  if (!isDraggingSphere) return

  getMousePosition(event.clientX, event.clientY)
  raycaster.setFromCamera(mouse, camera)

  // 拖动时沿水平面移动（y 固定）
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5)
  const target = new THREE.Vector3()
  if (raycaster.ray.intersectPlane(plane, target)) {
    sphere.position.copy(target.sub(sphereOffset))
    currentPos.value = { x: target.x, y: target.y, z: target.z }
    trajectory.value.push({ x: target.x, y: target.y, z: target.z })
    updateTrajectoryLine()
  }
}

function onMouseUp() {
  isDraggingSphere = false
}

// ======================
// 轨迹
// ======================
function updateTrajectoryLine() {
  if (trajectory.value.length < 2) return

  const points = trajectory.value.map(p => new THREE.Vector3(p.x, p.y, p.z))
  const geometry = new THREE.BufferGeometry().setFromPoints(points)

  if (trajectoryLine) {
    scene.remove(trajectoryLine)
  }

  const material = new THREE.LineBasicMaterial({ color: 0x00aaff })
  trajectoryLine = new THREE.Line(geometry, material)
  scene.add(trajectoryLine)
}

function clearTrajectory() {
  trajectory.value = []
  if (trajectoryLine) {
    scene.remove(trajectoryLine)
    trajectoryLine = null
  }
}

// ======================
// 相机移动控制（按钮驱动）
// ======================
function moveCamera(direction) {
  const distance = 0.5
  const directionVec = new THREE.Vector3()

  if (direction === 'forward') directionVec.set(0, 0, -distance)
  else if (direction === 'backward') directionVec.set(0, 0, distance)
  else if (direction === 'left') directionVec.set(-distance, 0, 0)
  else if (direction === 'right') directionVec.set(distance, 0, 0)

  // 沿相机自身方向旋转该向量
  directionVec.applyQuaternion(camera.quaternion)
  camera.position.add(directionVec)
}

// ======================
// 响应式
// ======================
function onWindowResize() {
  const container = mountRef.value
  if (!container) return

  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

// ======================
// 生命周期
// ======================
onMounted(() => {
  initThreeJS()
  animate()
})

onUnmounted(() => {
  if (renderer) renderer.dispose()
})
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100vh;
  background: #000;
  color: #fff;
  font-family: Arial, sans-serif;
  position: relative;
  overflow: hidden;
}

.three-canvas {
  width: 100%;
  height: 85%;
  background: #000;
}

.controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 1000;
}

.control-btn {
  padding: 8px 12px;
  background: rgba(0, 100, 200, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.control-btn:hover {
  background: rgba(0, 80, 160, 0.9);
}

.info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
}

button {
  margin-top: 5px;
  padding: 4px 8px;
  background: #555;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

button:hover {
  background: #777;
}

.axis-label {
  position: absolute;
  font-family: Arial, sans-serif;
  font-size: 24px;
  font-weight: bold;
  pointer-events: none;
  z-index: 1000;
  transform: translate(-50%, -50%);
}
</style>