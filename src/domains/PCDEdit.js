export default class PCDEdit {
  constructor(pcdGroup, scene) {
    if (!pcdGroup || !scene) {
      throw new Error("PCDEdit requires a PCDGroup instance and a Three.js Scene.");
    }
    this.pcdGroup = pcdGroup;
    this.scene = scene;
  }

  addPCD(name, pcd, viewer) {
    if (!name || !pcd || !pcd.getPoints) {
      console.error("Invalid name or PCD object.");
      return;
    }
  
    // PCDGroup에 PCD 추가 (이미 origin에 add됨)
    this.pcdGroup.add(name, pcd);
    
    const points = pcd.getPoints();
    points.userData.pcdName = name;
  
    // viewer가 주어졌다면, intersectableObjects에만 등록
    if (viewer && viewer.intersectableObjects) {
      viewer.intersectableObjects.push(points);
    }
  
    console.log(`PCD '${name}' added.`);
  }
  

  // addPCD(name, pcd, viewer) {
  //   if (!name || !pcd || !pcd.getPoints) {
  //     console.error("Invalid name or PCD object.");
  //     return;
  //   }
  //   this.pcdGroup.add(name, pcd);
  //   if (viewer && typeof viewer.addPCDToScene === "function") {
  //     viewer.addPCDToScene(name, pcd);
  //   } else {
  //     this.scene.add(pcd.getPoints());
  //   }
  //   console.log(`PCD '${name}' added.`);
  // }

  removePCD(name) {
    const pcd = this.pcdGroup.get(name);
    if (pcd) {
      this.scene.remove(pcd.getPoints());
      this.pcdGroup.remove(name);
      console.log(`PCD '${name}' removed.`);
    } else {
      console.warn(`PCD '${name}' not found.`);
    }
  }

  selectPCD(name) {
    const pcd = this.pcdGroup.get(name);
    if (pcd) {
      this.pcdGroup.setActivePCD(name); // 활성화된 PCD 설정
      console.log(`PCD '${name}' is now active for editing.`);
    } else {
      this.pcdGroup.setActivePCD(null);
      if (name !== null) {
        console.warn(`PCD '${name}' not found.`);
      } else {
        console.log("No PCD selected.");
      }
    }
  }

  addPoints(points) {
    const activePCD = this.pcdGroup.get(this.pcdGroup.activePCDName);
    if (!activePCD) {
      console.warn("No active PCD selected for editing.");
      return;
    }
    activePCD.addPoints(points);
    console.log(`Points added to '${activePCD.name}'.`);
  }

  removePointsByIndices(indices) {
    const activePCD = this.pcdGroup.get(this.pcdGroup.activePCDName);
    if (!activePCD) {
      console.warn("No active PCD selected for editing.");
      return;
    }
    activePCD.removePointsByIndices(indices);
    console.log(`Points removed from '${activePCD.name}'.`);
  }

  setGlobalRotation(axis, speed) {
    if (!this.pcdGroup.activePCDName) {
      console.warn("No active PCD selected.");
      return;
    }
    this.pcdGroup.setGlobalRotation(axis, speed);
    console.log(
      `Set global rotation for '${this.pcdGroup.activePCDName}' to axis (${axis.x}, ${axis.y}, ${axis.z}) with speed ${speed}.`
    );
  }

  setLocalRotation(axis, speed) {
    if (!this.pcdGroup.activePCDName) {
      console.warn("No active PCD selected.");
      return;
    }
    this.pcdGroup.setLocalRotation(axis, speed);
    console.log(
      `Set local rotation for '${this.pcdGroup.activePCDName}' to axis (${axis.x}, ${axis.y}, ${axis.z}) with speed ${speed}.`
    );
  }
}
