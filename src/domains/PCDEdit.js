export default class PCDEdit {
    constructor(pcdGroup, scene) {
      if (!pcdGroup || !scene) {
        throw new Error("PCDEdit requires a PCDGroup instance and a Three.js Scene.");
      }
      this.pcdGroup = pcdGroup; // PCD 그룹 관리
      this.scene = scene;       // Scene 참조
      this.activePCD = null;    // 활성화된 PCD
    }
  
    /**
     * PCD 추가 및 Scene에 등록
     * @param {string} name - PCD의 이름
     * @param {PCD} pcd - PCD 객체
     */
    addPCD(name, pcd) {
      if (!name || !pcd || !pcd.getPoints) {
        console.error("Invalid name or PCD object.");
        return;
      }
      this.pcdGroup.add(name, pcd);
      this.scene.add(pcd.getPoints());
      console.log(`PCD '${name}' added.`);
    }
  
    /**
     * PCD 삭제 및 Scene에서 제거
     * @param {string} name - PCD의 이름
     */
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
  
    /**
     * 특정 PCD 선택 (활성화)
     * @param {string} name - PCD의 이름
     */
    selectPCD(name) {
      const pcd = this.pcdGroup.get(name);
      if (pcd) {
        this.activePCD = pcd;
        console.log(`PCD '${name}' is now active for editing.`);
      } else {
        console.warn(`PCD '${name}' not found.`);
      }
    }
  
    /**
     * 활성화된 PCD에 포인트 추가
     * @param {Array} points - [x1, y1, z1, color1, x2, y2, z2, color2, ...]
     */
    addPoints(points) {
      if (!this.activePCD) {
        console.warn("No active PCD selected for editing.");
        return;
      }
      this.activePCD.addPoints(points);
      console.log(`Points added to '${this.activePCD.name}'.`);
    }
  
    /**
     * 활성화된 PCD에서 포인트 삭제
     * @param {Array} indices - 삭제할 포인트의 인덱스 배열
     */
    removePointsByIndices(indices) {
      if (!this.activePCD) {
        console.warn("No active PCD selected for editing.");
        return;
      }
      this.activePCD.removePointsByIndices(indices);
      console.log(`Points removed from '${this.activePCD.name}'.`);
    }
  }

  
  