import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ProgressProps } from "@radix-ui/react-progress";

interface EmojiProgressBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  value: number;
  showEmoji?: boolean;
  showLabel?: boolean;
  height?: string;
  animationDuration?: number;
  className?: string;
  labelClassName?: string;
}

const emojis = [
  { range: [0, 10], emoji: "🏗️", label: "Just Started" },
  { range: [11, 25], emoji: "🧱", label: "Foundation" },
  { range: [26, 40], emoji: "🔨", label: "Framing" },
  { range: [41, 55], emoji: "🪚", label: "Construction" },
  { range: [56, 70], emoji: "🔌", label: "Utilities" },
  { range: [71, 85], emoji: "🎨", label: "Finishing" },
  { range: [86, 99], emoji: "🧹", label: "Final Touches" },
  { range: [100, 100], emoji: "🏠", label: "Complete!" }
];

export function EmojiProgressBar({
  value = 0,
  showEmoji = true,
  showLabel = true,
  height = "h-8",
  animationDuration = 0.5,
  className,
  labelClassName,
  ...props
}: EmojiProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [hovering, setHovering] = useState(false);
  
  // Find the right emoji for the progress value
  const currentEmoji = emojis.find(e => value >= e.range[0] && value <= e.range[1]) || emojis[0];
  
  // Animate the progress on mount and when value changes
  useEffect(() => {
    setShouldAnimate(true);
    
    const timer = setTimeout(() => {
      setDisplayValue(value);
      
      // Reset animation flag after animation duration
      const resetTimer = setTimeout(() => {
        setShouldAnimate(false);
      }, animationDuration * 1000 + 100);
      
      return () => clearTimeout(resetTimer);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [value, animationDuration]);
  
  // Get background color based on progress
  const getBackgroundColor = () => {
    if (value < 25) return "bg-blue-500";
    if (value < 50) return "bg-yellow-500";
    if (value < 75) return "bg-orange-500";
    return "bg-green-500";
  };
  
  // Motion variants
  const progressVariants = {
    initial: { width: `${Math.max(0, displayValue - 5)}%` },
    animate: { width: `${displayValue}%` }
  };
  
  const emojiVariants = {
    initial: { scale: 1 },
    animate: { scale: [1, 1.3, 1], transition: { duration: 0.4 } },
    hover: { y: -5, transition: { duration: 0.2 } }
  };
  
  return (
    <div className={cn("space-y-1", className)} {...props}>
      <div 
        className={cn("relative overflow-hidden rounded-full bg-gray-200", height)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <motion.div
          className={cn("h-full rounded-full", getBackgroundColor())}
          style={{ width: `${Math.max(displayValue, 3)}%` }}
          initial="initial"
          animate="animate"
          variants={progressVariants}
          transition={{ duration: animationDuration, ease: "easeOut" }}
        >
          {showEmoji && (
            <motion.div 
              className="absolute top-0 h-full flex items-center justify-center"
              style={{ right: "0px", transform: "translateX(50%)" }}
              initial="initial"
              animate={shouldAnimate ? "animate" : "initial"}
              whileHover="hover"
              variants={emojiVariants}
            >
              <span className="text-xl">{currentEmoji.emoji}</span>
            </motion.div>
          )}
        </motion.div>
      </div>
      
      {showLabel && (
        <AnimatePresence>
          <div className="flex justify-between items-center text-xs">
            <motion.div 
              className={cn("font-medium", labelClassName)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: animationDuration, duration: 0.3 }}
            >
              {currentEmoji.label}
            </motion.div>
            <motion.div 
              className={cn("text-gray-500", labelClassName)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: animationDuration, duration: 0.3 }}
            >
              {displayValue}% Complete
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}