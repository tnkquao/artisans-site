import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface TryAgainProps {
  message?: string;
  onRetry: () => void;
  autoRetry?: boolean;
  countdownSeconds?: number;
  buttonText?: string;
}

export function TryAgain({
  message = "There was a problem loading this content",
  onRetry,
  autoRetry = true,
  countdownSeconds = 5,
  buttonText = "Try Again"
}: TryAgainProps) {
  const [countdown, setCountdown] = useState(autoRetry ? countdownSeconds : 0);
  
  useEffect(() => {
    if (!autoRetry || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onRetry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [autoRetry, countdown, onRetry]);
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px] border rounded-lg bg-background/50">
      <AlertCircle className="h-10 w-10 text-warning mb-4" />
      <p className="text-muted-foreground mb-4">{message}</p>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={onRetry}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {buttonText}
          {countdown > 0 && <span className="ml-1">({countdown})</span>}
        </Button>
        
        {autoRetry && countdown > 0 && (
          <span className="text-xs text-muted-foreground">
            Retrying automatically...
          </span>
        )}
      </div>
    </div>
  );
}