import React, { useState } from "react";
import { readPCDFile } from "../../domains/PCDFileReader";

const PCDFileDropZone = ({ onFileLoad }) => {
  const [isDragging, setIsDragging] = useState(false);

  // 드래그 시작
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // 드래그 벗어남
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // 드래그 오버 (드롭 가능 상태 유지)
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // 파일 드롭
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.name.endsWith(".pcd")) {
        try {
          const pcd = await readPCDFile(file);
          onFileLoad(pcd); // 상위 컴포넌트에 로드된 PCD 객체 전달
        } catch (error) {
          console.error("Failed to read PCD file:", error);
        }
      } else {
        console.warn("Unsupported file:", file.name);
      }
    }
  };

  return (
    isDragging && (
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.7)", // 반투명 배경
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "1.5em",
          zIndex: 10, // 최상위 표시
          pointerEvents: "all", // 이벤트 전달
        }}
      >
        Drag & Drop PCD Files Here
      </div>
    )
  );
};

export default PCDFileDropZone;
