/**
 * DragDropZone — reusable drag-and-drop file upload area.
 *
 * Handles:
 *   - Drag-over visual feedback
 *   - File type validation (MIME types)
 *   - File size validation
 *   - Click-to-browse fallback
 *   - Keyboard accessible (Enter/Space triggers file input)
 *   - Multiple file selection
 *
 * Usage:
 *   <DragDropZone onFiles={(files) => handleUpload(files)} />
 */

import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml';
const ACCEPTED_LABEL = 'JPEG, PNG, WebP, GIF, AVIF, SVG';
const MAX_SIZE = 10 * 1024 * 1024;

interface Props {
  onFiles:    (files: File[]) => void;
  className?: string;
  compact?:   boolean;
  disabled?:  boolean;
}

interface DragState {
  isDragging: boolean;
  dragCounter: number;
}

export default function DragDropZone({ onFiles, className = '', compact = false, disabled = false }: Props) {
  const inputRef                       = useRef<HTMLInputElement>(null);
  const [dragState, setDragState]       = useState<DragState>({ isDragging: false, dragCounter: 0 });
  const [dragError,  setDragError]       = useState<string | null>(null);

  const validateAndPass = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setDragError(null);

    const files: File[] = [];
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: not an image file`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: exceeds 10 MB limit`);
        continue;
      }
      files.push(file);
    }

    if (errors.length > 0) {
      setDragError(errors.join('; '));
    }

    if (files.length > 0) {
      onFiles(files);
    }
  }, [onFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragState((prev) => ({ isDragging: true, dragCounter: prev.dragCounter + 1 }));
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState((prev) => {
      const counter = prev.dragCounter - 1;
      return { isDragging: counter === 0, dragCounter: counter };
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ isDragging: false, dragCounter: 0 });
    if (disabled) return;
    validateAndPass(e.dataTransfer.files);
  }, [validateAndPass, disabled]);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  if (compact) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload images — click or drag files here"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition
            ${dragState.isDragging
              ? 'border-[#1B365D] bg-[#1B365D]/5'
              : 'border-[#DDE3EA] bg-white hover:border-[#4A777A] hover:bg-[#F4F6F8]'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
        >
          <UploadCloud className={`w-5 h-5 ${dragState.isDragging ? 'text-[#1B365D]' : 'text-[#5F6E80]'}`} />
          <div className="text-sm">
            <span className="font-medium text-[#1A2B40]">Drop images here or click to browse</span>
            <span className="text-xs text-[#5F6E80] ml-2">Max 10 MB · {ACCEPTED_LABEL}</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME}
            multiple
            className="hidden"
            onChange={(e) => { validateAndPass(e.target.files); if (inputRef.current) inputRef.current.value = ''; }}
          />
        </div>
        {dragError && <p className="text-xs text-[#C0392B] mt-1">{dragError}</p>}
      </>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload images — click or drag files here"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-3 px-6 py-12 rounded-xl border-2 border-dashed cursor-pointer transition
          ${dragState.isDragging
            ? 'border-[#1B365D] bg-[#1B365D]/5 scale-[1.01]'
            : 'border-[#DDE3EA] bg-white hover:border-[#4A777A] hover:bg-[#F4F6F8]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dragState.isDragging ? 'bg-[#1B365D]' : 'bg-[#F4F6F8]'}`}>
          {dragState.isDragging
            ? <UploadCloud className="w-6 h-6 text-white" />
            : <ImageIcon className="w-6 h-6 text-[#5F6E80]" />
          }
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#1A2B40]">
            {dragState.isDragging ? 'Drop to upload' : 'Drag images here or click to browse'}
          </p>
          <p className="text-xs text-[#5F6E80] mt-1">
            {ACCEPTED_LABEL} · max 10 MB per file
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME}
          multiple
          className="hidden"
          onChange={(e) => { validateAndPass(e.target.files); if (inputRef.current) inputRef.current.value = ''; }}
        />
      </div>
      {dragError && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          {dragError}
        </div>
      )}
    </>
  );
}
