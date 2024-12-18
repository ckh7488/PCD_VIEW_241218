import * as THREE from "three";

export default class PCDGroup {
  constructor(scene) {
    this.pcdMap = new Map(); // 모든 PCD 객체 저장
    this.activePCDName = null; // 현재 활성화된 PCD 이름
    this.rotationRequiredPCDs = new Set(); // 로컬 회전이 필요한 PCD 이름 저장
    this.origin = new THREE.Object3D(); // 원점 역할을 하는 부모 오브젝트
    this.globalRotationAxis = new THREE.Vector3(0, 1, 0); // 기본 글로벌 회전축 (Y축)
    this.globalRotationSpeed = 0; // 기본 글로벌 회전 속도
    scene.add(this.origin); // 원점을 씬에 추가

    console.log("PCDGroup initialized");
  }

  add(name, pcd) {
    if (!name || !pcd || !pcd.getPoints) {
      throw new Error("Invalid name or PCD object.");
    }
    if (this.pcdMap.has(name)) {
      console.warn(`PCD '${name}' already exists.`);
      return;
    }
    this.pcdMap.set(name, pcd);

    // Set the origin as the parent of the PCD points
    // const points = pcd.getPoints();
    this.origin.add(pcd.points);
  }

  remove(name) {
    if (this.pcdMap.has(name)) {
      const pcd = this.pcdMap.get(name);
      const points = pcd.getPoints();
      this.origin.remove(points); // Remove the PCD points from the origin
      this.pcdMap.delete(name);
      this.rotationRequiredPCDs.delete(name); // 로컬 회전 리스트에서 제거
    } else {
      console.warn(`PCD '${name}' not found.`);
    }

    if (this.activePCDName === name) {
      this.activePCDName = null;
    }
  }

  get(name) {
    return this.pcdMap.get(name);

  }

  getAll() {
    return this.pcdMap;
  }

  setActivePCD(name) {
    if (this.pcdMap.has(name)) {
      this.activePCDName = name;
    } else {
      console.warn(`PCD '${name}' not found.`);
      this.activePCDName = null;
    }
  }

  /**
   * Set global rotation axis and speed for the entire group.
   * Rotates the origin, affecting all children.
   * @param {THREE.Vector3} axis - The global rotation axis.
   * @param {number} speed - The global rotation speed.
   */
  setGlobalRotation(axis, speed) {
    this.globalRotationAxis = axis.clone().normalize(); // Ensure the axis is normalized
    this.globalRotationSpeed = speed;
  }

  /**
   * Set local rotation axis and speed for the active PCD.
   * Adds the PCD to the rotation list if speed > 0.
   * @param {THREE.Vector3} axis - The local rotation axis.
   * @param {number} speed - The local rotation speed.
   */
  setLocalRotation(axis, speed) {
    if (!this.activePCDName) {
      console.warn("No active PCD selected.");
      return;
    }
    const pcd = this.get(this.activePCDName);

    pcd.setLocalRotation(axis, speed);

    // Add or remove from rotation list
    if (speed === 0) {
      this.rotationRequiredPCDs.delete(this.activePCDName);
    } else {
      this.rotationRequiredPCDs.add(this.activePCDName);
    }
  }

  /**
   * Update all rotations in the group.
   * Rotates the origin for global transformations and individual PCDs for local rotations.
   */
  update() {
    // Apply global rotation to the origin
    if (this.globalRotationSpeed !== 0) {
      this.origin.rotateOnAxis(this.globalRotationAxis, this.globalRotationSpeed);
      this.origin.updateMatrixWorld(true); // Ensure the matrix world is updated
    }

    // Apply local rotations
    for (const name of this.rotationRequiredPCDs) {
      const pcd = this.get(name);
      if (!pcd) continue;

      // Apply local rotation
      if (pcd.localRotationSpeed !== 0) {
        pcd.points.rotateOnAxis(
          pcd.localRotationAxis,
          pcd.localRotationSpeed
        );
      }
    }
  }

  /**
   * Get the list of PCDs that require local rotation.
   * @returns {Set<string>} - A set of PCD names.
   */
  getRotationRequiredPCDs() {
    return this.rotationRequiredPCDs;
  }
}
