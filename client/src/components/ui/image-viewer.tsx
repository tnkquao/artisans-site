import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  X, 
  FileVideo,
  FileImage,
  FileText,
  File,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName?: string;
  mimeType?: string;
}

export function ImageViewer({ isOpen, onClose, imageUrl, fileName, mimeType }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Helper functions for file info
  const getFileExtension = (url: string): string => {
    return url.split('.').pop()?.toLowerCase() || '';
  };

  // File information
  const displayName = fileName || imageUrl.split('/').pop() || 'File';
  const fileExtension = getFileExtension(imageUrl);

  // File type detection
  const isImage = mimeType?.startsWith('image/') || 
                 /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(imageUrl);
  
  const isVideo = mimeType?.startsWith('video/') || 
                 /\.(mp4|mov|avi|webm|mkv|3gp|ogv)$/i.test(imageUrl);
  
  const isPdf = mimeType === 'application/pdf' || fileExtension === 'pdf';
  
  const isDoc = mimeType?.includes('word') || 
               /\.(docx?|rtf|txt|odt)$/i.test(imageUrl);
  
  const isSpreadsheet = mimeType?.includes('excel') || 
                       mimeType?.includes('spreadsheet') || 
                       /\.(xlsx?|csv|ods)$/i.test(imageUrl);
  
  const isPresentation = mimeType?.includes('presentation') || 
                        /\.(pptx?|key|odp)$/i.test(imageUrl);
  
  const isHeic = /\.heic$/i.test(imageUrl);

  // Determine if we should show the image controls
  const showImageControls = isImage && !loadError;

  // Determine if this is a non-displayable document
  const isNonDisplayableFile = 
    (isPdf || isDoc || isSpreadsheet || isPresentation || isHeic) && !isImage;

  // Control handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prevZoom => Math.min(prevZoom + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prevZoom => Math.max(prevZoom - 0.25, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || displayName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageUrl, fileName, displayName]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setLoadError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setLoadError(true);
  }, []);

  // Image dragging handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return; // Only enable dragging when zoomed in
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    // Set cursor style
    if (viewerRef.current) {
      viewerRef.current.style.cursor = 'grabbing';
    }
    
    e.preventDefault(); // Prevent text selection during drag
  }, [zoom]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setPosition(prev => ({ 
      x: prev.x + dx, 
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, zoom, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // Reset cursor
    if (viewerRef.current) {
      viewerRef.current.style.cursor = zoom > 1 ? 'grab' : 'auto';
    }
  }, [zoom]);
  
  // Touch handlers for mobile devices
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (zoom <= 1) return; // Only enable dragging when zoomed in
    
    setIsDragging(true);
    setDragStart({ 
      x: e.touches[0].clientX, 
      y: e.touches[0].clientY
    });
    
    // We no longer call preventDefault here since that's handled in the passive touch listener
  }, [zoom]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || zoom <= 1) return;
    
    const touch = e.touches[0];
    
    // Calculate the distance moved since the last position
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;
    
    // Apply position change with a movement multiplier for smoother mobile experience
    setPosition(prev => ({ 
      x: prev.x + dx * 1.2, // Slightly faster movement on mobile for better responsiveness
      y: prev.y + dy * 1.2
    }));
    
    // Update the drag start position for the next move
    setDragStart({ 
      x: touch.clientX, 
      y: touch.clientY
    });
  }, [isDragging, zoom, dragStart]);
  
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Get the appropriate icon for non-viewable files
  const getFileIcon = () => {
    if (isDoc) return <FileText className="h-16 w-16 mb-4" />;
    if (isPdf) return <File className="h-16 w-16 mb-4" />;
    if (isSpreadsheet) return <FileSpreadsheet className="h-16 w-16 mb-4" />;
    if (isPresentation) return <FileText className="h-16 w-16 mb-4" />;
    if (isVideo) return <FileVideo className="h-16 w-16 mb-4" />;
    if (isHeic) return <FileImage className="h-16 w-16 mb-4" />;
    return <File className="h-16 w-16 mb-4" />;
  };

  // Get description for non-viewable files
  const getFileDescription = () => {
    if (isDoc) return "Word Document";
    if (isPdf) return "PDF Document";
    if (isSpreadsheet) return "Spreadsheet";
    if (isPresentation) return "Presentation";
    if (isHeic) return "HEIC Image";
    return "Document";
  };

  // Reset state when image changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setIsLoading(true);
      setLoadError(false);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);
  
  // Reset position when zoom level is 1
  useEffect(() => {
    if (zoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);
  
  // Effect to add passive touch listeners
  useEffect(() => {
    const imageContainer = viewerRef.current;
    if (!imageContainer || !isOpen) return;
    
    // Prevent default touch actions when zoomed for smoother panning
    const preventDefaultTouch = (e: TouchEvent) => {
      if (zoom > 1) {
        e.preventDefault();
      }
    };
    
    imageContainer.addEventListener('touchmove', preventDefaultTouch, { passive: false });
    
    return () => {
      imageContainer.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, [zoom, isOpen]);
  
  // Add keyboard support for navigating zoomed images
  useEffect(() => {
    if (!isOpen || zoom <= 1) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const moveStep = 20; // Pixels to move per key press
      
      switch (e.key) {
        case 'ArrowUp':
          setPosition(prev => ({ ...prev, y: prev.y + moveStep }));
          e.preventDefault();
          break;
        case 'ArrowDown':
          setPosition(prev => ({ ...prev, y: prev.y - moveStep }));
          e.preventDefault();
          break;
        case 'ArrowLeft':
          setPosition(prev => ({ ...prev, x: prev.x + moveStep }));
          e.preventDefault();
          break;
        case 'ArrowRight':
          setPosition(prev => ({ ...prev, x: prev.x - moveStep }));
          e.preventDefault();
          break;
        case '+':
        case '=':
          handleZoomIn();
          e.preventDefault();
          break;
        case '-':
          handleZoomOut();
          e.preventDefault();
          break;
        case 'r':
          handleRotate();
          e.preventDefault();
          break;
        case 'Escape':
          onClose();
          e.preventDefault();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, zoom, onClose, handleZoomIn, handleZoomOut, handleRotate]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 bg-black/90 border-gray-800" ref={contentRef}>
        {/* Close button */}
        <div className="absolute top-4 right-4 z-20 flex space-x-2">
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="rounded-full bg-black/40 text-white hover:bg-black/60">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>
        
        {/* Image controls - only show for image files */}
        {showImageControls && (
          <>
            {/* Zoom info - only show when zoomed */}
            {zoom > 1 && (
              <div className="absolute top-4 left-4 z-20 bg-black/40 rounded-md p-2 text-xs text-white">
                <p>Zoom: {Math.round(zoom * 100)}%</p>
                <p className="mt-1 opacity-70">Use arrow keys to navigate</p>
              </div>
            )}
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2 bg-black/40 rounded-full p-2">
              <Button 
                variant="ghost" 
                size="icon" 
                title="Zoom In (+ key)"
                className="text-white hover:bg-black/60 rounded-full" 
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                title="Zoom Out (- key)"
                className="text-white hover:bg-black/60 rounded-full" 
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                title="Rotate (r key)"
                className="text-white hover:bg-black/60 rounded-full" 
                onClick={handleRotate}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                title="Download"
                className="text-white hover:bg-black/60 rounded-full" 
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
        
        {/* Download button for non-image files */}
        {!showImageControls && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2 bg-black/40 rounded-full p-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-black/60 rounded-full" 
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div 
          className="w-full h-full flex items-center justify-center overflow-hidden p-4" 
          ref={viewerRef}
          style={{ 
            maxHeight: 'calc(90vh - 20px)', 
            aspectRatio: isVideo ? '16/9' : 'auto'
          }}
        >
          {/* Loading spinner */}
          {isLoading && (
            <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
          )}
          
          {/* Error state */}
          {loadError && (
            <div className="flex flex-col items-center text-white">
              <FileImage className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Unable to display this file</p>
              <p className="text-sm text-gray-400 mt-2">{displayName}</p>
              <Button 
                variant="outline" 
                className="mt-6 text-white border-white hover:bg-white/10"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
          
          {/* Video display */}
          {!loadError && isVideo && (
            <div className="w-full max-w-4xl">
              <video 
                controls 
                className="max-h-[70vh] max-w-full rounded-md shadow-lg"
                src={imageUrl}
                onLoadStart={() => setIsLoading(true)}
                onLoadedData={() => setIsLoading(false)}
                onError={handleImageError}
                autoPlay={false}
              >
                Your browser does not support the video tag.
              </video>
              <p className="text-xs text-center text-white/70 mt-2">{displayName}</p>
            </div>
          )}
          
          {/* Image display */}
          {!loadError && isImage && !isVideo && (
            <div 
              className="relative overflow-hidden flex items-center justify-center w-full h-full"
              style={{
                minHeight: '300px',
                cursor: zoom > 1 ? 'grab' : 'auto'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img 
                src={imageUrl}
                alt={fileName || "Image"}
                ref={imgRef}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="max-h-full transition-transform duration-200 ease-in-out rounded-md object-contain"
                style={{ 
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  maxWidth: zoom === 1 ? '100%' : 'none'
                }}
              />
            </div>
          )}
          
          {/* Non-displayable file type */}
          {!loadError && isNonDisplayableFile && (
            <div className="flex flex-col items-center text-white">
              {getFileIcon()}
              <p className="text-lg font-medium">{getFileDescription()}</p>
              <p className="text-sm text-gray-400 mt-2">{displayName}</p>
              <Button 
                variant="outline" 
                className="mt-6 text-white border-white hover:bg-white/10"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}