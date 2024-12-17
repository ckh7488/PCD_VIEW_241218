import * as THREE from "three";

export default class PCD {
  constructor(name) {
    this.name = name; // PCD 객체 이름
    this.geometry = new THREE.BufferGeometry(); // 점 데이터를 저장할 BufferGeometry
    this.material = new THREE.PointsMaterial({
      size: 0.1, // 포인트 크기
      vertexColors: true, // 각 포인트별 색상을 사용
    });
    this.points = new THREE.Points(this.geometry, this.material); // 포인트 클라우드 객체
    this.visible = true;
  }

  /**
   * 포인트 추가 (여러 개의 점 데이터를 받음)
   * @param {Array} pointArray - [x1, y1, z1, color1, x2, y2, z2, color2, ...] 형식의 배열
   */
  addPoints(pointArray) {
    if (!Array.isArray(pointArray)) {
      throw new Error("Point data must be provided as an array.");
    }

    const positions = this.geometry.attributes.position
      ? Array.from(this.geometry.attributes.position.array)
      : [];
    const colors = this.geometry.attributes.color
      ? Array.from(this.geometry.attributes.color.array)
      : [];

    // 점 위치와 색상 추가
    for (let i = 0; i < pointArray.length; i += 4) {
      const [x, y, z, color] = [
        pointArray[i] || 0,
        pointArray[i + 1] || 0,
        pointArray[i + 2] || 0,
        pointArray[i + 3] || 0xffffff, // 기본 색상: 흰색
      ];

      // 위치 추가
      positions.push(x, y, z);

      // 색상 추가 (Hex -> RGB로 변환)
      const r = ((color >> 16) & 255) / 255; // Extract Red
      const g = ((color >> 8) & 255) / 255; // Extract Green
      const b = (color & 255) / 255; // Extract Blue
      colors.push(r, g, b);
    }

    // BufferGeometry의 position과 color 속성 업데이트
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  /**
   * 포인트 삭제 (인덱스 배열을 기반으로 삭제)
   * @param {Array} indices - 삭제할 포인트의 인덱스 배열
   */
  removePointsByIndices(indices) {
    if (!Array.isArray(indices)) {
      throw new Error("Indices must be provided as an array.");
    }

    const positions = Array.from(this.geometry.attributes.position.array);
    const colors = Array.from(this.geometry.attributes.color.array);

    // 중복 제거 및 내림차순 정렬 (인덱스 무효화 방지)
    const uniqueSortedIndices = [...new Set(indices)].sort((a, b) => b - a);

    uniqueSortedIndices.forEach((index) => {
      const startIdx = index * 3; // x, y, z (3개)
      if (startIdx < positions.length) {
        positions.splice(startIdx, 3); // position에서 삭제
        colors.splice(startIdx, 3); // color에서도 삭제
      }
    });

    // BufferGeometry 속성 갱신
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  /**
   * 포인트 개수 반환
   * @returns {JSON} 포인트 개수, 이름 등 전체적인 요약 정보
   */
  getSummary() {
    return {
      name: this.name,
      pointCount: this.geometry.attributes.position
        ? this.geometry.attributes.position.count
        : 0,
    };
  }

  /**
   * 포인트 클라우드 반환
   * @returns {THREE.Points} - Three.js Points 객체
   */
  getPoints() {
    return this.points;
  }

    /**
   * PCD의 visibility 설정
   * @param {boolean} isVisible - true: 보이기, false: 숨기기
   */
    setVisibility(isVisible) {
      this.visible = isVisible;
      this.points.visible = isVisible;
    }
}
