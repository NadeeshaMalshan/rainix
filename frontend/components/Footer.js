import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-[#111317] text-white py-8 border-t border-white/10 flex flex-col items-center justify-center font-poppins">
      <div className="max-w-[1600px] w-full px-4 text-center">
        <p className="text-sm md:text-base font-semibold mb-4 tracking-wide">Developed by Nadeesha Malshan</p>
        
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 text-xs text-white/60">
            <p><strong>Disclaimer:</strong> AI predictions and weather/river data might occasionally be inaccurate. Always consult official meteorology sources for critical decisions regarding floods and severe weather.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
