import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const canvas = document.querySelector("#scene");
const runtimeStatus = document.querySelector("#runtime-status");
const finishButtons = [...document.querySelectorAll("[data-finish]")];
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const forceStatic = new URLSearchParams(window.location.search).get("no-webgl") === "1";

const finishes = {
  porcelain: {
    surface: new THREE.Color("#e9e5dc"),
    emissive: new THREE.Color("#6b5742"),
    accent: "#e9e5dc",
    accentSoft: "rgba(233, 229, 220, 0.18)",
  },
  smoke: {
    surface: new THREE.Color("#4e5357"),
    emissive: new THREE.Color("#6c5548"),
    accent: "#a8afb4",
    accentSoft: "rgba(168, 175, 180, 0.18)",
  },
  copper: {
    surface: new THREE.Color("#9c5d3f"),
    emissive: new THREE.Color("#a55d38"),
    accent: "#d48b67",
    accentSoft: "rgba(212, 139, 103, 0.18)",
  },
};

const chapterStates = {
  arrival: { rotationX: 0.06, rotationY: -0.34, rotationZ: -0.02, separation: 0, spread: 0, cameraZ: 8.6, cameraX: 0.25, lightX: -0.9, lightY: 0.15, lightZ: 2.1, lightIntensity: 24, sculptureY: -0.08, sculptureScale: 1 },
  form: { rotationX: -0.03, rotationY: 0.26, rotationZ: 0.025, separation: 0.28, spread: 0.08, cameraZ: 8.15, cameraX: -0.1, lightX: 0.1, lightY: 0.45, lightZ: 2.7, lightIntensity: 28, sculptureY: -0.02, sculptureScale: 1.02 },
  light: { rotationX: 0.02, rotationY: -0.18, rotationZ: -0.025, separation: 0.18, spread: 0.04, cameraZ: 7.65, cameraX: 0.35, lightX: 1.4, lightY: 1.0, lightZ: 1.35, lightIntensity: 42, sculptureY: 0.02, sculptureScale: 1.04 },
  mechanism: { rotationX: -0.04, rotationY: 0.14, rotationZ: 0.015, separation: 0.78, spread: 0.45, cameraZ: 8.55, cameraX: -0.2, lightX: -0.2, lightY: 0.55, lightZ: 2.8, lightIntensity: 30, sculptureY: 0, sculptureScale: 0.94 },
  scale: { rotationX: 0.02, rotationY: -0.3, rotationZ: -0.01, separation: 0.04, spread: 0, cameraZ: 10.3, cameraX: 0, lightX: 0.55, lightY: 0.25, lightZ: 2.5, lightIntensity: 27, sculptureY: -0.15, sculptureScale: 0.9 },
  finish: { rotationX: 0.02, rotationY: 0.12, rotationZ: 0, separation: 0, spread: 0, cameraZ: 8.45, cameraX: -0.25, lightX: -0.45, lightY: 0.55, lightZ: 2.3, lightIntensity: 31, sculptureY: -0.04, sculptureScale: 1 },
};

const sceneState = { ...chapterStates.arrival };

let renderer = null;
let scene = null;
let camera = null;
let sculpture = null;
let material = null;
let glowCoreMaterial = null;
let pointLight = null;
let panels = [];
let geometries = [];
let materials = [];
let activeFinish = "porcelain";
let resizeObserver = null;
let motionContext = null;
let destroyed = false;

const panelBlueprints = Array.from({ length: 7 }, (_, index) => {
  const centered = index - 3;
  return {
    x: centered * 0.43, y: Math.abs(centered) * 0.025 - 0.08, z: -Math.abs(centered) * 0.075, rotationY: centered * -0.145, rotationZ: centered * 0.017, explodedX: centered * 0.24, explodedY: (index % 2 === 0 ? 1 : -1) * Math.abs(centered) * 0.04, explodedZ: Math.abs(centered) * 0.2,
  };
});

function setRuntimeStatus(message) { if (runtimeStatus) runtimeStatus.textContent = message; }

function createRenderer() {
  if (!canvas || forceStatic) throw new Error(forceStatic ? "Static evidence mode requested" : "Canvas unavailable");
  const nextRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  nextRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  nextRenderer.outputColorSpace = THREE.SRGBColorSpace;
  nextRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  nextRenderer.toneMappingExposure = 1.0;
  return nextRenderer;
}

function buildScene() {
  renderer = createRenderer();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(sceneState.cameraX, 0, sceneState.cameraZ);
  sculpture = new THREE.Group(); scene.add(sculpture);
  const finish = finishes[activeFinish];
  material = new THREE.MeshPhysicalMaterial({ color: finish.surface.clone(), metalness: 0.68, roughness: 0.28, clearcoat: 0.35, clearcoatRoughness: 0.35, emissive: finish.emissive.clone(), emissiveIntensity: 0.04, side: THREE.DoubleSide });
  materials.push(material);
  const panelGeometry = new THREE.BoxGeometry(0.82, 3.4, 0.065, 1, 1, 1); geometries.push(panelGeometry);
  panels = panelBlueprints.map((blueprint) => { const mesh = new THREE.Mesh(panelGeometry, material); mesh.position.set(blueprint.x, blueprint.y, blueprint.z); mesh.rotation.set(0, blueprint.rotationY, blueprint.rotationZ); sculpture.add(mesh); return mesh; });
  const spineGeometry = new THREE.CylinderGeometry(0.055, 0.055, 3.05, 12); geometries.push(spineGeometry);
  const spineMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color("#2c3033"), metalness: 0.92, roughness: 0.24 }); materials.push(spineMaterial);
  const spine = new THREE.Mesh(spineGeometry, spineMaterial); spine.position.set(0, -0.03, -0.13); sculpture.add(spine);
  const coreGeometry = new THREE.BoxGeometry(0.12, 2.75, 0.12); geometries.push(coreGeometry);
  glowCoreMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffc88c"), transparent: true, opacity: 0.48 }); materials.push(glowCoreMaterial);
  const core = new THREE.Mesh(coreGeometry, glowCoreMaterial); core.position.set(0, -0.05, -0.03); sculpture.add(core);
  scene.add(new THREE.HemisphereLight(0xd9e1e8, 0x14100e, 1.35));
  const key = new THREE.DirectionalLight(0xe9f0f4, 2.4); key.position.set(-4.5, 5.0, 5.5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7691ad, 1.8); rim.position.set(5.0, 1.5, -3.0); scene.add(rim);
  pointLight = new THREE.PointLight(0xffb66e, sceneState.lightIntensity, 10, 1.6); pointLight.position.set(sceneState.lightX, sceneState.lightY, sceneState.lightZ); scene.add(pointLight);
  const baseGeometry = new THREE.CylinderGeometry(1.0, 1.14, 0.14, 48); geometries.push(baseGeometry);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color("#151719"), metalness: 0.28, roughness: 0.8 }); materials.push(baseMaterial);
  const base = new THREE.Mesh(baseGeometry, baseMaterial); base.position.set(0, -1.86, 0.04); sculpture.add(base);
  applySceneState(); resizeScene(); render(); root.classList.add("webgl-ready"); setRuntimeStatus("Interactive LIGHTFOLD sculpture loaded.");
}

function applySceneState() {
  if (!sculpture || !camera || !pointLight) return;
  sculpture.rotation.set(sceneState.rotationX, sceneState.rotationY, sceneState.rotationZ); sculpture.position.y = sceneState.sculptureY; sculpture.scale.setScalar(sceneState.sculptureScale);
  panelBlueprints.forEach((blueprint, index) => { const panel = panels[index]; if (!panel) return; const signed = index - 3; panel.position.x = blueprint.x + blueprint.explodedX * sceneState.separation; panel.position.y = blueprint.y + blueprint.explodedY * sceneState.spread; panel.position.z = blueprint.z + blueprint.explodedZ * sceneState.spread; panel.rotation.y = blueprint.rotationY + signed * 0.022 * sceneState.separation; panel.rotation.z = blueprint.rotationZ + signed * 0.004 * sceneState.spread; });
  camera.position.x = sceneState.cameraX; camera.position.z = sceneState.cameraZ; camera.lookAt(0, -0.12, 0); pointLight.position.set(sceneState.lightX, sceneState.lightY, sceneState.lightZ); pointLight.intensity = sceneState.lightIntensity;
}

function render() { if (destroyed || !renderer || !scene || !camera || document.hidden) return; applySceneState(); renderer.render(scene, camera); }
function resizeScene() { if (!renderer || !camera || !canvas) return; const width = Math.max(1, canvas.clientWidth); const height = Math.max(1, canvas.clientHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); }
function stateTween(target, options = {}) { return { ...target, ease: "none", immediateRender: false, onUpdate: render, ...options }; }

function createScrollChoreography() {
  motionContext?.revert();
  motionContext = gsap.context(() => {
    const chapters = ["form", "light", "mechanism", "scale", "finish"];
    chapters.forEach((chapterId, index) => {
      const section = document.getElementById(chapterId); if (!section) return;
      const previousId = index === 0 ? "arrival" : chapters[index - 1]; const previous = chapterStates[previousId]; const target = chapterStates[chapterId];
      gsap.fromTo(sceneState, { ...previous }, { ...stateTween(target), scrollTrigger: { trigger: section, start: "top 88%", end: "top 24%", scrub: 0.65, invalidateOnRefresh: true } });
      gsap.fromTo(section.querySelector(".chapter-copy"), { opacity: 0.58, y: 28 }, { opacity: 1, y: 0, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 78%", end: "top 48%", scrub: 0.45 } });
    });
  });
  ScrollTrigger.refresh();
}

function setReducedMotionComposition() { motionContext?.revert(); motionContext = null; ScrollTrigger.getAll().forEach((trigger) => trigger.kill()); Object.assign(sceneState, chapterStates.finish, { rotationY: -0.16, cameraZ: 8.9, lightIntensity: 26 }); gsap.set(".chapter-copy", { clearProps: "transform,opacity" }); render(); }
function applyMotionPreference() { if (!renderer) return; if (reducedMotionQuery.matches) { root.classList.add("reduced-motion-runtime"); setReducedMotionComposition(); setRuntimeStatus("Interactive sculpture loaded in reduced-motion mode."); } else { root.classList.remove("reduced-motion-runtime"); Object.assign(sceneState, chapterStates.arrival); render(); createScrollChoreography(); } }

function selectFinish(name, { animate = true } = {}) {
  const finish = finishes[name]; if (!finish) return; activeFinish = name;
  finishButtons.forEach((button) => { const selected = button.dataset.finish === name; button.classList.toggle("is-selected", selected); button.setAttribute("aria-pressed", String(selected)); });
  root.style.setProperty("--accent", finish.accent); root.style.setProperty("--accent-soft", finish.accentSoft); if (!material) return;
  const duration = animate && !reducedMotionQuery.matches ? 0.45 : 0;
  gsap.to(material.color, { r: finish.surface.r, g: finish.surface.g, b: finish.surface.b, duration, ease: "power2.out", onUpdate: render });
  gsap.to(material.emissive, { r: finish.emissive.r, g: finish.emissive.g, b: finish.emissive.b, duration, ease: "power2.out", onUpdate: render });
  if (glowCoreMaterial) { const glow = name === "smoke" ? new THREE.Color("#f1a56e") : new THREE.Color("#ffc88c"); gsap.to(glowCoreMaterial.color, { r: glow.r, g: glow.g, b: glow.b, duration, ease: "power2.out", onUpdate: render }); }
  setRuntimeStatus(`${name[0].toUpperCase()}${name.slice(1)} finish selected.`);
}

function installFinishControls() { finishButtons.forEach((button) => { button.addEventListener("click", () => { selectFinish(button.dataset.finish || "porcelain"); }); }); }
function installLifecycle() { document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); }); if ("ResizeObserver" in window && canvas) { resizeObserver = new ResizeObserver(resizeScene); resizeObserver.observe(canvas); } else { window.addEventListener("resize", resizeScene, { passive: true }); } reducedMotionQuery.addEventListener?.("change", applyMotionPreference); window.addEventListener("beforeunload", destroy, { once: true }); }
function destroy() { if (destroyed) return; destroyed = true; motionContext?.revert(); ScrollTrigger.getAll().forEach((trigger) => trigger.kill()); resizeObserver?.disconnect(); geometries.forEach((geometry) => geometry.dispose()); materials.forEach((entry) => entry.dispose()); renderer?.dispose(); }
function failToStatic(error) { root.classList.remove("webgl-ready"); root.classList.add("webgl-fallback"); const reason = error instanceof Error ? error.message : String(error); console.info("LIGHTFOLD using static sculpture fallback:", reason); setRuntimeStatus("Interactive sculpture unavailable. Showing the complete static LIGHTFOLD experience."); }
function start() { installFinishControls(); installLifecycle(); selectFinish(activeFinish, { animate: false }); try { buildScene(); applyMotionPreference(); } catch (error) { failToStatic(error); } }

start();
