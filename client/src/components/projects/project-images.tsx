import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
import {
  Camera,
  Upload,
  Trash2,
  Star,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
  MessageSquare
} from "lucide-react";
import { ImageComments } from "./image-comments";

interface ProjectImagesProps {
  project: Project;
  canEdit: boolean;
}

export function ProjectImages({ project, canEdit }: ProjectImagesProps) {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Extract main image and additional images from project
  const mainImage = project.mainImage as any;
  const additionalImages = (project.additionalImages as any[] || []);

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadError("");
      
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        // Pass true as the fourth parameter to indicate this is FormData
        const response = await apiRequest("POST", `/api/projects/${project.id}/images`, formData, true);
        const data = await response.json();
        return data;
      } catch (error: any) {
        setUploadError(error.message || "Failed to upload image");
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      // Invalidate project query to refresh images
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      
      // Close dialog and reset state
      setUploadDialogOpen(false);
      setImageFile(null);
      
      toast({
        title: "Image uploaded",
        description: "Project image has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set as main image mutation
  const setMainImageMutation = useMutation({
    mutationFn: async (imageIndex: number) => {
      const response = await apiRequest("PUT", `/api/projects/${project.id}/main-image`, { imageIndex });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate project query to refresh images
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      
      toast({
        title: "Main image updated",
        description: "Project main image has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async ({ index, isMain }: { index: number, isMain: boolean }) => {
      if (isMain) {
        // Delete main image
        const response = await apiRequest("PUT", `/api/projects/${project.id}/main-image`, { imageIndex: -1 });
        return response.json();
      } else {
        // Delete additional image
        const response = await apiRequest("DELETE", `/api/projects/${project.id}/images/${index}?isMainImage=false`);
        return response.json();
      }
    },
    onSuccess: () => {
      // Invalidate project query to refresh images
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      
      toast({
        title: "Image deleted",
        description: "Project image has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file is an image
      if (!file.type.match('image.*')) {
        setUploadError("Please select an image file");
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Image size must be less than 5MB");
        toast({
          title: "File too large",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setImageFile(file);
      setUploadError("");
      
      // For mobile devices, submit the form automatically
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        toast({
          title: "Processing...",
          description: "Preparing to upload your image",
        });
        
        // Small delay to ensure UI feedback before upload starts
        setTimeout(() => {
          uploadImageMutation.mutate(file);
        }, 500);
      }
    }
  };

  const handleUpload = () => {
    if (!imageFile) {
      setUploadError("Please select an image file");
      return;
    }
    
    uploadImageMutation.mutate(imageFile);
  };

  // Get comment count for an image
  const getCommentCount = (image: any) => {
    return image.comments?.length || 0;
  };

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="flex justify-between items-center p-6">
        <CardTitle className="text-lg font-semibold text-gray-800">Project Images</CardTitle>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Add Image
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Main project image */}
        {mainImage ? (
          <div className="relative rounded-lg overflow-hidden border border-gray-200">
            <img 
              src={mainImage.url ? normalizeImageUrl(mainImage.url) : ''} 
              alt={`${project.name} - Main Image`}
              className="w-full h-48 sm:h-64 object-cover"
              onError={(e) => {
                console.error("Main image failed to load:", mainImage.url);
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-200');
                (e.target as HTMLImageElement).parentElement!.innerHTML += `
                  <div class="flex flex-col items-center justify-center text-gray-500 p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                    <span class="text-sm text-center">Image unavailable</span>
                  </div>
                `;
              }}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              {canEdit && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 bg-opacity-80 hover:bg-opacity-100"
                  onClick={() => deleteImageMutation.mutate({ index: 0, isMain: true })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="bg-amber-500 text-white h-8 w-8 rounded-md flex items-center justify-center">
                <Star className="h-4 w-4" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center bg-black bg-opacity-50 text-white">
              <div className="text-sm py-1 px-2">
                <p className="truncate">{mainImage.name}</p>
                <p className="text-xs opacity-80">
                  Uploaded by {mainImage.uploadedBy?.username || "Unknown"} ({mainImage.uploadedBy?.role || "user"})
                </p>
              </div>
              <div className="pr-2">
                <ImageComments 
                  projectId={project.id} 
                  image={mainImage} 
                  variant="icon"
                  onCommentAdded={() => {
                    queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="font-medium text-gray-500">No main image set</p>
            {canEdit && (
              <p className="text-sm text-gray-400 mt-1">
                Upload an image or select from additional images
              </p>
            )}
          </div>
        )}

        {/* Additional project images */}
        {additionalImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {additionalImages.map((image, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={image.url ? normalizeImageUrl(image.url) : ''}
                  alt={`${project.name} - Image ${index + 1}`}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    console.error("Additional image failed to load:", image.url);
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-200');
                    (e.target as HTMLImageElement).parentElement!.innerHTML += `
                      <div class="flex flex-col items-center justify-center text-gray-500 p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                        <span class="text-xs text-center">Image unavailable</span>
                      </div>
                    `;
                  }}
                />
                {canEdit && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="mx-1"
                      onClick={() => setMainImageMutation.mutate(index)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="mx-1"
                      onClick={() => deleteImageMutation.mutate({ index, isMain: false })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center bg-black bg-opacity-50 text-white">
                  <div className="text-xs py-1 px-2 truncate">
                    {image.name}
                  </div>
                  <div className="pr-1.5">
                    <ImageComments 
                      projectId={project.id} 
                      image={image} 
                      variant="icon"
                      onCommentAdded={() => {
                        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">No additional images</p>
          </div>
        )}

        {/* Empty state */}
        {!mainImage && additionalImages.length === 0 && (
          <div className="mt-4 text-center">
            {canEdit ? (
              <Button
                variant="default"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Project Image
              </Button>
            ) : (
              <p className="text-sm text-gray-500">No project images available</p>
            )}
          </div>
        )}
      </CardContent>

      {/* Upload dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Project Image</DialogTitle>
            <DialogDescription>
              Upload a photo of the project site or construction progress.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (imageFile) {
              handleUpload();
            }
          }}>
            <div className="space-y-4 py-4">
              {uploadError && (
                <div className="bg-red-50 text-red-800 px-4 py-2 rounded-md flex items-center text-sm">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {uploadError}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="image">Select Image</Label>
                <Input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                />
              </div>
              
              {imageFile && (
                <div className="bg-gray-50 p-2 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium">{imageFile.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({Math.round(imageFile.size / 1024)} KB)
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setImageFile(null);
                  setUploadError("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!imageFile || isUploading}
              >
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload Image
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}