import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import BaseController from "./BaseController";

export default class OrbitController extends BaseController {
    constructor(camera, rendererDomElement) {
      super(camera, rendererDomElement);
      this.controls = null;
    }
  
    enable() {
      if (!this.controls) {
        this.controls = new OrbitControls(this.camera, this.rendererDomElement);
        this.controls.enableDamping = true; // 부드러운 움직임
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true; // 화면 공간 팬닝 활성화
        this.controls.maxPolarAngle = Math.PI; // 카메라 회전 각도 제한 (위아래 움직임 제어)
      }
      this.controls.enabled = true;
    }
  
    disable() {
      if (this.controls) {
        this.controls.enabled = false;
      }
    }
  
    update() {
      if (this.controls) {
        this.controls.update();
      }
    }

    get(){
      return this.controls
    }
  }
