import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, AlertCircle, Camera, Video, FileVideo, Image, CheckCircle2 } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface IOSImageUploaderProps {
  projectId: number;
  onSuccess?: () => void;
}

export function IOSImageUploader({ projectId, onSuccess }: IOSImageUploaderProps) {
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"image" | "video">("image");
  const [hasSelectedFile, setHasSelectedFile] = useState(false);

  // Reset state on mount
  useEffect(() => {
    setUploadError("");
    setSelectedFile(null);
    setHasSelectedFile(false);
  }, []);

  // Auto-upload when a file is selected
  useEffect(() => {
    if (selectedFile && !isUploading) {
      handleUpload();
    }
  }, [selectedFile, isUploading]);

  // Handle file change for any type of file
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      console.log('File selected:', file.name, file.type);
      
      // Validate file type
      if (!isImage && !isVideo) {
        setUploadError("Please select an image or video file");
        toast({
          title: "Invalid file",
          description: "Please select an image or video file",
          variant: "destructive",
        });
        setSelectedFile(null);
        setHasSelectedFile(false);
        return;
      }
      
      // Set file type
      setFileType(isImage ? "image" : "video");
      
      // Validate file size (15MB max for videos, 5MB max for images)
      const maxSize = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError(`File too large (max ${isVideo ? '15MB' : '5MB'})`);
        toast({
          title: "File too large",
          description: `${isVideo ? 'Video' : 'Image'} must be less than ${isVideo ? '15MB' : '5MB'}`,
          variant: "destructive",
        });
        setSelectedFile(null);
        setHasSelectedFile(false);
        return;
      }
      
      // Store the selected file
      setSelectedFile(file);
      setHasSelectedFile(true);
      
      // Show preparing toast
      toast({
        title: `${isVideo ? 'Video' : 'Image'} selected`,
        description: "Preparing to upload...",
        duration: 2000,
      });
      
      // Upload will happen automatically through useEffect
    }
  }
  
  // Handle the actual upload process
  function handleUpload() {
    if (!selectedFile) {
      return;
    }
    
    console.log(`Starting iOS-specific upload for ${fileType}:`, selectedFile.name);
    
    // Show user we're uploading
    toast({
      title: `Uploading ${fileType}...`,
      description: "Please wait while we upload your file",
      duration: 3000,
    });
    
    // Create form data for submission
    const formData = new FormData();
    formData.append(fileType, selectedFile);
    
    // Start upload
    setIsUploading(true);
    setUploadError("");
    
    // Endpoint URL based on file type
    const endpoint = fileType === "video" 
      ? `/api/projects/${projectId}/video-upload` 
      : `/api/projects/${projectId}/mobile-upload`;
    
    fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })
    .then(response => {
      console.log('iOS upload response:', response.status);
      if (!response.ok) return response.text().then(text => Promise.reject(text));
      return response.json();
    })
    .then(data => {
      console.log('iOS upload successful:', data);
      // Refresh project data to immediately show new media
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      
      // Also refresh any specific media endpoints
      if (fileType === "video") {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/videos`] });
      } else {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/images`] });
      }
      
      toast({
        title: "Upload complete!",
        description: `Your ${fileType} has been added to the project gallery.`
      });
      
      if (onSuccess) onSuccess();
      
      // Clear the file inputs and state
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
      setSelectedFile(null);
      setHasSelectedFile(false);
    })
    .catch(error => {
      console.error('iOS upload failed:', error);
      setUploadError(typeof error === 'string' ? error : `Upload failed`);
      toast({
        title: "Upload failed",
        description: typeof error === 'string' ? error : `Could not upload ${fileType}`,
        variant: "destructive"
      });
      setSelectedFile(null);
      setHasSelectedFile(false);
    })
    .finally(() => {
      setIsUploading(false);
    });
  }

  // Handle form submission (for manual upload button if needed)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleUpload();
  }

  return (
    <div className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <Upload className="mr-2 h-5 w-5 text-green-600" />
        iOS Media Uploader
      </h3>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            {/* Hidden inputs for file selection */}
            <input
              type="file"
              ref={imageInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              name="image"
            />
            
            <input
              type="file"
              ref={videoInputRef}
              className="hidden"
              accept="video/*"
              onChange={handleFileChange}
              name="video"
            />
            
            <div className="flex flex-col space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Photos:</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  className="bg-white hover:bg-gray-50"
                  onClick={() => {
                    // Create a new file input specifically for photo library
                    const tempInput = document.createElement('input');
                    tempInput.type = 'file';
                    tempInput.accept = 'image/*';
                    tempInput.onchange = (e) => {
                      if (imageInputRef.current && tempInput.files && tempInput.files.length > 0) {
                        // Create a DataTransfer object to transfer the file
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(tempInput.files[0]);
                        
                        // Set the file to our main file input
                        imageInputRef.current.files = dataTransfer.files;
                        
                        // Trigger the change event manually
                        const event = new Event('change', { bubbles: true });
                        imageInputRef.current.dispatchEvent(event);
                      }
                    };
                    tempInput.click();
                  }}
                  disabled={isUploading}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Photo Library
                </Button>
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="bg-white hover:bg-gray-50"
                  onClick={() => {
                    // Create a new file input specifically for camera
                    const tempInput = document.createElement('input');
                    tempInput.type = 'file';
                    tempInput.accept = 'image/*';
                    tempInput.capture = 'environment';
                    tempInput.onchange = (e) => {
                      if (imageInputRef.current && tempInput.files && tempInput.files.length > 0) {
                        // Create a DataTransfer object to transfer the file
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(tempInput.files[0]);
                        
                        // Set the file to our main file input
                        imageInputRef.current.files = dataTransfer.files;
                        
                        // Trigger the change event manually
                        const event = new Event('change', { bubbles: true });
                        imageInputRef.current.dispatchEvent(event);
                      }
                    };
                    tempInput.click();
                  }}
                  disabled={isUploading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              </div>
              
              <h4 className="text-sm font-medium text-gray-700 mt-2">Videos:</h4>
              <Button 
                type="button"
                variant="outline" 
                className="w-full bg-white hover:bg-gray-50"
                onClick={() => {
                  // Create a new file input specifically for videos
                  const tempInput = document.createElement('input');
                  tempInput.type = 'file';
                  tempInput.accept = 'video/*';
                  tempInput.onchange = (e) => {
                    if (videoInputRef.current && tempInput.files && tempInput.files.length > 0) {
                      // Create a DataTransfer object to transfer the file
                      const dataTransfer = new DataTransfer();
                      dataTransfer.items.add(tempInput.files[0]);
                      
                      // Set the file to our main file input
                      videoInputRef.current.files = dataTransfer.files;
                      
                      // Trigger the change event manually
                      const event = new Event('change', { bubbles: true });
                      videoInputRef.current.dispatchEvent(event);
                    }
                  };
                  tempInput.click();
                }}
                disabled={isUploading}
              >
                <FileVideo className="h-4 w-4 mr-2" />
                Record or Select Video
              </Button>
              
              {/* Status feedback when file is selected or uploading */}
              {hasSelectedFile && !isUploading && (
                <div className="w-full bg-green-50 text-green-800 p-3 rounded-md border border-green-200 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                  <span>
                    {fileType.charAt(0).toUpperCase() + fileType.slice(1)} selected! Uploading automatically...
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {uploadError && (
            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {uploadError}
            </div>
          )}
          
          {isUploading && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded flex items-center">
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
              Uploading {fileType}... Please wait and don't close this page.
            </div>
          )}
        </div>
      </form>
    </div>
  );
}