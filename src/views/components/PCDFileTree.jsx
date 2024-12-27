import React from "react";

const PCDFileTree = ({ files, selectedFiles, onSelectFile }) => {
    const handleClick = (fileName, event) => {
        const isMultiSelect = event.shiftKey; // Shift 키로 다중 선택
        onSelectFile(fileName, isMultiSelect);
    };

    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "250px",
                height: "100%",
                backgroundColor: "#222",
                color: "#fff",
                padding: "10px",
                overflowY: "auto",
                zIndex: 5,
            }}
        >
            <h3 style={{ borderBottom: "1px solid #555", paddingBottom: "5px" }}>Loaded PCD Files</h3>
            {files.map((file) => (
                <div
                    key={file.name}
                    onClick={(event) => handleClick(file.name, event)}
                    style={{
                        padding: "5px",
                        margin: "5px 0",
                        backgroundColor: selectedFiles.includes(file.name) ? "#444" : "transparent",
                        cursor: "pointer",
                    }}
                >
                    {file.name}
                </div>
            ))}
        </div>
    );
};

export default PCDFileTree;
