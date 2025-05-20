import { useState } from "react";
import { Check, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDirectLogin } from "@/hooks/use-direct-login";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  afterLogin?: () => void;
  title?: string;
  description?: string;
}

export function AuthDialog({
  open,
  onOpenChange,
  afterLogin,
  title = "Sign In Required",
  description = "You need to be signed in to access this feature.",
}: AuthDialogProps) {
  const [username, setUsername] = useState("client1");
  const [password, setPassword] = useState("password");
  const { login, isLoggingIn, loginError } = useDirectLogin();
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Handle login
  const handleLogin = async () => {
    if (!username || !password) {
      return;
    }
    
    setLoginStatus("loading");
    
    const success = await login(username, password);
    
    if (success) {
      setLoginStatus("success");
      
      // Give time to see the success state before closing
      setTimeout(() => {
        onOpenChange(false);
        if (afterLogin) {
          afterLogin();
        }
      }, 1000);
    } else {
      setLoginStatus("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username or Email</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username email"
              placeholder="Enter your username or email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
            />
          </div>
          {loginError && (
            <div className="text-sm text-red-500">{loginError}</div>
          )}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLogin}
            disabled={isLoggingIn || loginStatus === "loading"}
            className={cn(
              loginStatus === "success" && "bg-green-500 hover:bg-green-600"
            )}
          >
            {loginStatus === "loading" || isLoggingIn ? (
              <span className="flex items-center">
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                Signing in...
              </span>
            ) : loginStatus === "success" ? (
              <span className="flex items-center">
                <Check className="h-4 w-4 mr-2" />
                Signed in!
              </span>
            ) : (
              <span className="flex items-center">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}