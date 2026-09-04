import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

interface ReceiverOverlayProps {
  playerX: number; // -1 to 1
  isSquatting: boolean;
  isReceiving: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onReceive: () => void;
  hasWebcam: boolean;
}

export default function ReceiverOverlay({
  playerX,
  isSquatting,
  isReceiving,
  onMoveLeft,
  onMoveRight,
  onReceive,
  hasWebcam,
}: ReceiverOverlayProps) {
  // Convert -1 to 1 into percentage (20% to 80%)
  const leftPercent = 50 + playerX * 30;

  return (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none z-40 overflow-hidden h-72">
      {/* Anime Volleyball Receiving Arms Silhouette / Visualizer */}
      <div
        className="absolute bottom-6 -translate-x-1/2 transition-all duration-75 flex flex-col items-center"
        style={{ left: `${leftPercent}%` }}
      >
        {/* Glow Aura when Receiving */}
        {isReceiving && (
          <div className="absolute -top-16 w-36 h-36 rounded-full bg-cyan-400/30 blur-xl animate-ping pointer-events-none"></div>
        )}

        {/* Squat / Bump Indicator Tag */}
        <div className="mb-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border backdrop-blur-md transition-all duration-150"
          style={{
            backgroundColor: isReceiving ? '#FACC15' : isSquatting ? '#06B6D4' : 'rgba(0,0,0,0.6)',
            color: isReceiving ? '#000000' : '#FFFFFF',
            borderColor: isReceiving ? '#FEF08A' : isSquatting ? '#67E8F9' : 'rgba(255,255,255,0.3)',
            transform: isReceiving ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          {isReceiving ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>BUMP READY!</span>
            </>
          ) : isSquatting ? (
            <>
              <Shield className="w-3.5 h-3.5" />
              <span>SQUAT POSE</span>
            </>
          ) : (
            <span>RECEIVER</span>
          )}
        </div>

        {/* Graphic Stylized Volleyball Receive Forearms */}
        <div className="relative w-44 h-32 flex justify-center">
          {/* Target Impact Plate / Platform */}
          <div
            className={`absolute top-2 w-32 h-7 rounded-full border-2 transition-all duration-150 flex items-center justify-center ${
              isReceiving
                ? 'bg-yellow-400 border-yellow-200 shadow-[0_0_25px_rgba(250,204,21,0.9)] -translate-y-3'
                : 'bg-cyan-500/40 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
            }`}
          >
            <div className="text-[10px] font-black tracking-widest text-black/80">
              {isReceiving ? '✦ HIT POINT ✦' : 'SWEET SPOT'}
            </div>
          </div>

          {/* Left & Right Angled Forearms in classic Volleyball platform form */}
          <svg
            viewBox="0 0 160 120"
            className={`w-40 h-28 drop-shadow-2xl transition-all duration-150 ${
              isReceiving ? '-translate-y-4 scale-105' : isSquatting ? 'translate-y-1' : ''
            }`}
          >
            <defs>
              <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FB923C" />
                <stop offset="100%" stopColor="#C2410C" />
              </linearGradient>
              <linearGradient id="sleeveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#0369A1" />
              </linearGradient>
            </defs>

            {/* Left Arm */}
            <path
              d="M 20 110 L 60 50 L 78 40 L 70 110 Z"
              fill="url(#armGrad)"
              stroke="#000"
              strokeWidth="2"
            />
            {/* Right Arm */}
            <path
              d="M 140 110 L 100 50 L 82 40 L 90 110 Z"
              fill="url(#armGrad)"
              stroke="#000"
              strokeWidth="2"
            />

            {/* Interlocked Hands / Wrists */}
            <ellipse cx="80" cy="38" rx="14" ry="9" fill="#FDBA74" stroke="#000" strokeWidth="2" />

            {/* Jersey Sleeves */}
            <path d="M 15 110 L 35 75 L 65 95 L 45 115 Z" fill="url(#sleeveGrad)" />
            <path d="M 145 110 L 125 75 L 95 95 L 115 115 Z" fill="url(#sleeveGrad)" />
          </svg>
        </div>
      </div>

      {/* Touch / On-screen Controls (for preview & testing) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto z-50">
        <button
          id="btn-move-left"
          type="button"
          onClick={onMoveLeft}
          className="px-4 py-2.5 bg-black/60 hover:bg-black/80 active:bg-cyan-600 text-white font-black text-sm rounded-xl border border-white/20 backdrop-blur-md shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>←</span>
          <span>KIRI</span>
        </button>

        <button
          id="btn-receive"
          type="button"
          onClick={onReceive}
          className={`px-7 py-3 font-black text-base rounded-xl border shadow-xl active:scale-95 transition-all flex items-center gap-2 ${
            isReceiving
              ? 'bg-yellow-400 text-black border-yellow-200 scale-105 shadow-[0_0_20px_rgba(250,204,21,0.8)]'
              : 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-200'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>RECEIVE (SPASI)</span>
        </button>

        <button
          id="btn-move-right"
          type="button"
          onClick={onMoveRight}
          className="px-4 py-2.5 bg-black/60 hover:bg-black/80 active:bg-cyan-600 text-white font-black text-sm rounded-xl border border-white/20 backdrop-blur-md shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>KANAN</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
