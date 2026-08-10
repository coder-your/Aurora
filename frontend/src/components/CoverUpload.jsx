import React, { useMemo, useRef } from "react";

export default function CoverUpload({
  coverFile: _coverFile,
  setCoverFile,
  preview,
  setPreview,
}) {
  const inputRef = useRef(null);

  const Icon = useMemo(() => {
    // Simple inline “warm” book/image frame icon.
    return (
      <svg
        width="44"
        height="44"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10.5 12.5C10.5 11.3954 11.3954 10.5 12.5 10.5H29C31.2091 10.5 33 12.2909 33 14.5V33.5C33 34.6046 32.1046 35.5 31 35.5H12.5C11.3954 35.5 10.5 34.6046 10.5 33.5V12.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M33 14.5H35.5C37.7091 14.5 39.5 16.2909 39.5 18.5V34.5C39.5 35.6046 38.6046 36.5 37.5 36.5H31"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M15.5 16.5H24.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M15.5 22.5H22.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) return;

    setCoverFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  };

  return (
    <div
      className="coverDropZone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      style={{ cursor: "pointer" }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div className="coverDropContent">
        {preview ? (
          <img className="coverDropPreview" src={preview} alt="Cover Preview" />
        ) : (
          <>
            <div className="coverDropIcon">{Icon}</div>
            <div className="coverDropText">
              Drop a custom story cover here, or click to browse files...
            </div>
          </>
        )}
      </div>
    </div>
  );
}

