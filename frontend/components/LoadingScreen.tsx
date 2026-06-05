import React, { useState, useEffect } from 'react';
import LiquidGlassText2D from './LiquidGlassText2D';

interface LoadingScreenProps {
  text?: string;
  isVisible?: boolean;
}

export default function LoadingScreen({ text = "Loading...", isVisible = true }: LoadingScreenProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      document.body.classList.add('loading-active');
    } else {
      // Delay unmounting to allow the pull-up animation to finish
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.classList.remove('loading-active');
      }, 1000);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('loading-active');
      };
    }
  }, [isVisible]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('loading-active');
    };
  }, []);

  if (!shouldRender) return null;

  // Capitalize city/river names (last word in the default texts usually)
  const formatText = (str: string) => {
    return str.split(' ').map(word => {
      if (['of', 'data', 'weather', 'river', 'getting'].includes(word.toLowerCase())) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  return (
    <div 
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050b14]/70 backdrop-blur-3xl will-change-transform ${
        !isVisible ? 'animate-pull-up pointer-events-none' : 'translate-y-0'
      }`}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[60vw] h-[60vh] bg-blue-500/20 blur-[140px] rounded-full pointer-events-none opacity-60 animate-pulse" style={{ animationDuration: '4s' }}></div>
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[50vw] h-[50vh] bg-sky-400/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Animated Elements */}
      <div className="relative flex items-center justify-center w-64 h-32 mb-2 z-10 scale-[0.6] md:scale-[0.7]">
        {/* Glowing Orbs for the Logo background */}
        <div className="absolute w-24 h-24 bg-blue-500/20 rounded-full blur-2xl animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        <div className="absolute w-16 h-16 bg-white/20 rounded-full blur-xl animate-pulse"></div>
        
        {/* rainiX Logo */}
        <div className="relative z-10 w-full flex justify-center drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          <LiquidGlassText2D text="rainiX" />
        </div>
      </div>

      {/* Dynamic Text with premium typography */}
      <div className="relative z-10 text-xl md:text-3xl font-poppins font-light text-white text-center tracking-wide md:tracking-widest px-6">
        <div className="animate-pulse flex items-center justify-center gap-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
          {formatText(text)}
        </div>
        {/* Underline shimmer effect */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-[1px] w-3/4 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes pull-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(-100%); }
        }
        .animate-pull-up {
          animation: pull-up 0.8s cubic-bezier(0.7,0,0.3,1) forwards;
        }
      `}</style>
    </div>
  );
}
