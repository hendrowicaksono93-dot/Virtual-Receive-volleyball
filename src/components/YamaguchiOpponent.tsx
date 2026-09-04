import React from 'react';

interface YamaguchiOpponentProps {
  pose: 'ready' | 'toss' | 'jump' | 'spike';
  position?: 'left' | 'center' | 'right';
}

export default function YamaguchiOpponent({ pose, position = 'center' }: YamaguchiOpponentProps) {
  const posTranslate =
    position === 'left'
      ? '-translate-x-36 md:-translate-x-52'
      : position === 'right'
      ? 'translate-x-36 md:translate-x-52'
      : 'translate-x-0';

  return (
    <div className="absolute top-[120px] left-0 w-full h-[280px] flex items-center justify-center pointer-events-none z-10">
      {/* Volleyball Net spanning the center court */}
      <div className="absolute top-[160px] left-0 w-full h-24 border-t-4 border-white bg-white/10 backdrop-blur-[1px] flex flex-col justify-between overflow-hidden shadow-md">
        <div className="w-full h-full opacity-40"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 12px), repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 12px)',
          }}
        />
        <div className="w-full h-3 bg-red-600/80 border-y border-white"></div>
      </div>

      {/* Yamaguchi Character Container */}
      <div className={`relative flex flex-col items-center transition-transform duration-500 ease-out ${posTranslate}`}>
        {/* Opponent Shadow */}
        <div
          className={`w-32 h-6 bg-black/50 rounded-full blur-md transition-all duration-200 ${
            pose === 'jump' || pose === 'spike' ? 'scale-75 opacity-30 translate-y-16' : 'scale-100 opacity-60'
          }`}
        />

        {/* Character Visual */}
        <div
          className={`relative transition-all duration-150 flex flex-col items-center ${
            pose === 'jump'
              ? '-translate-y-16 scale-105'
              : pose === 'spike'
              ? '-translate-y-12 scale-110'
              : pose === 'toss'
              ? '-translate-y-4'
              : 'translate-y-0'
          }`}
        >
          {/* Spike Impact Flash effect */}
          {pose === 'spike' && (
            <div className="absolute -top-10 -right-8 w-24 h-24 rounded-full bg-yellow-300/60 blur-xl animate-ping" />
          )}

          {/* Anime Character Figure (Yamaguchi - Karasuno #12) */}
          <div className="relative w-36 h-52 flex flex-col items-center">
            {/* Head & Spiky Green/Black Hair with Cowlick */}
            <div className="relative z-20 flex flex-col items-center">
              {/* Hair */}
              <div className="w-20 h-16 bg-[#1A2E1A] rounded-t-full relative shadow-md">
                {/* Yamaguchi's signature ahoge / hair sprout */}
                <div className="absolute -top-3 left-8 w-2.5 h-6 bg-[#1A2E1A] rounded-full rotate-12" />
                <div className="absolute top-1 left-2 w-3 h-5 bg-[#2A442A] rounded-full -rotate-45" />
                <div className="absolute top-1 right-2 w-3 h-5 bg-[#2A442A] rounded-full rotate-45" />
              </div>

              {/* Face */}
              <div className="w-16 h-12 bg-[#FBD5B5] rounded-b-2xl -mt-4 relative border border-[#E0A87C] flex flex-col items-center pt-2">
                {/* Eyes focused */}
                <div className="flex justify-between w-10 px-1 mt-1">
                  <div className="w-2.5 h-1.5 bg-[#1F2937] rounded-sm -rotate-6" />
                  <div className="w-2.5 h-1.5 bg-[#1F2937] rounded-sm rotate-6" />
                </div>
                {/* Freckles (signature Yamaguchi trait) */}
                <div className="flex gap-1 mt-1 opacity-70">
                  <span className="w-0.5 h-0.5 bg-[#8B5E3C] rounded-full"></span>
                  <span className="w-0.5 h-0.5 bg-[#8B5E3C] rounded-full"></span>
                  <span className="w-0.5 h-0.5 bg-[#8B5E3C] rounded-full"></span>
                </div>
              </div>
            </div>

            {/* Jersey Body - Karasuno Black & Orange #12 */}
            <div className="w-28 h-28 bg-[#111827] rounded-t-xl border-t-2 border-[#EA580C] relative -mt-2 shadow-xl flex flex-col items-center pt-2">
              <div className="text-[10px] uppercase tracking-widest text-[#EA580C] font-black">KARASUNO</div>
              <div className="text-3xl font-black italic text-white leading-none mt-1">12</div>
              <div className="text-[9px] font-bold text-gray-300 mt-1 uppercase tracking-wider">PINCH SERVER</div>

              {/* Arms */}
              {pose === 'spike' ? (
                <>
                  {/* Right arm swung forward to spike */}
                  <div className="absolute -top-4 -right-6 w-8 h-20 bg-[#FBD5B5] rounded-full rotate-45 border border-amber-800 shadow-md" />
                  {/* Left guide arm */}
                  <div className="absolute top-2 -left-4 w-6 h-16 bg-[#FBD5B5] rounded-full -rotate-30" />
                </>
              ) : pose === 'toss' || pose === 'jump' ? (
                <>
                  {/* Both arms raised high */}
                  <div className="absolute -top-10 -right-2 w-6 h-20 bg-[#FBD5B5] rounded-full -rotate-12" />
                  <div className="absolute -top-8 -left-2 w-6 h-18 bg-[#FBD5B5] rounded-full rotate-12" />
                </>
              ) : (
                <>
                  {/* Normal ready arms */}
                  <div className="absolute top-4 -right-3 w-5 h-16 bg-[#FBD5B5] rounded-full rotate-12" />
                  <div className="absolute top-4 -left-3 w-5 h-16 bg-[#FBD5B5] rounded-full -rotate-12" />
                </>
              )}
            </div>

            {/* Athletic Shorts */}
            <div className="w-24 h-12 bg-[#1F2937] border-t-2 border-[#EA580C] flex justify-around px-2">
              <div className="w-8 h-10 bg-[#1F2937] border-b-2 border-white" />
              <div className="w-8 h-10 bg-[#1F2937] border-b-2 border-white" />
            </div>
          </div>

          {/* Name Tag Pill */}
          <div className="mt-2 bg-black/85 px-3 py-1 rounded-full border border-yellow-400 shadow-lg text-center backdrop-blur-sm flex items-center justify-center gap-1.5">
            <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest leading-tight">
              {position === 'left' ? 'SERVE KIRI' : position === 'right' ? 'SERVE KANAN' : 'SERVE TENGAH'}
            </span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-xs font-black italic text-white tracking-wider">T. YAMAGUCHI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
