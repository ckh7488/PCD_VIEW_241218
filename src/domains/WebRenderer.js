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

    this.axisHelpers = [];
    this.intersectableObjects = [];

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
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
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
        this.controls.rotateSpeed = 1.0;
        break;
      case "orbit":
      default:
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = false;
        break;
    }
  }

  onWindowResize() {
    this.camera.aspect =
      this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
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
    } else {
      console.warn(`Object ${name} not found in scene.`);
    }
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

  addPCD(name, pcd) {
    // 여기서 pcd는 PCD class instance
    const points = pcd.getPoints();
    points.name = name;
    points.userData.pcdInstance = pcd; // ← 핵심!
    this.addObject(points);
  }
  
  addObject(threeObj) {
    this.scene.add(threeObj);
    this.intersectableObjects.push(threeObj);
  }

  getObjectByName(name) {
    return this.scene.getObjectByName(name);
  }

  getVisibleObjects() {
    return this.intersectableObjects.filter((obj) => obj.visible);
  }

  /**
   * 매 프레임 호출
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // 모든 Scene 오브젝트를 순회하며, PCD인 경우 applyModifiers + updateRotation
  this.scene.traverse((child) => {
    if (child.userData && child.userData.pcdInstance) {
      const pcd = child.userData.pcdInstance;
      // (1) 매 프레임 회전각 증가
      pcd.updateRotation(0.016); 
      // (2) Modifier(Transformation, Rotation) 누적 적용
      pcd.applyModifiers();
    }
  });

    // 선택 박스헬퍼 업데이트
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
