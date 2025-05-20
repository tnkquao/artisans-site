import React, { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, File, X, Image, FileText, FileArchive, Film, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  FileWithPreview, 
  Attachment, 
  useFileUpload 
} from "@/hooks/use-file-upload";

interface FileUploadProps {
  value?: FileWithPreview[];
  onChange?: (files: FileWithPreview[]) => void;
  onUploadComplete?: (attachments: Attachment[]) => void;
  maxFiles?: number;
  maxSize?: number; // in megabytes
  accept?: string;
  className?: string;
  maxHeight?: string;
  disabled?: boolean;
}

export function FileUpload({
  value = [],
  onChange,
  onUploadComplete,
  maxFiles = 5,
  maxSize = 10, // 10MB default
  accept = "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  className,
  maxHeight = "max-h-80",
  disabled = false,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { 
    files, 
    uploading, 
    error: uploadError, 
    handleFilesSelected,
    removeFile
  } = useFileUpload(onUploadComplete);

  const error = uploadError || localError;

  // Determine file icon based on MIME type
  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <Image className="h-6 w-6 text-blue-500" />;
    } else if (type.startsWith("video/")) {
      return <Film className="h-6 w-6 text-red-500" />;
    } else if (type.startsWith("audio/")) {
      return <Music className="h-6 w-6 text-purple-500" />;
    } else if (type.includes("pdf")) {
      return <FileText className="h-6 w-6 text-red-600" />;
    } else if (type.includes("zip") || type.includes("archive") || type.includes("compressed")) {
      return <FileArchive className="h-6 w-6 text-amber-600" />;
    } else if (type.includes("document") || type.includes("word")) {
      return <FileText className="h-6 w-6 text-blue-600" />;
    } else {
      return <File className="h-6 w-6 text-gray-600" />;
    }
  };

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!e.target.files || e.target.files.length === 0) return;
    
    processFiles(Array.from(e.target.files));
  };

  // Process files, validate, and generate previews
  const processFiles = (newFiles: File[]) => {
    // Check if adding new files would exceed the maximum
    if (files.length + newFiles.length > maxFiles) {
      setLocalError(`You can only upload a maximum of ${maxFiles} files.`);
      return;
    }

    // Process each file
    const processedFiles: FileWithPreview[] = [];
    
    newFiles.forEach(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        setLocalError(`File "${file.name}" exceeds the maximum size of ${maxSize}MB.`);
        return;
      }

      // Create preview URL for images
      let preview: string | null = null;
      if (file.type.startsWith("image/")) {
        preview = URL.createObjectURL(file);
      }

      processedFiles.push({
        file,
        preview,
        type: file.type,
      });
    });

    // Pass to file upload hook
    handleFilesSelected(processedFiles);
    
    // Also call onChange if provided
    if (onChange) {
      onChange([...files, ...processedFiles]);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Handle file removal with callback
  const handleRemoveFile = (index: number) => {
    removeFile(index);
    
    if (onChange) {
      const newFiles = [...files];
      newFiles.splice(index, 1);
      onChange(newFiles);
    }
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Drag and drop area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={!disabled ? handleDrop : undefined}
      >
        <div className="flex flex-col items-center justify-center text-sm">
          <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
          <p className="font-medium">
            Drag and drop files here or click to browse
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Supported file types: Images, PDFs, and documents
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Max {maxFiles} files, up to {maxSize}MB each
          </p>
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </div>
      
      {/* Error message */}
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      {/* Files preview */}
      {files.length > 0 && (
        <div className={cn("mt-4 overflow-y-auto border rounded-lg", maxHeight)}>
          <ul className="divide-y">
            {files.map((file, index) => (
              <li key={index} className="p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  {file.preview ? (
                    <div className="h-12 w-12 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                      <img 
                        src={file.preview} 
                        alt={file.file.name}
                        className="h-full w-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    
                    {/* Progress bar for uploading */}
                    {file.uploading && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-primary h-1.5 rounded-full" 
                          style={{ width: `${file.progress || 0}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full text-gray-500 hover:text-red-500"
                  onClick={() => handleRemoveFile(index)}
                  disabled={file.uploading || disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}