export default class BaseController {
    constructor(camera, rendererDomElement) {
      this.camera = camera;
      this.rendererDomElement = rendererDomElement;
    }
  
    enable() {
      throw new Error("enable() method must be implemented.");
    }
  
    disable() {
      throw new Error("disable() method must be implemented.");
    }
  
    update() {
      throw new Error("update() method must be implemented.");
    }
  }
  