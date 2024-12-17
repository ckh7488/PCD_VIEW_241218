import React, { useRef, useEffect, useState } from "react";
import PCDViewer from "../../domains/PCDViewer";
import { readPCDFile } from "../../domains/PCDFileReader";
import PCDFileTree from "./PCDFileTree";

const PCDViewerContainer = () => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState([]); // PCD 파일 목록

  // 뷰어 로드
  useEffect(() => {
    viewerRef.current = new PCDViewer(containerRef.current);
    return () => viewerRef.current.dispose();
  }, []);

  // PCD 파일 로드 및 추가
  const handleFileLoad = async (fileObj) => {
    const pcd = await readPCDFile(fileObj);
    viewerRef.current.getEditor().addPCD(pcd.name, pcd);

    setLoadedFiles((prevFiles) => [
      ...prevFiles,
      { name: pcd.name, visible: true, pcd: pcd },
    ]);
  };

  // PCD 표시/숨기기 토글
  const toggleVisibility = (fileName) => {
    setLoadedFiles((prevFiles) =>
      prevFiles.map((file) => {
        if (file.name === fileName) {
          const isVisible = !file.visible;
          file.pcd.getPoints().visible = isVisible;
          return { ...file, visible: isVisible };
        }
        return file;
      })
    );
  };

  // PCD 파일 삭제
  const removeFile = (fileName) => {
    setLoadedFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
    viewerRef.current.getEditor().removePCD(fileName);
  };

  // 파일 선택 (추가: 원하는 동작 수행)
  const selectFile = (fileName) => {
    console.log(`Selected file: ${fileName}`);
  };

  // 드래그 상태 관리
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileLoad(file);
  };

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        height: "100vh",
        width: "100%",
      }}
      onDragEnter={handleDragEnter}
    >
      {/* Three.js Viewer */}
      <div
        ref={containerRef}
        style={{ flex: 1, backgroundColor: "#000" }}
      />

      {/* 오른쪽 파일 트리 */}
      <PCDFileTree
        files={loadedFiles}
        onToggleVisibility={toggleVisibility}
        onRemoveFile={removeFile}
        onSelectFile={selectFile}
      />

      {/* 드래그 앤 드롭 영역 */}
      {isDragging && (
        <div
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "1.5em",
            zIndex: 10,
          }}
        >
          Drag & Drop PCD Files Here
        </div>
      )}
    </div>
  );
};

export default PCDViewerContainer;
