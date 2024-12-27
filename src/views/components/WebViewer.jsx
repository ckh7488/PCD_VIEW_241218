import React, { useRef, useEffect, useState } from "react";
import { WebController } from "../../domains/WebController";
import { readPCDFile } from "../../domains/PCDFileReader";
import PCDFileTree from "./PCDFileTree";

const WebViewer = () => {
    const containerRef = useRef(null);
    const controllerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loadedFiles, setLoadedFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [transformationMode, setTransformationMode] = useState(null);
    const dragCounter = useRef(0);

    useEffect(() => {
        if (containerRef.current) {
            const controller = new WebController(containerRef.current);
            controller.init("orbit");
            controllerRef.current = controller;

            /**
             * 키보드 이벤트
             * - g, s, r: blender 처럼 transform mode 진입
             * - ESC: transform 취소 및 선택 해제
             */
            const handleKeyDown = (event) => {
                const currentMode = controller.getTransformationMode();
                // 이미 transformation 중이면 무시
                // (원한다면 중복 시작 가능하도록 바꿀 수도 있음)
                if (currentMode) return;

                switch (event.key.toLowerCase()) {
                    case "g":
                        if (!controller.startTransformation("translate")) break;
                        setTransformationMode("translate");
                        break;
                    case "s":
                        if (!controller.startTransformation("scale")) break;
                        setTransformationMode("scale");
                        break;
                    case "r":
                        if (!controller.startTransformation("rotate")) break;
                        setTransformationMode("rotate");
                        break;
                    case "escape":
                        // 취소 로직
                        controller.cancelTransformation();
                        setTransformationMode(null);
                        controller.clearSelection();
                        setSelectedFiles([]);
                        break;
                    default:
                        break;
                }
            };

            /**
             * 키보드 up 이벤트
             * - ESC 누르면 취소하는 로직을 중복으로 막고 싶다면 여기서도 체크 가능
             */
            const handleKeyUp = (event) => {
                // 예시: ESC가 눌려 있으면 transform 취소
                if (controller.getTransformationMode() && event.key.toLowerCase() === "escape") {
                    controller.cancelTransformation();
                    setTransformationMode(null);
                }
            };

            window.addEventListener("keydown", handleKeyDown);
            window.addEventListener("keyup", handleKeyUp);

            return () => {
                window.removeEventListener("keydown", handleKeyDown);
                window.removeEventListener("keyup", handleKeyUp);
                controller.dispose();
            };
        }
    }, []);

    /**
     * 마우스 드래그 & 드롭 관련
     */
    const handleDragEnter = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragCounter.current += 1;
        setIsDragging(true);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        const files = Array.from(event.dataTransfer.files);
        const pcdFiles = files.filter((file) => file.name.toLowerCase().endsWith(".pcd"));

        for (const file of pcdFiles) {
            try {
                // 중복 파일 로드 방지
                const fileExists = loadedFiles.some((f) => f.name === file.name);
                if (fileExists) {
                    console.warn(`File ${file.name} is already loaded.`);
                    continue;
                }

                const pcd = await readPCDFile(file);
                controllerRef.current.addPCD(file.name, pcd);
                setLoadedFiles((prevFiles) => [...prevFiles, { name: file.name, pcd }]);
            } catch (error) {
                console.error("Failed to read PCD file:", error);
            }
        }
    };

    /**
     * 캔버스 클릭 시 PCD 선택
     */
    const handleCanvasClick = (event) => {
        if (!controllerRef.current) return;

        // shift 클릭 시 멀티 선택
        const isMultiSelect = event.shiftKey;
        // 이 예시에선 exclusiveSelect는 따로 처리하지 않아 기본 false
        controllerRef.current.handlePCDSelection(event, isMultiSelect, false);

        // 선택 목록 동기화
        const selectedNames = Array.from(controllerRef.current.selectedPCDs);
        setSelectedFiles(selectedNames);
    };

    /**
     * PCDFileTree(좌측 트리)에서 파일 선택 시
     */
    const handleFileTreeSelect = (fileName, isMultiSelect) => {
        // 멀티 선택 vs 단일 선택
        let updatedSelectedFiles = [];
        if (isMultiSelect) {
            updatedSelectedFiles = selectedFiles.includes(fileName)
                ? selectedFiles.filter((name) => name !== fileName)
                : [...selectedFiles, fileName];
        } else {
            updatedSelectedFiles = [fileName];
        }

        setSelectedFiles(updatedSelectedFiles);

        // 컨트롤러 쪽에서도 하이라이트 토글
        controllerRef.current.clearSelection();
        updatedSelectedFiles.forEach((name) => {
            const file = loadedFiles.find((f) => f.name === name);
            if (file) {
                // toggleSelection(name, points, isMultiSelect=true, isExclusiveSelect=false)
                controllerRef.current.toggleSelection(name, file.pcd.getPoints(), true, false);
            }
        });
    };

    return (
        <div style={{ display: "flex", position: "relative", height: "100vh", width: "100%" }}>
            {/* 
                메인 뷰 영역
                마우스 이벤트를 WebController로 전달하기 위해 onMouseDown, onMouseMove, onMouseUp 추가
            */}
            <div
                ref={containerRef}
                style={{ flex: 1, backgroundColor: "#000" }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
                onClick={handleCanvasClick}
                onMouseDown={(e) => controllerRef.current?.handleMouseDown(e)}
                onMouseMove={(e) => controllerRef.current?.handleMouseMove(e)}
                onMouseUp={() => controllerRef.current?.handleMouseUp(setTransformationMode)}
            >
                {isDragging && (
                    <div
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
                        Drag and Drop PCD Files Here
                    </div>
                )}
                {transformationMode && (
                    <div
                        style={{
                            position: "absolute",
                            top: "10px",
                            left: "10px",
                            padding: "5px 10px",
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            color: "#fff",
                            borderRadius: "5px",
                            zIndex: 10,
                        }}
                    >
                        {`Transformation Mode: ${transformationMode.toUpperCase()}`}
                    </div>
                )}
            </div>

            {/* 좌측 트리 뷰 (파일 목록) */}
            <PCDFileTree
                files={loadedFiles}
                selectedFiles={selectedFiles}
                onSelectFile={handleFileTreeSelect}
            />
        </div>
    );
};

export default WebViewer;
