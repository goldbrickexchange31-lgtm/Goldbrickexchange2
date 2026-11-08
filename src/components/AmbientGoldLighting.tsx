import React from 'react';

/**
 * GOLD BRICK EXCHANGE — PREMIUM AMBIENT LIGHT ANIMATION
 * Creates a continuous, GPU-accelerated moving ambient lighting atmosphere.
 * Multi-layered radial gradients drift slowly across the dark background.
 * Respects prefers-reduced-motion and never intercepts user input.
 */
export const AmbientGoldLighting: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#05080D]"
      aria-hidden="true"
    >
      {/* Base Deep Luxury Tone */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-[#05080D] via-[#080D14] to-[#05080D] opacity-95" 
      />

      {/* Layer 1: Slow Primary Traveling Golden Aurora (Left to Right top/hero) */}
      <div 
        className="ambient-orb-primary absolute top-[-10%] w-[650px] sm:w-[900px] lg:w-[1100px] h-[550px] sm:h-[750px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(245, 169, 0, 0.13) 0%, rgba(213, 183, 121, 0.06) 45%, rgba(5, 8, 13, 0) 75%)',
          filter: 'blur(90px)',
        }}
      />

      {/* Layer 2: Secondary Traveling Champagne Glow (Counter-drifting with offset speed) */}
      <div 
        className="ambient-orb-secondary absolute top-[28%] w-[550px] sm:w-[800px] lg:w-[950px] h-[500px] sm:h-[650px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(213, 183, 121, 0.10) 0%, rgba(245, 169, 0, 0.04) 50%, rgba(5, 8, 13, 0) 75%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Layer 3: Central Hero Breathing Golden Hearth (Subtle pulsing ambient core) */}
      <div 
        className="ambient-hearth absolute top-[8%] left-1/2 -translate-x-1/2 w-[340px] sm:w-[680px] lg:w-[850px] h-[340px] sm:h-[500px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245, 169, 0, 0.11) 0%, rgba(213, 183, 121, 0.05) 50%, rgba(5, 8, 13, 0) 72%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Layer 4: Subtle Moving Specular Light Sheen (Smooth slow diagonal light beam) */}
      <div 
        className="ambient-light-beam absolute inset-0 opacity-40 will-change-transform"
        style={{
          background: 'linear-gradient(115deg, transparent 20%, rgba(245, 169, 0, 0.035) 45%, rgba(255, 255, 255, 0.025) 50%, rgba(213, 183, 121, 0.035) 55%, transparent 80%)',
          backgroundSize: '200% 200%',
        }}
      />

      {/* Layer 5: Lower Section Subtle Floating Warmth (Calculators & Vaults) */}
      <div 
        className="ambient-orb-lower absolute bottom-[-10%] w-[600px] sm:w-[850px] h-[500px] sm:h-[700px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(245, 169, 0, 0.08) 0%, rgba(213, 183, 121, 0.03) 50%, rgba(5, 8, 13, 0) 75%)',
          filter: 'blur(110px)',
        }}
      />
    </div>
  );
};
