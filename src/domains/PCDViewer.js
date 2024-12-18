import * as THREE from "three";
import PCDGroup from "./PCDGroup";
import PCDEdit from "./PCDEdit";
import OrbitController from "./controllers/OrbitController";

export default class PCDViewer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controller = null;
    this.animateId = null;

    this.pcdGroup = null;
    this.pcdEdit = null;

    this.raycaster = null;
    this.mouse = null;
    this.intersectableObjects = [];

    this.activePCD = null;

    this.originAxes = null; // Axis helper reference
    this.localAxes = null;

    this.axisHelperVisible = true; // Track axis helper state
    this.onFileSelectCallback = null;

    this.popup = null; // Popup DOM element
    this.init();
  }

  init() {
    console.log("init the PCDViewer")
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.scene = new THREE.Scene();
    this.pcdGroup = new PCDGroup(this.scene);
    this.scene.background = new THREE.Color(0x000000);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    this.pcdEdit = new PCDEdit(this.pcdGroup, this.scene);

    // Controller
    this.setController(new OrbitController(this.camera, this.renderer.domElement));

    // Global Axes (always present)
    this.originAxes = new THREE.AxesHelper(50);
    this.scene.add(this.originAxes);

    // Local Axes (attached to PCDs when needed)
    this.localAxes = new THREE.AxesHelper(50);
    this.localAxes.visible = false;
    this.scene.add(this.localAxes);

    // camera_origin setup
    this.camera_origin = [this.camera.position.clone(), new THREE.Vector3(0, 0, 0)]; // Global origin

    // Set the OrbitControls target to the global origin
    this.controller.get().target.set(0, 0, 0); // Global origin
    this.controller.get().update(); // Update OrbitControls

    window.addEventListener("resize", this.onWindowResize.bind(this), false);
    this.renderer.domElement.addEventListener("click", this.onDocumentClick.bind(this), false);
    window.addEventListener("keydown", this.onKeyDown.bind(this)); // Handle keydown events

    this.animate();
}


  setController(controller) {
    if (this.controller) {
      this.controller.disable();
    }
    this.controller = controller;
    this.controller.enable();
  }

  getEditor() {
    return this.pcdEdit;
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  onDocumentClick(event) {
    event.preventDefault();

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.intersectableObjects, true);

    if (intersects.length > 0) {
      const pcdName = intersects[0].object.userData.pcdName;
      if (pcdName) {
        this.pcdEdit.selectPCD(pcdName);
        this.onPCDSelected(pcdName);
        if (this.onFileSelectCallback) {
          this.onFileSelectCallback(pcdName);
        }
      }
    } else {
      // Only deselect if no popup is active
      if (!this.popup) {
        this.onPCDDeselected();
        this.pcdEdit.selectPCD(null);
        if (this.onFileSelectCallback) {
          this.onFileSelectCallback(null);
        }
      }
    }
  }

  onKeyDown(event) {
    if (!this.activePCD && (event.key.toLowerCase() !== "a" && event.key.toLowerCase() !== "l" && event.key.toLowerCase() !== "x")) return;

    switch (event.key.toLowerCase()) {
      case "x":
        console.log(this.pcdGroup.getRotationRequiredPCDs())
        break
      case "a":
        // Toggle axis helper visibility
        this.axisHelperVisible = !this.axisHelperVisible;
        this.originAxes.visible = this.axisHelperVisible;
        if(this.localAxes){
          this.localAxes.visible = this.axisHelperVisible
        }
        break
      case "l":
        // set camera to origin
        this.camera.position.copy(this.camera_origin[0])
        this.camera.lookAt(this.camera_origin[1])
        this.controller.get().target.copy(this.camera_origin[1])
        this.controller.get().update()
        break
      case "o":
        //reset current PCD's position to global origin
        this.activePCD.points.position.set(0,0,0);
        break

      case "g":
      case "s":
      case "c":
        this.showPopup(event.key.toLowerCase());
        break;
      case "r":
        if(event.altKey) {
          this.showRotationPopup(); // Show rotation popup for global/local settings
        } else {
          this.showPopup(event.key.toLowerCase());
        }
        break;

      default:
        break;
    }
  }

  showRotationPopup() {
    if (!this.popup) {
        this.popup = document.createElement("div");
        this.popup.style.position = "absolute";
        this.popup.style.bottom = "20px";
        this.popup.style.left = "50%";
        this.popup.style.transform = "translateX(-50%)";
        this.popup.style.padding = "10px";
        this.popup.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        this.popup.style.color = "white";
        this.popup.style.border = "1px solid white";
        this.popup.style.borderRadius = "5px";
        this.popup.style.zIndex = "1000";
        this.container.appendChild(this.popup);
    }

    this.popup.innerHTML = `
        <label>Global Rotation Axis:</label>
        <input type="number" id="globalX" placeholder="X" style="width: 50px; margin: 0 5px;">
        <input type="number" id="globalY" placeholder="Y" style="width: 50px; margin: 0 5px;">
        <input type="number" id="globalZ" placeholder="Z" style="width: 50px; margin: 0 5px;">
        <label>Speed:</label>
        <input type="number" id="globalSpeed" placeholder="Speed" style="width: 100px; margin: 0 5px;">
        <button id="applyGlobalRotation" style="margin-left: 10px;">Apply Global</button>
        <br><br>
        <label>Local Rotation Axis:</label>
        <input type="number" id="localX" placeholder="X" style="width: 50px; margin: 0 5px;">
        <input type="number" id="localY" placeholder="Y" style="width: 50px; margin: 0 5px;">
        <input type="number" id="localZ" placeholder="Z" style="width: 50px; margin: 0 5px;">
        <label>Speed:</label>
        <input type="number" id="localSpeed" placeholder="Speed" style="width: 100px; margin: 0 5px;">
        <button id="applyLocalRotation" style="margin-left: 10px;">Apply Local</button>
        <br><br>
    `;

    // Global rotation apply handler
    document.getElementById("applyGlobalRotation").onclick = () => {
        const globalX = parseFloat(document.getElementById("globalX").value) || 0;
        const globalY = parseFloat(document.getElementById("globalY").value) || 0;
        const globalZ = parseFloat(document.getElementById("globalZ").value) || 0;
        const globalSpeed = parseFloat(document.getElementById("globalSpeed").value) || 0;

        if (this.activePCD) {
            const globalAxis = new THREE.Vector3(globalX, globalY, globalZ).normalize();
            this.getEditor().setGlobalRotation(globalAxis, globalSpeed);
        }

        this.closePopup(); // Close popup after applying changes
    };

    // Local rotation apply handler
    document.getElementById("applyLocalRotation").onclick = () => {
        const localX = parseFloat(document.getElementById("localX").value) || 0;
        const localY = parseFloat(document.getElementById("localY").value) || 0;
        const localZ = parseFloat(document.getElementById("localZ").value) || 0;
        const localSpeed = parseFloat(document.getElementById("localSpeed").value) || 0;

        if (this.activePCD) {
            const localAxis = new THREE.Vector3(localX, localY, localZ).normalize();
            this.getEditor().setLocalRotation(localAxis, localSpeed);
        }

        this.closePopup(); // Close popup after applying changes
    };
}


  showPopup(mode) {
    if (!this.popup) {
        this.popup = document.createElement("div");
        this.popup.style.position = "absolute";
        this.popup.style.bottom = "20px";
        this.popup.style.left = "50%";
        this.popup.style.transform = "translateX(-50%)";
        this.popup.style.padding = "10px";
        this.popup.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        this.popup.style.color = "white";
        this.popup.style.border = "1px solid white";
        this.popup.style.borderRadius = "5px";
        this.popup.style.zIndex = "1000";
        this.container.appendChild(this.popup);
    }

    if (mode === "c") {
        this.popup.innerHTML = `
          <label>Change Color:</label>
          <input type="text" id="colorValue" placeholder="Enter color (e.g., ff0000)" style="width: 120px; margin: 0 5px;">
          <button id="applyColor">Apply</button>
        `;

        document.getElementById("applyColor").onclick = () => {
            const colorHex = document.getElementById("colorValue").value.trim();

            if (/^[0-9a-fA-F]{6}$/.test(colorHex)) {
                const color = parseInt(colorHex, 16);
                if (this.activePCD) {
                    this.activePCD.points.material.color.setHex(color);
                }
            } else {
                alert("Invalid color format. Please enter a valid 6-character hexadecimal value.");
            }

            this.closePopup(); // Close popup after applying changes
        };
    } else {
        this.popup.innerHTML = `
          <label>${mode.toUpperCase()} Mode:</label>
          <input type="number" id="xValue" placeholder="X" style="width: 50px; margin: 0 5px;">
          <input type="number" id="yValue" placeholder="Y" style="width: 50px; margin: 0 5px;">
          <input type="number" id="zValue" placeholder="Z" style="width: 50px; margin: 0 5px;">
          <button id="applyTransform">Apply</button>
        `;

        document.getElementById("applyTransform").onclick = () => {
            const x = parseFloat(document.getElementById("xValue").value) || 0;
            const y = parseFloat(document.getElementById("yValue").value) || 0;
            const z = parseFloat(document.getElementById("zValue").value) || 0;

            if (mode === "g") this.activePCD.points.position.add(new THREE.Vector3(x, y, z));
            if (mode === "r") {
                const currentRotation = this.activePCD.points.rotation;
                this.activePCD.points.rotation.set(
                    currentRotation.x + THREE.MathUtils.degToRad(x),
                    currentRotation.y + THREE.MathUtils.degToRad(y),
                    currentRotation.z + THREE.MathUtils.degToRad(z)
                );
            }
            if (mode === "s") this.activePCD.points.scale.set(x || 1, y || 1, z || 1);
            this.closePopup(); // Close popup after applying changes
        };
    }
}

  closePopup() {
    if (this.popup) {
      this.container.removeChild(this.popup);
      this.popup = null;
    }
  }

  onPCDSelected(name) {
    const pcd = this.pcdGroup.get(name);
    if (pcd) {
      this.activePCD = pcd;
      const points = pcd.getPoints();
      points.add(this.localAxes);
      if(this.axisHelperVisible){
        this.localAxes.visible = true;
      }
    }
  }

  onPCDDeselected() {
    if (this.activePCD) {
      const points = this.activePCD.getPoints();
      if (this.localAxes.parent === points) {
        points.remove(this.localAxes);
      }
      this.localAxes.visible = false;
      this.activePCD = null;
    }
  }

  animate() {
    this.animateId = requestAnimationFrame(this.animate.bind(this));
    if (this.controller) {
      this.controller.update();
    }

    // Update PCD states
    this.pcdGroup.update();

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    console.log("dispose");
    cancelAnimationFrame(this.animateId);
    window.removeEventListener("resize", this.onWindowResize.bind(this));
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
    this.controller?.disable();

    if (this.container && this.renderer) {
      this.container.removeChild(this.renderer.domElement);
    }

    if (this.renderer) this.renderer.dispose();

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controller = null;
    this.pcdGroup = null;
    this.pcdEdit = null;
    this.activePCD = null;
    this.intersectableObjects = null;
    this.originAxes = null;
    this.localAxes = null;
  }


  addPCDToScene(name, pcd) {
    const points = pcd.getPoints();
    points.userData.pcdName = name;
  
    // 이제 scene.add(points)를 호출하지 않음!
    // this.scene.add(points); 제거
    
    this.intersectableObjects.push(points);
    // 이제 PCD는 already origin을 통해 scene에 존재
  }
  

  // addPCDToScene(name, pcd) {
  //   const points = pcd.getPoints();
  //   points.userData.pcdName = name;
  //   this.intersectableObjects.push(points);
  //   this.scene.add(points);
  // }

  onFileSelect(cb) {
    this.onFileSelectCallback = cb;
  }
}
