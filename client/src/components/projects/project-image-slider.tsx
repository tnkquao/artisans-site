import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Upload, Camera, AlertCircle, Image, Star, Trash2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { ImageViewer } from "@/components/ui/image-viewer";

/**
 * Normalizes image URLs to ensure they work correctly regardless of how they were generated
 * Enhanced to handle more URL formats and better logging
 * @param url The original image URL from the server
 * @returns A normalized URL that will work in the current environment
 */
function normalizeImageUrl(url: string): string {
  if (!url) {
    console.warn("Empty URL provided to normalizeImageUrl");
    return '';
  }
  
  console.log("Normalizing image URL:", url);
  
  // If it's already a relative URL starting with /uploads, just use it as is
  if (url.startsWith('/uploads/')) {
    console.log("URL is already in correct format:", url);
    return url;
  }
  
  // Handle full URLs with domain in various formats
  if (url.includes('/uploads/')) {
    // Extract the UUID filename after /uploads/
    const filenameMatch = url.match(/\/uploads\/([a-zA-Z0-9-]+\.[a-zA-Z0-9]+)/);
    if (filenameMatch && filenameMatch[1]) {
      const normalizedUrl = `/uploads/${filenameMatch[1]}`;
      console.log("Normalized URL from full path:", normalizedUrl);
      return normalizedUrl;
    }
  }
  
  // Try to extract the filename if it contains a URL parameter
  if (url.includes('?')) {
    const urlWithoutParams = url.split('?')[0];
    // Now extract just the filename
    const filenameMatch = urlWithoutParams.match(/\/([^\/]+)$/);
    if (filenameMatch && filenameMatch[1]) {
      const normalizedUrl = `/uploads/${filenameMatch[1]}`;
      console.log("Normalized URL from URL with parameters:", normalizedUrl);
      return normalizedUrl;
    }
  }
  
  // Simple regex approach to extract the filename from the URL path
  // First try to match anything after /uploads/, then fall back to the last segment of any URL
  const filenameMatch = url.match(/\/uploads\/([^/?#]+)/) || url.match(/\/([^\/]+)$/);
  
  if (filenameMatch && filenameMatch[1]) {
    // We found a filename, use it with the uploads path
    const normalizedUrl = `/uploads/${filenameMatch[1]}`;
    console.log("Normalized URL using regex:", normalizedUrl);
    return normalizedUrl;
  }
  
  // If it's a full URL, try to use it directly
  try {
    const urlObject = new URL(url);
    if (urlObject && urlObject.pathname) {
      // Get the last part of the pathname
      const pathParts = urlObject.pathname.split('/');
      const filename = pathParts[pathParts.length - 1];
      if (filename) {
        const normalizedUrl = `/uploads/${filename}`;
        console.log("Normalized URL from full URL object:", normalizedUrl);
        return normalizedUrl;
      }
    }
  } catch (e) {
    // Not a valid URL, continue with other methods
  }
  
  // If all else fails, return the original URL and log a warning
  console.warn("Could not normalize URL, using original:", url);
  return url;
}

interface ImageData {
  url: string;
  id?: number;
  name?: string;
  mimeType?: string;
  uploadedBy?: {
    userId: number;
    username: string;
    role: string;
  };
  uploadedAt?: string;
}

interface ProjectImageSliderProps {
  images: ImageData[];
  projectId: number;
  canEdit?: boolean;
  showControls?: boolean;
  onUploadComplete?: () => void;
  className?: string;
  aspectRatio?: "square" | "video" | "wide" | "portrait";
  height?: string;
  showUpload?: boolean;
  project?: any; // Project data for knowing which image is the main image
}

export function ProjectImageSlider({
  images = [],
  projectId,
  canEdit = false,
  showControls = true,
  onUploadComplete,
  className = "",
  aspectRatio = "video",
  height = "h-48 sm:h-64",
  showUpload = true,
  project,
}: ProjectImageSliderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Authentication state
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  
  // Set aspect ratio class based on prop
  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video", 
    wide: "aspect-[16/9]",
    portrait: "aspect-[3/4]"
  }[aspectRatio];

  // Reset current index when images array changes
  useEffect(() => {
    if (images.length > 0 && currentIndex >= images.length) {
      setCurrentIndex(0);
    }
  }, [images, currentIndex]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sliderRef.current && sliderRef.current.contains(document.activeElement)) {
        if (e.key === 'ArrowLeft') {
          goToPrevious();
        } else if (e.key === 'ArrowRight') {
          goToNext();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length]);

  // For empty state
  if (images.length === 0) {
    return (
      <div 
        className={cn(
          "relative w-full flex items-center justify-center overflow-hidden rounded-lg bg-gray-100",
          aspectRatioClass,
          height,
          className
        )}
      >
        {canEdit && showUpload ? (
          <div className="text-center p-4">
            <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-3">No images available</p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No images available</p>
          </div>
        )}
      </div>
    );
  }

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadError("");
      
      console.log(`Starting upload for file: ${file.name}, size: ${file.size}, type: ${file.type}`);
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('mimeType', file.type);
      
      try {
        // Detect iOS device specifically for endpoint selection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const endpoint = isIOS ? `/api/projects/${projectId}/mobile-upload` : `/api/projects/${projectId}/images`;
        
        console.log(`Submitting FormData to ${endpoint} (iOS: ${isIOS})`);
        
        // Create manually controlled fetch for better debugging
        const res = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          body: formData,
          // Don't set Content-Type header, let browser set it with boundary
        });
        
        console.log(`Upload response status: ${res.status}`);
        
        // Check for unauthorized response
        if (res.status === 401) {
          throw new Error("Authentication required. Please log in and try again.");
        }
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Upload failed with status ${res.status}: ${errorText}`);
          throw new Error(`Upload failed: ${errorText || res.statusText}`);
        }
        
        const data = await res.json();
        console.log(`Upload succeeded:`, data);
        return data;
      } catch (error: any) {
        console.error(`Upload error:`, error);
        
        // Check if it's an authentication error and handle specially
        if (error.message?.includes('401') || 
            error.message?.toLowerCase()?.includes('authentication') || 
            error.message?.toLowerCase()?.includes('unauthorized')) {
          
          // Check localStorage to see if user thinks they're logged in
          const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
          
          if (isLoggedIn) {
            // User thinks they're logged in but server disagrees - session may be expired
            localStorage.removeItem("isLoggedIn"); // Clear stale login state
            setUploadError("Your session has expired. Please log in again.");
            
            // Show login dialog instead of redirect
            setIsAuthDialogOpen(true);
          } else {
            setUploadError("Please log in to upload images.");
            setIsAuthDialogOpen(true);
          }
        } else {
          setUploadError(error.message || "Failed to upload image");
        }
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      // Invalidate project query to refresh images
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      
      toast({
        title: "Image uploaded",
        description: "Project image has been uploaded successfully.",
      });
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    },
    onError: (error: Error) => {
      // Only show error toast if it's not an authentication error 
      // (those are handled separately with better UX in the mutation function)
      if (!error.message?.toLowerCase().includes('authentication') && 
          !error.message?.toLowerCase().includes('log in')) {
        
        setUploadError(error.message);
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
  
  // Set main image mutation
  const setMainImageMutation = useMutation({
    mutationFn: async (imageIndex: number) => {
      try {
        const response = await apiRequest("PUT", `/api/projects/${projectId}/main-image`, { imageIndex });
        
        // Check for unauthorized response
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in and try again.");
        }
        
        return response;
      } catch (error: any) {
        // Check if it's an authentication error and handle specially
        if (error.message?.includes('401') || 
            error.message?.toLowerCase()?.includes('authentication') || 
            error.message?.toLowerCase()?.includes('unauthorized')) {
          
          // Show login dialog instead of redirect
          setIsAuthDialogOpen(true);
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate project query to refresh images
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      
      toast({
        title: "Main image updated",
        description: "Project main image has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      // Only show error toast if it's not an authentication error
      if (!error.message?.toLowerCase().includes('authentication') && 
          !error.message?.toLowerCase().includes('log in')) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authentication Error",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
      }
    },
  });
  
  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async ({ index, isMainImage }: { index: number, isMainImage: boolean }) => {
      try {
        const response = await apiRequest("DELETE", `/api/projects/${projectId}/images/${index}?isMainImage=${isMainImage}`);
        
        // Check for unauthorized response
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in and try again.");
        }
        
        return response;
      } catch (error: any) {
        // Check if it's an authentication error and handle specially
        if (error.message?.includes('401') || 
            error.message?.toLowerCase()?.includes('authentication') || 
            error.message?.toLowerCase()?.includes('unauthorized')) {
          
          // Show login dialog instead of redirect
          setIsAuthDialogOpen(true);
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate project query to refresh images
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      
      // Reset current index if it's now out of bounds
      if (currentIndex >= images.length - 1) {
        setCurrentIndex(Math.max(0, images.length - 2));
      }
      
      toast({
        title: "Image deleted",
        description: "Project image has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      // Only show error toast if it's not an authentication error
      if (!error.message?.toLowerCase().includes('authentication') && 
          !error.message?.toLowerCase().includes('log in')) {
        toast({
          title: "Delete failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authentication Error",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
      }
    },
  });

  // Handle file change
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type with broader acceptance
      const isImage = file.type.match('image.*');
      const isVideo = file.type.match('video.*');
      const isPdf = file.type === 'application/pdf';
      const isDoc = file.type.match('application/.*word') || file.name.match(/\.docx?$/i);
      const isExcel = file.type.match('application/.*excel') || file.name.match(/\.xlsx?$/i);
      const isPowerPoint = file.type.match('application/.*presentation') || file.name.match(/\.pptx?$/i);
      const isHeic = file.name.match(/\.heic$/i);
      
      const isAcceptedType = isImage || isVideo || isPdf || isDoc || isExcel || isPowerPoint || isHeic;
      
      if (!isAcceptedType) {
        setUploadError("Please select a valid file type");
        toast({
          title: "Invalid file",
          description: "Please select an image, video, PDF, document, or other supported file type",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (for videos allow up to 50MB, others 10MB)
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const sizeType = isVideo ? "50MB" : "10MB";
        setUploadError(`File size must be less than ${sizeType}`);
        toast({
          title: "File too large",
          description: `File size must be less than ${sizeType}`,
          variant: "destructive",
        });
        return;
      }
      
      // Always show the manual upload button for all devices
      // This approach ensures maximum compatibility with iOS
      
      console.log('File selected:', file.name);
      
      // Show toast with very clear instructions for iOS users
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      toast({
        title: "File selected",
        description: isIOS 
          ? "On iOS: Tap the GREEN 'Upload Now' button to complete your upload" 
          : "Click the green 'Upload Now' button to complete your upload",
        duration: 7000, // Show longer so user notices
      });
      
      // Force a re-render to update the submit button's disabled state
      setIsUploading(false);
    }
  }

  // Open image viewer with selected image
  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  // Navigate to previous image (memoized)
  const goToPrevious = useCallback(() => {
    const isFirstImage = currentIndex === 0;
    const newIndex = isFirstImage ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, images.length]);

  // Navigate to next image (memoized)
  const goToNext = useCallback(() => {
    const isLastImage = currentIndex === images.length - 1;
    const newIndex = isLastImage ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, images.length]);

  // Go to a specific image
  const goToImage = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Touch handlers for swipe with improved detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Store the initial touch position
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null); // Reset end position on new touch
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Continuously update the end position as finger moves
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    // Make the minimum swipe distance responsive to screen size
    const minSwipeDistance = window.innerWidth * 0.15; // 15% of screen width
    
    if (distance > minSwipeDistance) {
      // Swiped left, go to next image
      goToNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped right, go to previous image
      goToPrevious();
    }
    
    // Reset touch positions
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, goToNext, goToPrevious]);

  return (
    <>
      {/* Image Viewer Modal */}
      {images.length > 0 && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          imageUrl={images[selectedImageIndex]?.url ? normalizeImageUrl(images[selectedImageIndex].url) : ''}
          fileName={images[selectedImageIndex]?.name || `Project file ${selectedImageIndex + 1}`}
          mimeType={images[selectedImageIndex]?.mimeType}
        />
      )}
      
      {/* Authentication Dialog */}
      <AuthDialog
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        title="Sign In Required"
        description="You need to be signed in to upload or manage project images."
        afterLogin={() => {
          // Retry failed upload automatically after successful login
          if (fileInputRef.current?.files?.length) {
            const file = fileInputRef.current.files[0];
            uploadImageMutation.mutate(file);
          } else {
            // Clear any error message
            setUploadError("");
            
            // Refresh the project data
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
            
            toast({
              title: "Authentication successful",
              description: "You can now upload and manage project images.",
            });
          }
        }}
      />
    
      <div 
        className={cn(
          "relative w-full overflow-hidden rounded-lg",
          aspectRatioClass,
          height,
          className
        )}
        ref={sliderRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image display */}
        <div 
          className="flex transition-transform duration-500 ease-out h-full w-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((image, index) => (
            <div key={index} className="min-w-full h-full relative group cursor-pointer" onClick={() => openImageViewer(index)}>
              <img 
                src={image.url ? normalizeImageUrl(image.url) : ''} 
                alt={image.name || `Project image ${index + 1}`} 
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  console.error("Image failed to load:", image.url);
                  // Replace with a fallback UI for failed loads
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-200');
                  (e.target as HTMLImageElement).parentElement!.innerHTML += `
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                      <span class="text-xs text-center">Image unavailable</span>
                    </div>
                  `;
                }}
              />
              
              {/* Fullscreen button overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 rounded-full p-2">
                  <Maximize2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation indicators */}
        {images.length > 1 && (
          <>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    currentIndex === index 
                      ? "w-6 bg-white" 
                      : "w-1.5 bg-white/50"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
            
            {/* Image counter - displayed in top-left corner */}
            <div className="absolute top-2 left-2 bg-black/40 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <Image className="h-3 w-3 mr-1" />
              {currentIndex + 1}/{images.length}
            </div>
          </>
        )}

        {/* Navigation controls */}
        {showControls && images.length > 1 && (
          <>
            {/* Left control - larger touch target for mobile */}
            <button
              onClick={goToPrevious}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 sm:p-2 transition-colors touch-manipulation"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            
            {/* Right control - larger touch target for mobile */}
            <button
              onClick={goToNext}
              className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 sm:p-2 transition-colors touch-manipulation"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            
            {/* Invisible touch areas for easier swiping - cover left/right 1/3 of slider */}
            <div 
              className="absolute top-0 left-0 h-full w-1/3 opacity-0 cursor-w-resize" 
              onClick={goToPrevious} 
              aria-hidden="true"
            />
            <div 
              className="absolute top-0 right-0 h-full w-1/3 opacity-0 cursor-e-resize" 
              onClick={goToNext} 
              aria-hidden="true" 
            />
          </>
        )}

        {/* Upload overlay */}
        {canEdit && showUpload && (
          <div className="absolute top-2 right-2 flex gap-2">
            <form id="upload-form" onSubmit={(e) => {
              e.preventDefault();
              console.log('Form submit triggered');
              
              if (fileInputRef.current?.files?.length) {
                const file = fileInputRef.current.files[0];
                console.log('Submitting file from form:', file.name);
                
                // Detect iOS device to use special upload path
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                
                if (isIOS) {
                  console.log('Using iOS-specific upload method');
                  // For iOS, manually create and submit form data
                  const formData = new FormData();
                  formData.append('image', file);
                  formData.append('mimeType', file.type);
                  
                  setIsUploading(true);
                  fetch(`/api/projects/${projectId}/mobile-upload`, {
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
                    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
                    toast({
                      title: "Upload complete",
                      description: "Your image has been uploaded successfully",
                    });
                    if (onUploadComplete) onUploadComplete();
                  })
                  .catch(error => {
                    console.error('iOS upload failed:', error);
                    setUploadError(typeof error === 'string' ? error : 'Upload failed');
                    toast({
                      title: "Upload failed",
                      description: typeof error === 'string' ? error : "Could not upload image",
                      variant: "destructive"
                    });
                  })
                  .finally(() => {
                    setIsUploading(false);
                  });
                } else {
                  // For non-iOS, use the existing mutation
                  uploadImageMutation.mutate(file);
                }
              } else {
                console.log('No file selected in form submit');
                toast({
                  title: "No image selected",
                  description: "Please select an image first",
                  variant: "destructive"
                });
              }
            }}>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*,.pdf,.heic,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.rtf,.txt,.odt,.ods,.odp"
                capture="environment"
                onChange={handleFileChange}
                name="image"
              />
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  className="bg-white/90 hover:bg-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {isUploading ? "Uploading..." : "Select File"}
                </Button>
                
                {/* Highly visible button for all devices, especially iOS */}
                <Button 
                  type="submit" 
                  size="sm"
                  variant="default"
                  className="bg-green-600 text-white hover:bg-green-700 font-bold text-base px-4 py-2.5 shadow-lg animate-pulse transition-all scale-105 rounded"
                  disabled={isUploading || !fileInputRef.current?.files?.length}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  UPLOAD NOW
                </Button>
              </div>
            </form>
          </div>
        )}
        
        {/* Image management controls */}
        {canEdit && images.length > 0 && (
          <div className="absolute bottom-10 right-2 flex flex-col gap-2">
            <TooltipProvider>
              {/* Set as main image button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-white/90 hover:bg-white rounded-full"
                    onClick={() => {
                      // If this is an additional image (not at index 0), set it as main
                      // We determine if it's main by checking its index in the array
                      // If main image exists, it's at index 0
                      if (currentIndex > 0) {
                        setMainImageMutation.mutate(currentIndex - 1);
                      }
                    }}
                    disabled={setMainImageMutation.isPending || currentIndex === 0}
                  >
                    <Star className="h-4 w-4 text-yellow-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Set as main project image</p>
                </TooltipContent>
              </Tooltip>

              {/* Delete image button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-white/90 hover:bg-white rounded-full"
                    onClick={() => {
                      // If this is the main image (index 0), delete it specifically
                      const isMainImage = currentIndex === 0;
                      
                      if (isMainImage) {
                        deleteImageMutation.mutate({ index: -1, isMainImage: true });
                      } else {
                        // For additional images, calculate the actual index
                        // It's just the current index minus 1 (since index 0 is the main image)
                        const additionalImageIndex = currentIndex - 1;
                        deleteImageMutation.mutate({ index: additionalImageIndex, isMainImage: false });
                      }
                    }}
                    disabled={deleteImageMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete this image</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="absolute bottom-3 left-3 right-3 bg-red-500 text-white text-xs p-2 rounded flex items-center">
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            {uploadError}
          </div>
        )}
      </div>
    </>
  );
}