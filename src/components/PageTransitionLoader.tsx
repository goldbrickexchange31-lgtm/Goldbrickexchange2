import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const PageTransitionLoader: React.FC = () => {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Trigger on route changes
    setIsNavigating(true);
    setProgress(15);

    const t1 = setTimeout(() => setProgress(55), 60);
    const t2 = setTimeout(() => setProgress(85), 140);
    const t3 = setTimeout(() => setProgress(100), 240);
    const t4 = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 380);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [location.pathname, location.search]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none"
        >
          {/* Top Laser Progress Bar */}
          <div className="h-[2.5px] sm:h-[3px] w-full bg-transparent overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-white relative shadow-[0_0_14px_rgba(245,169,0,0.85)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.15 }}
            >
              {/* Glowing Laser Head Spark */}
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/90 blur-[2px] shadow-[0_0_16px_#FFF]" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
