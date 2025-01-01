// src/domains/PCDFileReader.js
import PCD from "./PCD";

/**
 * 동일 이름 중복 시, "abc.pcd" -> "abc(1).pcd", "abc(2).pcd" ...
 */
function getUniqueFileName(originalName, existingFiles) {
  const baseName = originalName.replace(/\.pcd$/i, "");
  let newName = originalName;
  let counter = 1;
  while (existingFiles.some((f) => f.name === newName)) {
    newName = `${baseName}(${counter}).pcd`;
    counter++;
  }
  return newName;
}

export async function readPCDFile(file, loadedFiles) {
  if (!file || !file.name.toLowerCase().endsWith(".pcd")) {
    throw new Error("Invalid file: Please provide a valid .pcd file.");
  }

  // 중복 이름 처리
  const uniqueName = getUniqueFileName(file.name, loadedFiles);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const arrayBuffer = event.target.result;

      const decoder = new TextDecoder("utf-8");
      const content = decoder.decode(arrayBuffer);

      const headerEndIndex = content.indexOf("DATA binary");
      if (headerEndIndex === -1) {
        reject(new Error("Invalid PCD file: No binary DATA section found."));
        return;
      }

      const header = content.substring(0, headerEndIndex + 11);
      const lines = header.split("\n");

      let fieldNames = [];
      let fieldSizes = [];
      let pointCount = 0;

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

      const binaryDataOffset = headerEndIndex + 12;
      const binaryData = arrayBuffer.slice(binaryDataOffset);
      const dataView = new DataView(binaryData);

      const points = [];
      const pointSize = fieldSizes.reduce((acc, size) => acc + size, 0);

      let offset = 0;
      for (let i = 0; i < pointCount; i++) {
        let x = 0,
          y = 0,
          z = 0;
        let r = 255,
          g = 255,
          b = 255;

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
        points.push([x, y, z, (r << 16) | (g << 8) | b]);
      }

      const pcd = new PCD(uniqueName);
      pcd.addPoints(points);
      resolve({ pcd, fileName: uniqueName });
    };

    reader.onerror = () => {
      reject(new Error("Error reading the file."));
    };

    reader.readAsArrayBuffer(file);
  });
}
