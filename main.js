import './style.css'

import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import { RenderPass } from 'three/examples/jsm/Addons.js';
import { SMAAPass } from 'three/examples/jsm/Addons.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { TAARenderPass } from 'three/addons/postprocessing/TAARenderPass.js';
import { OutputPass } from 'three/examples/jsm/Addons.js';
import { loadShader } from "./utils.js";
import './shader/NoiseShaderChunks.js';
import setupShader from './shader/PrintShaderChunk.js';

async function preloadShaders() {
  const PrintNormalShader = await setupShader();  // Ensure this fully resolves before continuing
  return PrintNormalShader;
}

function downloadShaderCode(filename, content) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
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
  document.body.appendChild(renderer.domElement);

  // Composer
  const composer = new EffectComposer( renderer );
  composer.addPass( new RenderPass( scene, camera ) );

  const smaaPass = new SMAAPass( window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio() );
  smaaPass.enabled = true;
  composer.addPass( smaaPass );

  const gtaoPass = new GTAOPass( scene, camera, renderer.innerWidth, renderer.innerHeight );
  gtaoPass.output = GTAOPass.OUTPUT.Default;
  gtaoPass.enabled = true;
  // .enabled = true;
  composer.addPass( gtaoPass );

  const outputPass = new OutputPass();
  composer.addPass( outputPass );

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
    const l1 = new THREE.DirectionalLight(0xffffff, 1);
    l1.position.set(maxSize, maxSize, maxSize);

    const l2 = new THREE.DirectionalLight(0xffffff, 1);
    l2.position.set(-maxSize, maxSize, maxSize);

    const l3 = new THREE.DirectionalLight(0xffffff, 1);
    l3.position.set(-maxSize, -maxSize, maxSize);

    const l4 = new THREE.DirectionalLight(0xffffff, 1);
    l4.position.set(maxSize, -maxSize, maxSize);
    scene.add(l1, l2, l3, l4);

    // Load the Shaders
    const vertexShader = await loadShader('./shader/vertexShader.glsl');
    const fragmentShader = await loadShader('./shader/fragmentShader.glsl');

    // Custom Material w/ Shader Injection
    const PrintNormalShader = await preloadShaders();
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(230.0/255, 25.0/255, 7.0/255),
      roughness: 0.4,
      ior: 1.45,
      normalMapType: THREE.ObjectSpaceNormalMap,
      alphaHash: true,
      aoMap: gtaoPass.aoMap
    });
    material.onBeforeCompile = function (shader) {
        shader.uniforms.height = { value: size.z };
        shader.uniforms.layerThickness = { value: 0.25 };
        shader.uniforms.layerWidth = { value: 0.45 };
        shader.uniforms.distortionScale = { value: 0.020};

        // Inject uNormal & uPosition into the vertex shader (world position/normal)
        shader.vertexShader = shader.vertexShader.replace(
          `#include <common>`,
          `#include <common>
          varying vec3 uPosition;
          varying vec3 uNormal;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
          uNormal = objectNormal;`
        );

        // Inject Layer Calculation Functions
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>\n${PrintNormalShader.normalCalculation}`
        );

        // Compute custom normal map/coloring
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_maps>',
            `vec4 customNormal = printLayerNormals(vPosition, normal, uNormal);
            normal = customNormal.xyz;
            float layers = customNormal.w;
            float layersColor = 1.0 - layers*0.5;
            diffuseColor *= max(0.8, layers);`
        );

        // Debug output
        // shader.fragmentShader = shader.fragmentShader.replace(
        //     '#include <dithering_fragment>',
        //     `#include <dithering_fragment>
        //     gl_FragColor = vec4(uNormal, 1.0);`
        // );
        };
    const mesh = new THREE.Mesh( geometry, material );
    mesh.castShadow = true;

    // Axis Helper
    const axesHelper = new THREE.AxesHelper( 10 );
    const min = boundingBox.min;
    let sizePad = 0.2;
    axesHelper.position.set(min.x-sizePad*size.x, min.y-sizePad*size.y, min.z);
    scene.add( axesHelper );

    scene.add( mesh );

  } );

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