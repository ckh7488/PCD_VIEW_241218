import React, { useRef, useEffect, useState } from "react";
import PCDViewer from "../../domains/PCDViewer";
import { readPCDFile } from "../../domains/PCDFileReader";
import PCDFileTree from "./PCDFileTree";

const PCDViewerContainer = () => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState([]); 
  const [selectedFileName, setSelectedFileName] = useState(null);

  useEffect(() => {
    viewerRef.current = new PCDViewer(containerRef.current);
    viewerRef.current.onFileSelect((name) => {
      setSelectedFileName(name);
    });

    return () => viewerRef.current.dispose();
  }, []);

  const handleFileLoad = async (fileObj) => {
    const pcd = await readPCDFile(fileObj);

    // 중복 이름 확인 및 고유 이름 생성
    let uniqueName = pcd.name;
    let counter = 1;

    setLoadedFiles((prevFiles) => {
        const existingNames = prevFiles.map((file) => file.name);

        while (existingNames.includes(uniqueName)) {
            uniqueName = `${pcd.name} (${++counter})`;
        }

        // PCD 객체에 고유 이름을 설정
        pcd.name = uniqueName;

        // Viewer와 상태 업데이트
        viewerRef.current.getEditor().addPCD(uniqueName, pcd, viewerRef.current);

        return [
            ...prevFiles,
            { name: uniqueName, visible: true, pcd: pcd },
        ];
    });
};


  const toggleVisibility = (fileName) => {
    setLoadedFiles((prevFiles) =>
      prevFiles.map((file) => {
        if (file.name === fileName) {
          const isVisible = !file.visible;
          file.pcd.setVisibility(isVisible);
          return { ...file, visible: isVisible };
        }
        return file;
      })
    );
  };

  const removeFile = (fileName) => {
    setLoadedFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
    viewerRef.current.getEditor().removePCD(fileName);
    if (selectedFileName === fileName) {
      setSelectedFileName(null);
      viewerRef.current.onPCDDeselected();
    }
  };

  const selectFile = (fileName) => {
    setSelectedFileName(fileName);
    viewerRef.current.getEditor().selectPCD(fileName);
    viewerRef.current.onPCDSelected(fileName);
  };

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
      <div
        ref={containerRef}
        style={{ flex: 1, backgroundColor: "#000" }}
      />

      <PCDFileTree
        files={loadedFiles}
        onToggleVisibility={toggleVisibility}
        onRemoveFile={removeFile}
        onSelectFile={selectFile}
        selectedFileName={selectedFileName}
      />

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
