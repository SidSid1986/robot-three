<template>
  <div class="container">
    <!-- 控制面板 -->
    <div class="controls">
      <div class="mode-controls">
        <button 
          @click="setTransformMode('translate')" 
          :class="{ active: transformMode === 'translate' }"
        >
          平移模式
        </button>
      </div>
      
      <div class="trajectory-controls">
        <button 
          @click="startRecord" 
          :disabled="isRecording || isPlaying"
        >
          开始记录
        </button>
        <button 
          @click="stopRecord" 
          :disabled="!isRecording || isPlaying"
        >
          停止记录
        </button>
        <button 
          @click="playRecord" 
          :disabled="!trajectoryPoints.length || isRecording || isPlaying"
        >
          回放轨迹
        </button>
        <button 
          @click="clearRecord" 
          :disabled="!trajectoryPoints.length || isRecording || isPlaying"
        >
          清除轨迹
        </button>
      </div>
      
      <div class="info">
        坐标: X: {{ x.toFixed(2) }}, Y: {{ y.toFixed(2) }}, Z: {{ z.toFixed(2) }}<br>
        状态: {{ statusText }}<br>
        操作提示: 左键拖拽轴/平面移动小球 | 右键旋转视角 | 滚轮缩放
      </div>
    </div>

    <!-- Three.js 渲染容器 -->
    <div ref="canvasContainer" class="canvas-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// 响应式状态
const state = reactive({
  isRecording: false,
  isPlaying: false,
  trajectoryPoints: [],
  x: 0,
  y: 0,
  z: 0,
  transformMode: 'translate'
});

// 计算属性
const isRecording = computed(() => state.isRecording);
const isPlaying = computed(() => state.isPlaying);
const trajectoryPoints = computed(() => state.trajectoryPoints);
const x = computed(() => state.x);
const y = computed(() => state.y);
const z = computed(() => state.z);
const transformMode = computed(() => state.transformMode);

const statusText = computed(() => {
  if (state.isRecording) return '正在记录...';
  if (state.isPlaying) return '正在回放...';
  return '就绪';
});

// DOM 引用
const canvasContainer = ref(null);

// Three.js 核心对象
let scene, camera, renderer, labelRenderer, orbitControls, transformControls, sphere, trajectoryLine;
let transformHelper = null;
let playInterval = null;

// 初始化Three.js场景
function initThree() {
  // 创建场景 - 黑色背景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
    0.1,
    1000
  );
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(
    canvasContainer.value.clientWidth,
    canvasContainer.value.clientHeight
  );
  canvasContainer.value.appendChild(renderer.domElement);

  // 创建标签渲染器
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(
    canvasContainer.value.clientWidth,
    canvasContainer.value.clientHeight
  );
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  canvasContainer.value.appendChild(labelRenderer.domElement);

  // 添加坐标轴和网格
  createColoredAxes();
  const gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x222222);
  scene.add(gridHelper);

  // 创建球体
  const sphereGeometry = new THREE.SphereGeometry(0.3);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: false
  });
  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 0, 0);
  scene.add(sphere);

  // 初始化控制器（分离事件）
  initOrbitControls();  // 轨道控制器（右键旋转）
  initTransformControls();  // 变换控制器（左键拖拽）

  // 绑定事件
  bindEvents();

  // 启动渲染循环
  animate();
}

// 创建带文字标签的彩色坐标轴
function createColoredAxes() {
  const axisLength = 6;
  
  // X轴（红色）
  const xAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]),
    new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 })
  );
  scene.add(xAxis);

  // Y轴（绿色）
  const yAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]),
    new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 })
  );
  scene.add(yAxis);

  // Z轴（蓝色）
  const zAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength)
    ]),
    new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 })
  );
  scene.add(zAxis);

  // 添加标签
  function createAxisLabel(name, color, position) {
    const div = document.createElement('div');
    div.className = 'axis-label';
    div.textContent = name;
    div.style.color = color;
    div.style.fontFamily = 'Arial, sans-serif';
    div.style.fontSize = '16px';
    
    const label = new CSS2DObject(div);
    label.position.copy(position);
    scene.add(label);
  }

  createAxisLabel('X', '#ff0000', new THREE.Vector3(axisLength + 0.5, 0, 0));
  createAxisLabel('Y', '#00ff00', new THREE.Vector3(0, axisLength + 0.5, 0));
  createAxisLabel('Z', '#0000ff', new THREE.Vector3(0, 0, axisLength + 0.5));
}

// 初始化轨道控制器（仅响应右键和中键）
function initOrbitControls() {
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.screenSpacePanning = false; // 禁用屏幕平移
  
  // 分离鼠标按键 - 仅右键旋转、中键缩放
  orbitControls.mouseButtons = {
    LEFT: THREE.MOUSE.NONE,    // 禁用左键功能
    MIDDLE: THREE.MOUSE.DOLLY, // 中键缩放
    RIGHT: THREE.MOUSE.ROTATE  // 右键旋转
  };
  orbitControls.enablePan = false; // 彻底禁用平移
}

// 初始化变换控制器（仅响应左键）
function initTransformControls() {
  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.mode = 'translate';

  // 获取辅助对象并添加到场景
  transformHelper = transformControls.getHelper();
  if (transformHelper) {
    scene.add(transformHelper);
  }

  // 绑定小球
  transformControls.attach(sphere);

  // 监听位置变化
  transformControls.addEventListener('change', () => {
    state.x = sphere.position.x;
    state.y = sphere.position.y;
    state.z = sphere.position.z;
    renderer.render(scene, camera);
  });

  // 拖拽开始/结束处理
  transformControls.addEventListener('start', () => {
    document.body.style.userSelect = 'none';
  });
  transformControls.addEventListener('end', () => {
    document.body.style.userSelect = '';
  });

  // 确保控制器激活
  transformControls.enabled = true;
}

// 设置变换模式
function setTransformMode(mode) {
  if (state.isPlaying || !transformControls) return;
  transformControls.mode = mode;
  state.transformMode = mode;
}

// 窗口大小调整
function onWindowResize() {
  if (!camera || !renderer) return;
  
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
}

// 绑定事件（修复事件绑定写法）
function bindEvents() {
  window.addEventListener('resize', onWindowResize);
}

// 更新轨迹线
function updateTrajectoryLine() {
  if (trajectoryLine) scene.remove(trajectoryLine);

  if (state.trajectoryPoints.length > 1) {
    const points = state.trajectoryPoints.map(p => 
      new THREE.Vector3(p.x, p.y, p.z)
    );
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 2
    });
    trajectoryLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(trajectoryLine);
  }
}

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  if (orbitControls) orbitControls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
  if (labelRenderer && scene && camera) labelRenderer.render(scene, camera);
}

// 轨迹控制方法（修复可选链赋值问题）
const playRecord = () => {
  if (state.trajectoryPoints.length === 0) return;
  
  state.isPlaying = true;
  // 替换可选链赋值为兼容写法
  if (transformControls) {
    transformControls.enabled = false;
  }
  let index = 0;
  
  playInterval = setInterval(() => {
    if (index >= state.trajectoryPoints.length) {
      clearInterval(playInterval);
      state.isPlaying = false;
      // 替换可选链赋值为兼容写法
      if (transformControls) {
        transformControls.enabled = true;
      }
      return;
    }
    
    const point = state.trajectoryPoints[index];
    sphere.position.set(point.x, point.y, point.z);
    state.x = point.x;
    state.y = point.y;
    state.z = point.z;
    index++;
  }, 50);
};

// 其他轨迹控制方法
const startRecord = () => {
  state.isRecording = true;
  state.trajectoryPoints = [];
  updateTrajectoryLine();
};

const stopRecord = () => {
  state.isRecording = false;
};

const clearRecord = () => {
  state.trajectoryPoints = [];
  updateTrajectoryLine();
};

// 生命周期钩子
onMounted(() => {
  setTimeout(initThree, 100);
});

onUnmounted(() => {
  if (playInterval) clearInterval(playInterval);
  window.removeEventListener('resize', onWindowResize);
  
  renderer?.dispose();
  if (labelRenderer && labelRenderer.domElement.parentElement) {
    labelRenderer.domElement.parentElement.removeChild(labelRenderer.domElement);
  }
  if (transformHelper && scene) scene.remove(transformHelper);
});
</script>

<style scoped>
.container {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.controls {
  position: fixed;
  top: 10px;
  left: 10px;
  background: rgba(30, 30, 30, 0.8);
  padding: 10px;
  border-radius: 5px;
  font-family: Arial, sans-serif;
  z-index: 100;
  color: #fff;
  max-width: 300px;
}

.mode-controls, .trajectory-controls {
  margin-bottom: 8px;
}

button {
  margin: 5px;
  padding: 5px 10px;
  cursor: pointer;
  border: 1px solid #666;
  border-radius: 3px;
  background: #444;
  color: white;
}

button.active {
  background: #0078d7;
  border-color: #005a9e;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info {
  margin-top: 10px;
  font-size: 14px;
  color: #eee;
  line-height: 1.5;
}

.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  pointer-events: auto;
}

:deep(.axis-label) {
  padding: 2px 5px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 3px;
}
</style>