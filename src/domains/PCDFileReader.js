import PCD from "./PCD";

/**
 * PCD 파일을 읽어와 PCD 클래스 객체로 변환
 * @param {File} file - .pcd 파일 (File 객체)
 * @returns {Promise<PCD>} - PCD 객체를 반환
 */
export async function readPCDFile(file) {
  if (!file || !file.name.endsWith(".pcd")) {
    throw new Error("Invalid file: Please provide a valid .pcd file.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // 파일 읽기 완료 이벤트
    reader.onload = (event) => {
      const arrayBuffer = event.target.result;

      // TextDecoder를 사용해 헤더만 추출
      const decoder = new TextDecoder("utf-8");
      const content = decoder.decode(arrayBuffer);

      const headerEndIndex = content.indexOf("DATA binary");
      if (headerEndIndex === -1) {
        reject(new Error("Invalid PCD file: No binary DATA section found."));
        return;
      }

      const header = content.substring(0, headerEndIndex + 11); // "DATA binary" 포함
      const lines = header.split("\n");

      let fieldNames = [];
      let fieldSizes = [];
      let pointCount = 0;

      // 헤더 파싱
      lines.forEach((line) => {
        const tokens = line.trim().split(" ");
        const key = tokens[0];

        switch (key) {
          case "FIELDS":
            fieldNames = tokens.slice(1);
            break;
          case "SIZE":
            fieldSizes = tokens.slice(1).map(Number);
            break;
          case "WIDTH":
            pointCount = Number(tokens[1]);
            break;
          case "HEIGHT":
            pointCount *= Number(tokens[1]);
            break;
          default:
            break;
        }
      });

      // 바이너리 데이터 시작 위치 계산
      const binaryDataOffset = headerEndIndex + 12; // DATA binary 다음의 데이터 시작점
      const binaryData = arrayBuffer.slice(binaryDataOffset);
      const dataView = new DataView(binaryData);

      const points = [];
      const pointSize = fieldSizes.reduce((acc, size) => acc + size, 0);

      let offset = 0;
      for (let i = 0; i < pointCount; i++) {
        let x = 0, y = 0, z = 0;
        let r = 255, g = 255, b = 255; // 기본 색상 (흰색)

        for (let j = 0; j < fieldNames.length; j++) {
          const field = fieldNames[j];

          switch (field) {
            case "x":
              x = dataView.getFloat32(offset, true);
              break;
            case "y":
              y = dataView.getFloat32(offset, true);
              break;
            case "z":
              z = dataView.getFloat32(offset, true);
              break;
            case "rgb":
              const rgbFloat = dataView.getFloat32(offset, true);
              const intRGB = new Uint32Array([rgbFloat])[0];
              r = (intRGB >> 16) & 0xff;
              g = (intRGB >> 8) & 0xff;
              b = intRGB & 0xff;
              break;
            default:
              break;
          }
          offset += fieldSizes[j];
        }

        points.push(x, y, z, (r << 16) | (g << 8) | b);
      }

      // PCD 객체 생성 및 반환
      const pcd = new PCD(file.name);
      pcd.addPoints(points);
      resolve(pcd);
    };

    // 파일 읽기 오류 이벤트
    reader.onerror = () => {
      reject(new Error("Error reading the file."));
    };

    // 파일 읽기 시작
    reader.readAsArrayBuffer(file);
  });
}
