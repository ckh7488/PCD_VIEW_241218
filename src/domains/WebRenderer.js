// src/domains/WebRenderer.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";

export class WebRenderer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    this.rotatingPCDs = [];
    this.axisHelpers = [];
    this.intersectableObjects = [];  // Raycast 대상

    this.controllerType = "orbit";

    this.controller = null;
  }

  init(controllerType = "orbit", controller) {
    this.controller = controller;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.001,
      100000
    );
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    this.setController(controllerType);

    window.addEventListener("resize", this.onWindowResize.bind(this), false);
  }

  setController(controllerType = "orbit") {
    this.controllerType = controllerType;
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    switch (controllerType) {
      case "trackball":
        this.controls = new TrackballControls(this.camera, this.renderer.domElement);
        // trackball 기본 설정
        this.controls.rotateSpeed = 1.0;
        break;
      case "orbit":
      default:
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // damping 끔 → 마찰 없이 사용자가 멈추면 즉시 정지
        this.controls.enableDamping = false;
        break;
    }
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  registerObject(name, pcdInstance) {
    if (this.scene.getObjectByName(name)) {
      console.warn(`Object ${name} is already registered in scene.`);
      return;
    }
    pcdInstance.points.userData.pcdInstance = pcdInstance;
    this.scene.add(pcdInstance.points);
  }

  unregisterObject(name) {
    const obj = this.scene.getObjectByName(name);
    if (obj) {
      this.scene.remove(obj);
      const pcd = obj.userData.pcdInstance;
      if (pcd) {
        this.removeFromRotatingList(pcd);
      }
    } else {
      console.warn(`Object ${name} not found in scene.`);
    }
  }

  addToRotatingList(pcd) {
    if (!this.rotatingPCDs.includes(pcd)) {
      this.rotatingPCDs.push(pcd);
    }
  }

  removeFromRotatingList(pcd) {
    const idx = this.rotatingPCDs.indexOf(pcd);
    if (idx >= 0) {
      this.rotatingPCDs.splice(idx, 1);
    }
  }

  updateRotation(deltaTime = 0.016) {
    this.rotatingPCDs.forEach((pcd) => {
      pcd.updateRotation(deltaTime);
    });
  }

  showAxis(objs) {
    const centerAxis = new THREE.AxesHelper(200);
    this.scene.add(centerAxis);
    this.axisHelpers.push(centerAxis);

    objs.forEach((objName) => {
      const object = this.getObjectByName(objName);
      if (!object) {
        console.warn(`Object ${objName} not found`);
        return;
      }
      const axis = new THREE.AxesHelper(200);
      axis.position.copy(object.position);
      this.scene.add(axis);
      this.axisHelpers.push(axis);
    });
  }

  clearAxis() {
    this.axisHelpers.forEach((axis) => {
      this.scene.remove(axis);
    });
    this.axisHelpers = [];
  }

  toggleAxis(objs) {
    if (this.axisHelpers.length > 0) {
      this.clearAxis();
    } else {
      this.showAxis(objs);
    }
  }

  addObject(threeObj) {
    this.scene.add(threeObj);
    this.intersectableObjects.push(threeObj);
  }

  addPCD(name, pcdPoints) {
    pcdPoints.name = name;
    this.addObject(pcdPoints);
  }

  getObjectByName(name) {
    return this.scene.getObjectByName(name);
  }

  /**
   * visible=false 인 오브젝트는 선택 대상 제외 → Raycast용 헬퍼
   */
  getVisibleObjects() {
    return this.intersectableObjects.filter((obj) => obj.visible);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    this.updateRotation();

    if (this.controller) {
      this.controller.updateHighlights();
    }

    if (this.controls) {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener("resize", this.onWindowResize.bind(this));
    if (this.controls) {
      this.controls.dispose();
    }
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
