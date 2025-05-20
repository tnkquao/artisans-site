import { motion } from "framer-motion";

interface ConstructionWorkerProps {
  className?: string;
  waveHand?: boolean;
}

export function ConstructionWorker({ className = "", waveHand = false }: ConstructionWorkerProps) {
  // Animation variants for hand waving effect
  const handVariants = {
    wave: {
      rotate: [0, 20, -10, 20, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatType: "loop" as const,
        ease: "easeInOut"
      }
    },
    rest: {
      rotate: 0
    }
  };

  return (
    <svg
      className={className}
      width="180"
      height="220"
      viewBox="0 0 180 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hard Hat */}
      <motion.path 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        d="M120 50C120 33.4315 106.569 20 90 20C73.4315 20 60 33.4315 60 50"
        fill="#FFD700"
        stroke="#E0B800"
        strokeWidth="4"
      />
      <motion.path
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        d="M50 55C50 55 64 40 90 40C116 40 130 55 130 55C130 55 130 65 90 65C50 65 50 55 50 55Z"
        fill="#FFD700"
        stroke="#E0B800"
        strokeWidth="4"
      />
      
      {/* Face */}
      <motion.circle
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        cx="90"
        cy="85"
        r="25"
        fill="#FFC0CB"
        stroke="#FF9A9A"
        strokeWidth="2"
      />
      
      {/* Eyes */}
      <motion.circle
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.7, duration: 0.3, type: "spring" }}
        cx="80"
        cy="80"
        r="4"
        fill="#333"
      />
      <motion.circle
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.7, duration: 0.3, type: "spring" }}
        cx="100"
        cy="80"
        r="4"
        fill="#333"
      />
      
      {/* Smile */}
      <motion.path
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        d="M75 90C80 98 100 98 105 90"
        stroke="#333"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Body */}
      <motion.rect
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        x="70"
        y="110"
        width="40"
        height="60"
        fill="#FF6347"
        stroke="#E05A40"
        strokeWidth="2"
        rx="5"
      />
      
      {/* Arms */}
      <motion.path
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        d="M70 115C50 120 40 140 40 150"
        stroke="#FFC0CB"
        strokeWidth="10"
        strokeLinecap="round"
      />
      
      {/* Waving hand */}
      <motion.path
        initial={{ x: 10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        d="M110 115C130 120 140 137 140 147"
        stroke="#FFC0CB"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <motion.circle
        variants={handVariants}
        initial="rest"
        animate={waveHand ? "wave" : "rest"}
        custom={1}
        cx="140"
        cy="147"
        r="10"
        fill="#FFC0CB"
        stroke="#FF9A9A"
        strokeWidth="2"
        style={{ originX: 0, originY: 0 }}
      />
      
      {/* Legs */}
      <motion.rect
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        x="75"
        y="170"
        width="15"
        height="40"
        fill="#1E88E5"
        stroke="#1976D2"
        strokeWidth="2"
      />
      <motion.rect
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        x="90"
        y="170"
        width="15"
        height="40"
        fill="#1E88E5"
        stroke="#1976D2"
        strokeWidth="2"
      />
      
      {/* Shoes */}
      <motion.rect
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
        x="70"
        y="210"
        width="25"
        height="10"
        fill="#333"
        rx="2"
        style={{ originX: 1 }}
      />
      <motion.rect
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
        x="85"
        y="210"
        width="25"
        height="10"
        fill="#333"
        rx="2"
        style={{ originX: 0 }}
      />
    </svg>
  );
}