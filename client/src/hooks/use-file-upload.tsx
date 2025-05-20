import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export type FileWithPreview = {
  file: File;
  preview: string | null;
  type: string;
  uploading?: boolean;
  progress?: number;
  url?: string;
  error?: string;
};

export type Attachment = {
  name: string;
  url: string;
  type: string;
  size: number;
};

export function useFileUpload(onComplete?: (attachments: Attachment[]) => void) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle file upload to server
  const uploadFiles = async (filesToUpload: FileWithPreview[]) => {
    if (filesToUpload.length === 0) return [];
    
    setUploading(true);
    setError(null);
    const uploadedAttachments: Attachment[] = [];
    const updatedFiles = [...files];

    try {
      // Process each file
      for (const fileWithPreview of filesToUpload) {
        const fileIndex = updatedFiles.findIndex(f => 
          f.file.name === fileWithPreview.file.name && 
          f.file.size === fileWithPreview.file.size
        );
        
        if (fileIndex === -1) continue;
        
        // Update file status to uploading
        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          uploading: true,
          progress: 0
        };
        setFiles([...updatedFiles]);
        
        // Create form data
        const formData = new FormData();
        formData.append("file", fileWithPreview.file);
        
        try {
          // Upload file to server
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            credentials: "include" // Important for auth cookies
          });
          
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }
          
          const attachment = await response.json();
          
          // Update file with complete status and URL
          updatedFiles[fileIndex] = {
            ...updatedFiles[fileIndex],
            uploading: false,
            progress: 100,
            url: attachment.url
          };
          
          uploadedAttachments.push({
            name: attachment.name,
            url: attachment.url,
            type: attachment.type,
            size: attachment.size
          });
        } catch (err) {
          console.error("Error uploading file:", err);
          
          // Update file with error status
          updatedFiles[fileIndex] = {
            ...updatedFiles[fileIndex],
            uploading: false,
            error: err instanceof Error ? err.message : "Upload failed"
          };
          
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${fileWithPreview.file.name}`,
            variant: "destructive"
          });
        }
        
        setFiles([...updatedFiles]);
      }
      
      // Call completion handler with all successfully uploaded attachments
      if (uploadedAttachments.length > 0 && onComplete) {
        onComplete(uploadedAttachments);
      }
      
      if (uploadedAttachments.length > 0) {
        toast({
          title: "Files Uploaded",
          description: `Successfully uploaded ${uploadedAttachments.length} ${
            uploadedAttachments.length === 1 ? "file" : "files"
          }`,
          variant: "default"
        });
      }
      
      return uploadedAttachments;
    } catch (err) {
      console.error("Upload process error:", err);
      setError("Failed to upload files");
      
      toast({
        title: "Upload Error",
        description: "There was a problem uploading your files",
        variant: "destructive"
      });
      
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleFilesSelected = (newFiles: FileWithPreview[]) => {
    setFiles(newFiles);
    uploadFiles(newFiles); // Auto-upload when files are selected
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    
    // If the file has a preview URL, revoke it to prevent memory leaks
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  // Get array of valid attachments from files
  const getAttachments = (): Attachment[] => {
    return files
      .filter(file => file.url && !file.error)
      .map(file => ({
        name: file.file.name,
        url: file.url!,
        type: file.type,
        size: file.file.size
      }));
  };

  return {
    files,
    uploading,
    error,
    handleFilesSelected,
    removeFile,
    getAttachments
  };
}