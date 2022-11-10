import {
  AxesHelper,
  CameraHelper,
  Scene,
  Color,
  OrthographicCamera,
  PerspectiveCamera,
  WebGLRenderer,
  DirectionalLight,
  HemisphereLight,
} from "three";

import VBF from "./loaders/VBF";
import VMJ from "./loaders/VMJ";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import {
//   CSS2DRenderer,
//   CSS2DObject
// } from "three/examples/jsm/renderers/CSS2DRenderer";
import Stats from "three/examples/jsm/libs/stats.module";
import { getGPUTier } from "detect-gpu";

import { GUI } from "dat.gui";

class Viewer {
  // container;
  // gpu;
  // camera;
  // renderer;
  // scene;
  // points;
  // controls;
  // gui;

  constructor(options) {
    this.options = Object.assign(
      { dragAndDropEnabled: true, onDemand: true },
      { options }
    );
  }

  async init(container, file) {
    this.gpu = await getGPUTier();

    this.container = document.querySelector("#viewer-scene-container");

    // Creating the this.scene
    this.scene = new Scene();
    this.scene.background = new Color("midnightblue");

    this.createCamera();
    //this.createLights();

    // Toggle elements
    this.createStats();
    this.createAxesHelper();
    this.createCameraHelper();

    this.createControls();
    this.createRenderer();
    // this.createCSS2DRenderer();

    this.createGUI();

    if (this.options.dragAndDropEnabled) {
      this.setupDragDrop();
    }

    if (file) {
      await this.loadModel(file);
    }
  }

  setupDragDrop() {
    this.container.ondragover = function () {
      this.className = "hover";
      return false;
    };

    this.container.ondragend = function () {
      this.className = "";
      return false;
    };

    this.container.ondrop = (e) => {
      //this.className = "";
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      this.loadModel(file);
    };
  }

  createCamera() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    const near = -50;
    const far = 2000;
    const divider = 15;
    // const fov = 50;
    // const aspect = width / height;
    // this.camera = new PerspectiveCamera(fov, aspect, 1, far);
    // this.camera.position.set(0, 2, 15);
    this.camera = new OrthographicCamera(
      width / -divider,
      width / divider,
      height / divider,
      height / -divider,
      near,
      far
    );

    this.camera.position.set(0, 0, 10);

    this.scene.add(this.camera);
    this.showCameraHelper = false;

    this.addWindowResizeListner();
  }

  createCameraHelper() {
    this.showCameraHelper = false;
    this.cameraHelper = new CameraHelper(this.camera);
  }

  toggleCameraHelper() {
    if (!this.cameraHelper) {
      this.createCameraHelper();
    }
    this.showCameraHelper
      ? this.scene.add(this.cameraHelper)
      : this.scene.remove(this.cameraHelper);
  }

  toggleAxesHelper() {
    if (!this.axesHelper) {
      this.createAxesHelper();
    }
    this.showAxesHelper
      ? this.scene.add(this.axesHelper)
      : this.scene.remove(this.axesHelper);
  }

  createAxesHelper() {
    this.showAxesHelper = true;
    this.axesHelper = new AxesHelper(50);

    if (this.showAxesHelper) {
      this.scene.add(this.axesHelper);
    }
  }

  createLights() {
    this.showLights = false;
    this.mainLight = new DirectionalLight("white", 100);
    this.mainLight.position.set(0, 3, 10);
    this.hemisphereLight = new HemisphereLight(0xddeeff, 0x202020, 5);

    // const lightFolder = this.gui.addFolder("Light");
    // lightFolder
    //   .add(this, "showLights", true, false)
    //   .name("Active")
    //   .onChange((value) => {
    //     this.toggleLights();
    //   });

    // lightFolder.addColor(this.mainLight, "color").name("Main Light Color");
    // lightFolder
    //   .add(this.mainLight, "intensity", 0, 10)
    //   .name("Main Light Intensity");
  }

  toggleLights() {
    this.showLights
      ? this.scene.add(this.mainLight, this.hemisphereLight)
      : this.scene.remove(this.mainLight, this.hemisphereLight);
  }

  createStats() {
    this.stats = new Stats();
    this.showStats = false;
  }

  toggleStats() {
    if (!this.stats) {
      this.createStats();
    }

    if (this.showStats) {
      this.container.appendChild(this.stats.dom);
    } else {
      this.container.removeChild(this.stats.dom);
    }
  }

  createGUI() {
    this.gui = new GUI();
    this.gui.closed = true;

    this.generalFolder = this.gui.addFolder("General");

    this.generalFolder
      .add(this, "showAxesHelper", true, false)
      .name("Axes")
      .onChange((value) => {
        this.toggleAxesHelper();
        this.requestRender();
      });

    this.generalFolder
      .add(this, "showCameraHelper", true)
      .name("Camera Frustrum")
      .onChange((value) => {
        this.toggleCameraHelper();
        this.requestRender();
      });

    this.generalFolder
      .add(this, "showStats", false)
      .name("Stats")
      .onChange((value) => {
        this.toggleStats();
        this.requestRender();
      });
  }

  reset() {
    if (this.model) {
      this.scene.remove(this.model);
    }

    if (this.modelFolder) {
      this.gui.removeFolder(this.modelFolder);
    }

    this.modelFolder = this.gui.addFolder("Model");

    if (this.loader) {
      this.loader.reset();
      this.loader = null;
    }

    this.requestRender();
  }

  chooseLoader(file) {
    return new ([VBF, VMJ].find((loader) => {
      return new loader().canProcess(file);
    }))(file);
  }

  async loadModel(file) {
    this.reset();
    this.file = file;
    // TODO: Different file type
    // and file validation
    this.loader = this.chooseLoader(file);
    console.log(this.loader);
    if (!this.loader) {
      throw Error("This file is not supported!");
    }
    this.loader.addGUIControllers(this.modelFolder, () => this.requestRender());
    this.model = await this.loader.parse();

    console.log(this.file === file);
    if (this.file === file) {
      this.loader.createDataTable();
      this.scene.add(this.model);
      this.requestRender();
    }
  }

  createRenderer() {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.renderer.setPixelRatio(window.devicePixelRatio);
    //renderer.gammaFactor = 2.2;
    //renderer.gammaOutput = true;
    this.renderer.physicallyCorrectLights = true;

    this.container.appendChild(this.renderer.domElement);

    this.renderer.setAnimationLoop(() => {
      this.animate();
      if (this.options.onDemand === false || this.isRenderRequested === true) {
        this.render();
        this.isRenderRequested = false;
      }
    });

    this.requestRender();
  }

  // createCSS2DRenderer() {
  //   this.css2DRenderer = new CSS2DRenderer();
  //   this.css2DRenderer.setSize(window.innerWidth, window.innerHeight);
  //   this.css2DRenderer.domElement.style.position = "absolute";
  //   this.css2DRenderer.domElement.style.top = "0px";
  //   this.css2DRenderer.domElement.style.pointerEvents = "none";
  //   document.body.appendChild(this.css2DRenderer.domElement);
  // }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.container);
    this.controls.addEventListener("change", () => {
      this.requestRender();
    });
  }
  /**
   * Perform any transformations of objects
   * that require rerendering of the scene
   */
  animate() {
    this.stats.update();
  }

  /**
   * Render a new frame
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }

  requestRender() {
    this.isRenderRequested = true;
  }

  addWindowResizeListner(onWindowResize) {
    onWindowResize =
      onWindowResize ??
      (() => {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const divider = 10;
        if (this.camera.isOrthographicCamera) {
          this.camera.left = width / -divider;
          this.camera.right = width / divider;
          this.camera.top = height / divider;
          this.camera.bottom = height / -divider;
        } else {
          this.camera.aspect = width / height;
        }
        // Update this.camera frustum
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        //this.css2DRenderer.setSize(window.innerWidth, window.innerHeight);
        this.requestRender();
      });

    window.addEventListener("resize", onWindowResize, false);
  }
}

export default Viewer;
