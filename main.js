import './style.css'

import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import { RenderPass } from 'three/examples/jsm/Addons.js';
import { SMAAPass } from 'three/examples/jsm/Addons.js';
import { TAARenderPass } from 'three/addons/postprocessing/TAARenderPass.js';
import { OutputPass } from 'three/examples/jsm/Addons.js';
import './shader/MyShaderChunks.js';

// Shader Loader
async function loadShader(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load shader from ${url}: ${response.statusText}`);
  }
  return response.text();
}

// Scene Initialization
async function init() {
  // Scene and Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.up.set(0, 0, 1);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg'),
    // powerPreference: "high-performance",
    // antialias: false,
    // stencil: false,
    // depth: false
  })
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize( window.innerWidth, window.innerHeight);
  // renderer.render( scene, camera );

  document.body.appendChild(renderer.domElement);

  // Add Geometry
  const loader = new STLLoader();
  loader.load( './models/3dbenchy.stl', async function ( geometry ) {


    // Vertex Normals
    geometry.computeVertexNormals();

    // Get the bounding box of the object
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);

    // Set the camera to look at the center of the bounding box
    let newPositionCamera = new THREE.Vector3(maxSize, maxSize, maxSize);
    camera.position.set(
      -newPositionCamera.x,
      -newPositionCamera.y,
      newPositionCamera.z
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    // Lighting
    // const ambientLight = new THREE.AmbientLight(0xffffff);
    // scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.position.set(maxSize, maxSize, maxSize);
    scene.add(directionalLight);

    // Load the Shaders
    const vertexShader = await loadShader('./shader/vertexShader.glsl');
    const fragmentShader = await loadShader('./shader/fragmentShader.glsl');

    // Mesh Material
    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
          baseColor: { value: new THREE.Color(1.0, 0.0, 0.0) }, // Example: A nice purple
          height: { value: size.z },
          layerThickness: { value: 0.5 },
          layerWidth: { value: 0.45 },
          distortionScale: { value: 0.010},
          lightColor: {value: new THREE.Color(1, 1, 1)},
          lightDirection: {value: directionalLight.position.clone().normalize()},
          viewDirection: {value: camera.position.clone()}
    }});
    const mesh = new THREE.Mesh( geometry, material );

    // Axis Helper
    const axesHelper = new THREE.AxesHelper( 10 );
    const min = boundingBox.min;
    let sizePad = 0.2;
    axesHelper.position.set(min.x-sizePad*size.x, min.y-sizePad*size.y, min.z);
    scene.add( axesHelper );

    scene.add( mesh );

  } );

  // Composer
  const composer = new EffectComposer( renderer );
  composer.addPass( new RenderPass( scene, camera ) );

  const smaaPass = new SMAAPass( window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio() );
  composer.addPass( smaaPass );

  const outputPass = new OutputPass();
  composer.addPass( outputPass );

  // Grid Helper
  const gridHelper = new THREE.GridHelper(350, 35);
  gridHelper.rotation.x=Math.PI/2;
  scene.add(gridHelper);

  // Orbiter
  const controls = new OrbitControls( camera, renderer.domElement );

  // Animation Loop
  function animate() {
    requestAnimationFrame( animate );
    camera.updateMatrixWorld();

    controls.update();
    // renderer.render( scene, camera );
    smaaPass.enabled = true;

    composer.render();
  }

  animate();
}

init();