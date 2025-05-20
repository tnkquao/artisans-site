import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConstructionWorker } from "./construction-worker";
import { Button } from "@/components/ui/button";
import { HardHat, ArrowRight, Wrench, Shield, Users, Truck } from "lucide-react";

interface WelcomeScreenProps {
  onComplete: () => void;
  username?: string;
}

export function WelcomeScreen({ onComplete, username = "there" }: WelcomeScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  
  // Show skip button after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkip(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Onboarding steps content
  const steps = [
    {
      title: "Welcome to Artisans!",
      description: `Hi ${username}! I'm Bob, your personal construction guide. Let me show you around our platform.`,
      icon: <HardHat className="h-10 w-10 text-primary" />,
    },
    {
      title: "Trust & Security",
      description: "We act as a trusted intermediary between clients and service providers to ensure your construction projects run smoothly.",
      icon: <Shield className="h-10 w-10 text-primary" />,
    },
    {
      title: "Comprehensive Project Tracking",
      description: "Track every aspect of your construction project from start to finish with our detailed project management tools.",
      icon: <Wrench className="h-10 w-10 text-primary" />,
    },
    {
      title: "Connect with Service Providers",
      description: "Find qualified contractors, architects, and other service providers for your project through our bidding system.",
      icon: <Users className="h-10 w-10 text-primary" />,
    },
    {
      title: "Order Materials",
      description: "Browse and order high-quality construction materials directly through our platform for delivery to your site.",
      icon: <Truck className="h-10 w-10 text-primary" />,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 w-full">
            <motion.div 
              className="h-full bg-primary rounded-r-full"
              initial={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Mascot */}
              <div className="w-full md:w-1/3 flex justify-center">
                <ConstructionWorker 
                  className="w-48 h-auto" 
                  waveHand={currentStep === 0}
                />
              </div>
              
              {/* Content */}
              <div className="w-full md:w-2/3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-start"
                  >
                    <div className="bg-primary/10 p-3 rounded-full mb-4">
                      {steps[currentStep].icon}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">
                      {steps[currentStep].title}
                    </h2>
                    <p className="text-gray-600 mb-6">
                      {steps[currentStep].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
                
                <div className="flex justify-between items-center mt-6">
                  {/* Skip button */}
                  <AnimatePresence>
                    {showSkip && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Button 
                          variant="ghost" 
                          onClick={handleSkip}
                        >
                          Skip tour
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Next button */}
                  <Button
                    className="ml-auto"
                    onClick={handleNext}
                  >
                    {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}