export default class PCDGroup {
    constructor() {
      this.pcdMap = new Map(); // PCD 객체를 관리하는 Map
    }
  
    /**
     * PCD 추가
     * @param {string} name - PCD의 이름
     * @param {PCD} pcd - PCD 객체
     */
    add(name, pcd) {
      if (!name || !pcd || !pcd.getPoints) {
        throw new Error("Invalid name or PCD object.");
      }
      if (this.pcdMap.has(name)) {
        console.warn(`PCD '${name}' already exists.`);
        return;
      }
      this.pcdMap.set(name, pcd);
    }
  
    /**
     * PCD 삭제
     * @param {string} name - PCD의 이름
     */
    remove(name) {
      if (this.pcdMap.has(name)) {
        this.pcdMap.delete(name);
      } else {
        console.warn(`PCD '${name}' not found.`);
      }
    }
  
    /**
     * PCD 조회
     * @param {string} name - PCD의 이름
     * @returns {PCD} - PCD 객체
     */
    get(name) {
      return this.pcdMap.get(name);
    }
  
    /**
     * 모든 PCD 반환
     * @returns {Map} - PCD 객체 Map
     */
    getAll() {
      return this.pcdMap;
    }
  }
  