import React from 'react';

/**
 * GOLD BRICK EXCHANGE — PREMIUM AMBIENT LIGHT ANIMATION (FULL-PAGE SYSTEM)
 * Continuous, GPU-accelerated moving golden ambient lighting covering the ENTIRE landing page:
 * - Navigation & Header
 * - Hero section
 * - Robots & Features
 * - Calculator & Investment Vaults
 * - Live Activity & Security
 * - Comparison & Reviews
 * - FAQ & Footer
 *
 * Official Palette:
 * - Background: #05080D
 * - Secondary Background: #080D14
 * - Warm Gold: #F5A900
 * - Champagne Gold: #D5B779
 * - White Specular: #FFFFFF
 *
 * Technical:
 * - Fixed full-viewport layer that stays visible during scrolling
 * - Multi-layered radial gradients traveling horizontally and vertically
 * - pointer-events: none (zero interaction interference)
 * - -z-10 stacking order behind all content
 * - GPU transform (translate3d) & opacity transitions
 * - prefers-reduced-motion accessibility supported
 */
export const AmbientGoldLighting: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Subtle Depth Overlay */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(8,13,20,0.4)_0%,_transparent_75%)]" 
      />

      {/* Layer 1: Top & Header Traveling Golden Aurora (Warm Gold #F5A900) */}
      <div 
        className="ambient-orb-top absolute top-[-10%] w-[650px] sm:w-[950px] lg:w-[1200px] h-[550px] sm:h-[750px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(245, 169, 0, 0.22) 0%, rgba(213, 183, 121, 0.10) 40%, rgba(5, 8, 13, 0) 72%)',
          filter: 'blur(85px)',
        }}
      />

      {/* Layer 2: Upper-Middle Traveling Champagne Aurora (Champagne Gold #D5B779) */}
      <div 
        className="ambient-orb-upper-mid absolute top-[18%] w-[600px] sm:w-[900px] lg:w-[1100px] h-[500px] sm:h-[700px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(213, 183, 121, 0.18) 0%, rgba(245, 169, 0, 0.08) 45%, rgba(5, 8, 13, 0) 75%)',
          filter: 'blur(95px)',
        }}
      />

      {/* Layer 3: Center Core Breathing Hearth (Calculator & Vaults Section) */}
      <div 
        className="ambient-orb-center absolute top-[40%] left-1/2 -translate-x-1/2 w-[500px] sm:w-[850px] lg:w-[1100px] h-[450px] sm:h-[650px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245, 169, 0, 0.19) 0%, rgba(213, 183, 121, 0.09) 50%, rgba(5, 8, 13, 0) 75%)',
          filter: 'blur(90px)',
        }}
      />

      {/* Layer 4: Lower-Middle Traveling Gold Aurora (Security & Reviews Section) */}
      <div 
        className="ambient-orb-lower-mid absolute top-[62%] w-[600px] sm:w-[900px] lg:w-[1150px] h-[500px] sm:h-[700px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(213, 183, 121, 0.18) 0%, rgba(245, 169, 0, 0.09) 45%, rgba(5, 8, 13, 0) 75%)',
          filter: 'blur(95px)',
        }}
      />

      {/* Layer 5: Bottom & Footer Ambient Golden Glow (FAQ & Footer Section) */}
      <div 
        className="ambient-orb-footer absolute bottom-[-10%] w-[650px] sm:w-[950px] lg:w-[1250px] h-[550px] sm:h-[800px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(245, 169, 0, 0.20) 0%, rgba(213, 183, 121, 0.10) 45%, rgba(5, 8, 13, 0) 75%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Layer 6: Continuous Full-Screen Specular Light Stream */}
      <div 
        className="ambient-stream absolute inset-0 opacity-50 will-change-transform"
        style={{
          background: 'linear-gradient(125deg, transparent 20%, rgba(245, 169, 0, 0.05) 45%, rgba(255, 255, 255, 0.035) 50%, rgba(213, 183, 121, 0.05) 55%, transparent 80%)',
          backgroundSize: '250% 250%',
        }}
      />
    </div>
  );
};
