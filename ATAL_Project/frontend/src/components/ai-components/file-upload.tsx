"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

interface FileUploadContextValue {
  open: boolean;
  dragging: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  handleClick: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}

const FileUploadContext = createContext<FileUploadContextValue | null>(null);

function useFileUpload() {
  const ctx = useContext(FileUploadContext);
  if (!ctx) throw new Error("FileUpload sub-components must be used within FileUpload");
  return ctx;
}

interface FileUploadProps {
  children: React.ReactNode;
  onFilesAdded?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

function FileUpload({
  children,
  onFilesAdded,
  accept,
  multiple = true,
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const processFiles = useCallback(
    (fileList: FileList) => {
      const files = Array.from(fileList);
      onFilesAdded?.(files);
    },
    [onFilesAdded]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      setDragging(true);
      setOpen(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
      setOpen(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragging(false);
      setOpen(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      e.target.value = "";
    },
    [processFiles]
  );

  return (
    <FileUploadContext.Provider
      value={{
        open,
        dragging,
        triggerRef,
        handleClick,
        handleDragOver,
        handleDragLeave,
        handleDrop,
      }}
    >
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative"
      >
        {children}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </FileUploadContext.Provider>
  );
}

interface FileUploadTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

function FileUploadTrigger({ children, asChild }: FileUploadTriggerProps) {
  const { handleClick } = useFileUpload();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

interface FileUploadContentProps {
  children: React.ReactNode;
}

function FileUploadContent({ children }: FileUploadContentProps) {
  const { open } = useFileUpload();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="file-upload-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-white/90"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { FileUpload, FileUploadTrigger, FileUploadContent };
