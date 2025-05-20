import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  BellOff, 
  Volume2, 
  VolumeX,
  Settings 
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  setNotificationSoundsEnabled, 
  areNotificationSoundsEnabled,
  playNotificationSound
} from '@/lib/notification-sounds';

export function NotificationSettings() {
  const [soundsEnabled, setSoundsEnabled] = useState(areNotificationSoundsEnabled());
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleToggleSounds = (checked: boolean) => {
    setSoundsEnabled(checked);
    setNotificationSoundsEnabled(checked);
    
    // Play a test sound when enabling
    if (checked) {
      playNotificationSound('normal');
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Open notification settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm leading-none">
            Notification Preferences
          </h4>
          
          <Separator />
          
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundsEnabled ? (
                  <Volume2 className="h-4 w-4 text-primary" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="sounds" className="text-sm">
                  Sound Effects
                </Label>
              </div>
              <Switch
                id="sounds"
                checked={soundsEnabled}
                onCheckedChange={handleToggleSounds}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {soundsEnabled
                ? "You'll hear different sounds for different priority notifications"
                : "Enable sounds to hear alerts for important notifications"}
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-xs font-medium">Test Notification Sounds:</div>
              <div className="flex justify-between gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-8"
                  disabled={!soundsEnabled}
                  onClick={() => playNotificationSound('urgent')}
                >
                  <span className="mr-1">🚨</span> Urgent
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-8"
                  disabled={!soundsEnabled}
                  onClick={() => playNotificationSound('high')}
                >
                  <span className="mr-1">❗</span> High
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-8"
                  disabled={!soundsEnabled}
                  onClick={() => playNotificationSound('normal')}
                >
                  <span className="mr-1">📢</span> Normal
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}