import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { Play, RotateCcw, Camera, Keyboard, AlertCircle, Sparkles, ExternalLink, Zap } from 'lucide-react';
import VolleyballScene from './components/VolleyballScene';
import YamaguchiOpponent from './components/YamaguchiOpponent';
import ReceiverOverlay from './components/ReceiverOverlay';
import { BallPhysics, GameStatus } from './types';
import { playWhistle, playServe, playReceive, playBounce, playScore } from './audio';

export default function App() {
  // Game States
  const [gameStatus, setGameStatus] = useState<GameStatus>('READY');
  const [hitFeedback, setHitFeedback] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [yamaguchiPose, setYamaguchiPose] = useState<'ready' | 'toss' | 'jump' | 'spike'>('ready');
  const [targetIndicatorX, setTargetIndicatorX] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const speedMultiplierRef = useRef(1.0);
  const [serveCount, setServeCount] = useState(1);
  const serveCountRef = useRef(1);
  const [servePosition, setServePosition] = useState<'left' | 'center' | 'right'>('center');
  const servePositionRef = useRef<'left' | 'center' | 'right'>('center');

  // Player input state (controlled either by Webcam or Keyboard/Touch)
  const [playerX, setPlayerX] = useState(0); // -1 (left) to 1 (right)
  const [isSquatting, setIsSquatting] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const playerXRef = useRef(0);
  const isSquattingRef = useRef(false);
  const isReceivingRef = useRef(false);

  // Camera & MediaPipe states
  const [hasWebcam, setHasWebcam] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const latestLandmarksRef = useRef<any[] | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 3D Physics Reference (Always initialized!)
  const physicsRef = useRef<BallPhysics>({
    active: true,
    state: 'held',
    t: 0,
    startTime: performance.now(),
    startX: 0,
    startY: 2.6,
    startZ: -25,
    targetX: 0,
    targetY: -0.8,
    targetZ: -2.5,
    vx: 0,
    vy: 0,
    vz: 0,
    spinX: -12,
    spinY: 0,
    hitChecked: false,
  });

  // --- 1. Game Flow Functions ---

  const triggerServe = useCallback(() => {
    // Cancel any ongoing countdown
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    // 1. Randomize serve start position (Left, Center, or Right)
    const positions: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
    const chosenPos = positions[Math.floor(Math.random() * positions.length)];
    setServePosition(chosenPos);
    servePositionRef.current = chosenPos;

    // 3D coordinate startX for Yamaguchi's position
    let startX = 0;
    if (chosenPos === 'left') startX = -2.6;
    else if (chosenPos === 'right') startX = 2.6;

    setGameStatus('COUNTDOWN');
    setYamaguchiPose('ready');
    let count = 3;
    setCountdown(count);
    playWhistle();

    // Prepare ball in held state at Yamaguchi's starting position
    physicsRef.current.state = 'held';
    physicsRef.current.startX = startX;
    physicsRef.current.startY = 2.4;
    physicsRef.current.startZ = -22;

    // Pick a random target zone for this serve (within playable court width)
    const newTargetX = (Math.random() - 0.5) * 1.6;
    setTargetIndicatorX(newTargetX);
    setHitFeedback(null);

    countdownTimerRef.current = setInterval(() => {
      count--;
      if (count === 2) {
        // Yamaguchi tosses the ball up
        setCountdown(2);
        setYamaguchiPose('toss');
        physicsRef.current.state = 'tossed';
        physicsRef.current.startTime = performance.now();
      } else if (count === 1) {
        // Yamaguchi jumps up into spike position
        setCountdown(1);
        setYamaguchiPose('jump');
      } else if (count === 0) {
        // Yamaguchi SPIKES the ball!
        setCountdown('SERVE!');
        setYamaguchiPose('spike');
        setGameStatus('IN_FLIGHT');
        playServe();

        // Launch ball projectile with progressive speed (+12% each throw)
        const currentMult = speedMultiplierRef.current;
        const flightTime = Math.max(0.48, 1.8 / currentMult);

        const currentStartX = physicsRef.current.startX ?? 0;
        const startY = 2.4;
        const startZ = -22;
        const targetX = newTargetX;
        const targetY = -0.55;
        const targetZ = -1.2;

        const vx = (targetX - currentStartX) / flightTime;
        const vz = (targetZ - startZ) / flightTime;
        const vy = (targetY - startY + 0.5 * 6.5 * flightTime * flightTime) / flightTime;

        physicsRef.current = {
          active: true,
          state: 'flying',
          t: 0,
          startTime: performance.now(),
          startX: currentStartX,
          startY,
          startZ,
          targetX,
          targetY,
          targetZ,
          vx,
          vy,
          vz,
          spinX: -14 * Math.min(2.5, currentMult),
          spinY: (Math.random() - 0.5) * 6,
          hitChecked: false,
        };

        // Increase speed by 12% for the next throw (reduced from 20%)
        const nextMult = Math.min(3.6, currentMult * 1.12);
        speedMultiplierRef.current = nextMult;
        serveCountRef.current += 1;
        setSpeedMultiplier(nextMult);
        setServeCount(serveCountRef.current);
      } else if (count < 0) {
        setCountdown(null);
        setYamaguchiPose('ready');
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      }
    }, 900);
  }, []);

  const handleResetSpeed = useCallback(() => {
    speedMultiplierRef.current = 1.0;
    serveCountRef.current = 1;
    setSpeedMultiplier(1.0);
    setServeCount(1);
  }, []);

  // Handle collision when ball reaches receive plane with high precision & intuitive feel
  const handleReachTarget = useCallback((ballScreenPos: { x: number; y: number }, ballWorldPos: THREE.Vector3) => {
    setTotalAttempts(a => a + 1);

    const landmarks = latestLandmarksRef.current;
    const isWebcamActive = hasWebcam && landmarks && landmarks.length > 0;

    // Platform screen X position (0 to 1) corresponding to player's arms overlay
    const curPlayerX = playerXRef.current;
    const platformScreenX = 0.5 + curPlayerX * 0.3;
    const dx = Math.abs(platformScreenX - ballScreenPos.x);

    let outcome: 'PERFECT' | 'GOOD' | 'MISS' = 'MISS';
    let reason = '';

    if (isWebcamActive) {
      // --- WEBCAM MODE EVALUATION ---
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];

      if (leftWrist && rightWrist) {
        const wristDist = Math.hypot(leftWrist.x - rightWrist.x, leftWrist.y - rightWrist.y);
        // Realistic and comfortable bump stance threshold for webcam
        const handsTogether = wristDist < 0.28;
        const isSquat = isSquattingRef.current;
        const isReady = handsTogether || isSquat || isReceivingRef.current;

        // Check if wrists are in front of torso (not dropped out of view)
        const wristsCenterY = (leftWrist.y + rightWrist.y) / 2;
        const handsUp = wristsCenterY < 0.92 && wristsCenterY > 0.15;

        if (!handsUp) {
          outcome = 'MISS';
          reason = 'MISS: Angkat kedua tangan ke depan dada!';
        } else if (!isReady && wristDist > 0.32) {
          outcome = 'MISS';
          reason = 'MISS: Rapatkan kedua pergelangan tangan (posisi bump)!';
        } else if (dx <= 0.08) {
          outcome = 'PERFECT';
          reason = '✦ PERFECT! Tepat di Sweet Spot lengan! (+2 PTS) ✦';
        } else if (dx <= 0.20) {
          outcome = 'GOOD';
          reason = '★ GOOD! Forearm tepat menyambut bola! (+1 PT) ★';
        } else {
          outcome = 'MISS';
          if (platformScreenX < ballScreenPos.x) {
            reason = 'MISS: Geser tangan Anda lebih ke KANAN!';
          } else {
            reason = 'MISS: Geser tangan Anda lebih ke KIRI!';
          }
        }
      } else {
        outcome = 'MISS';
        reason = 'MISS: Kedua tangan tidak terdeteksi kamera!';
      }
    } else {
      // --- KEYBOARD / TOUCH MODE EVALUATION ---
      const isReceivingActive = isReceivingRef.current;
      const isSquat = isSquattingRef.current;

      if (isReceivingActive || isSquat) {
        if (dx <= 0.08) {
          outcome = 'PERFECT';
          reason = '✦ PERFECT! Tepat di Sweet Spot lengan! (+2 PTS) ✦';
        } else if (dx <= 0.20) {
          outcome = 'GOOD';
          reason = '★ GOOD! Forearm tepat menyambut bola! (+1 PT) ★';
        } else {
          outcome = 'MISS';
          if (platformScreenX < ballScreenPos.x) {
            reason = 'MISS: Geser lebih ke KANAN (Tekan → / Tombol Kanan)!';
          } else {
            reason = 'MISS: Geser lebih ke KIRI (Tekan ← / Tombol Kiri)!';
          }
        }
      } else {
        // Did not press bump, but player was positioned directly in front of ball
        if (dx <= 0.08) {
          outcome = 'GOOD';
          reason = '★ GOOD! Pantulan bola dari lengan! (+1 PT) ★';
        } else {
          outcome = 'MISS';
          reason = 'MISS: Tekan SPASI / Tombol BUMP saat bola tiba!';
        }
      }
    }

    setGameStatus(outcome);
    setHitFeedback(reason);

    if (outcome === 'PERFECT' || outcome === 'GOOD') {
      const points = outcome === 'PERFECT' ? 2 : 1;
      setScore(s => s + points);
      playReceive();
      if (outcome === 'PERFECT') playScore();

      // Reflect ball back up and over net
      physicsRef.current.state = 'bumping';
      physicsRef.current.startTime = performance.now();
      physicsRef.current.startX = ballWorldPos.x;
      physicsRef.current.startY = ballWorldPos.y;
      physicsRef.current.startZ = ballWorldPos.z;
      physicsRef.current.vx = -ballWorldPos.x * (outcome === 'PERFECT' ? 0.35 : 0.55);
      physicsRef.current.vy = outcome === 'PERFECT' ? 8.2 : 7.2;
      physicsRef.current.vz = -15.5;
    } else {
      playBounce();

      // Ball bounces gently on floor without approaching camera
      physicsRef.current.state = 'bouncing';
      physicsRef.current.startTime = performance.now();
      physicsRef.current.startX = ballWorldPos.x;
      physicsRef.current.startZ = ballWorldPos.z;
      physicsRef.current.vx = physicsRef.current.vx * 0.2;
      physicsRef.current.vz = 0.8;
    }
  }, [hasWebcam]);

  // Round completed (after bump or bounce finishes)
  const handleRoundComplete = useCallback(() => {
    // Automatically prepare next serve after 1.5 seconds
    setTimeout(() => {
      setGameStatus('READY');
      triggerServe();
    }, 1200);
  }, [triggerServe]);

  // --- 2. Keyboard & Touch Controls ---

  const handleReceiveBump = useCallback(() => {
    setIsReceiving(true);
    setIsSquatting(true);
    isReceivingRef.current = true;
    isSquattingRef.current = true;
    setTimeout(() => {
      setIsReceiving(false);
      setIsSquatting(false);
      isReceivingRef.current = false;
      isSquattingRef.current = false;
    }, 750);
  }, []);

  const handleMoveLeft = useCallback(() => {
    setPlayerX(x => {
      const next = Math.max(-1, x - 0.20);
      playerXRef.current = next;
      return next;
    });
  }, []);

  const handleMoveRight = useCallback(() => {
    setPlayerX(x => {
      const next = Math.min(1, x + 0.20);
      playerXRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleMoveLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleMoveRight();
      } else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsReceiving(true);
        setIsSquatting(true);
        isReceivingRef.current = true;
        isSquattingRef.current = true;
      } else if (e.key === 'Enter') {
        triggerServe();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setTimeout(() => {
          setIsReceiving(false);
          setIsSquatting(false);
          isReceivingRef.current = false;
          isSquattingRef.current = false;
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleMoveLeft, handleMoveRight, triggerServe]);

  // --- 3. Initial Auto-Start ---
  useEffect(() => {
    // Start first serve after a brief greeting delay
    const initialTimer = setTimeout(() => {
      triggerServe();
    }, 800);

    return () => {
      clearTimeout(initialTimer);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [triggerServe]);

  // --- 4. Background MediaPipe & Webcam Initialization ---
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        if (isCancelled) return;

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });

        if (isCancelled) return;
        poseLandmarkerRef.current = poseLandmarker;
        setIsAiLoading(false);

        // Attempt webcam
        startCamera();
      } catch (err) {
        console.warn('MediaPipe initialization warning (Keyboard mode active):', err);
        setIsAiLoading(false);
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (poseLandmarkerRef.current) poseLandmarkerRef.current.close();
    };
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam not supported in this browser context.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setHasWebcam(true);
          setCameraError(null);
          requestRef.current = requestAnimationFrame(predictWebcam);
        };
      }
    } catch (err: any) {
      console.warn('Webcam permission note (falling back to Keyboard mode):', err);
      setCameraError(err.message || 'Permission denied. Keyboard mode is active.');
      setHasWebcam(false);
    }
  };

  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (
      video &&
      canvas &&
      poseLandmarker &&
      video.videoWidth > 0 &&
      video.videoHeight > 0 &&
      video.currentTime !== lastVideoTimeRef.current
    ) {
      lastVideoTimeRef.current = video.currentTime;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const results = poseLandmarker.detectForVideo(video, performance.now());

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Mirror canvas
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        // Subtle webcam background tint
        ctx.globalAlpha = 0.15;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;

        if (results.landmarks && results.landmarks.length > 0) {
          const lms = results.landmarks[0];
          latestLandmarksRef.current = lms;

          // Draw skeleton lines
          const leftWrist = lms[15];
          const rightWrist = lms[16];
          const leftHip = lms[23];
          const rightHip = lms[24];

          if (leftWrist && rightWrist) {
            const wristDist = Math.hypot(leftWrist.x - rightWrist.x, leftWrist.y - rightWrist.y);
            const handsTogether = wristDist < 0.28;
            const avgHipY = leftHip && rightHip ? (leftHip.y + rightHip.y) / 2 : 0.6;
            const squat = avgHipY > 0.48;

            setIsSquatting(squat);
            isSquattingRef.current = squat;
            setIsReceiving(handsTogether);
            isReceivingRef.current = handsTogether;

            // Sync receiver avatar position
            const wristsCenterX = 1 - (leftWrist.x + rightWrist.x) / 2;
            const normalizedPlayerX = (wristsCenterX - 0.5) / 0.35;
            const clampedX = Math.max(-1, Math.min(1, normalizedPlayerX));
            setPlayerX(clampedX);
            playerXRef.current = clampedX;

            // Visual Forearm Platform Overlay on User's Wrists
            const lx = leftWrist.x * canvas.width;
            const ly = leftWrist.y * canvas.height;
            const rx = rightWrist.x * canvas.width;
            const ry = rightWrist.y * canvas.height;
            const midX = (lx + rx) / 2;
            const midY = (ly + ry) / 2;

            // Connecting platform line
            ctx.lineWidth = handsTogether ? 7 : 3;
            ctx.strokeStyle = handsTogether ? '#FACC15' : '#EF4444';
            if (!handsTogether) {
              ctx.setLineDash([8, 6]);
            } else {
              ctx.setLineDash([]);
            }
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(rx, ry);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw targeting sweet-spot reticle at midpoint
            ctx.fillStyle = handsTogether ? '#FACC15' : '#EF4444';
            ctx.beginPath();
            ctx.arc(midX, midY, handsTogether ? 12 : 7, 0, Math.PI * 2);
            ctx.fill();

            if (handsTogether) {
              ctx.strokeStyle = '#FEF08A';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(midX, midY, 20, 0, Math.PI * 2);
              ctx.stroke();
            }

            // Draw wrist tracking points
            ctx.fillStyle = handsTogether ? '#FEF08A' : '#60A5FA';
            ctx.beginPath();
            ctx.arc(lx, ly, 7, 0, Math.PI * 2);
            ctx.arc(rx, ry, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="w-full h-screen bg-[#111827] relative font-sans overflow-hidden text-white select-none">
      {/* 1. Anime Gym Court Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1E3A8A] via-[#3B82F6] to-[#FDE68A]"></div>

      {/* Gymnasium Ceiling Beams & Windows */}
      <div className="absolute top-0 inset-x-0 h-40 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 40px',
        }}
      />

      {/* Gymnasium Wooden Court Floor */}
      <div className="absolute inset-x-0 bottom-0 h-[320px] bg-[#D49B5B] border-t-8 border-white shadow-2xl">
        {/* Wood planks texture */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, #8B5A2B 0px, #8B5A2B 2px, transparent 2px, transparent 40px)',
          }}
        />
        {/* Court boundary line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-white opacity-80"></div>
        {/* Attack 3m line */}
        <div className="absolute top-16 left-0 w-full h-2 bg-white/40"></div>
        <div className="absolute top-44 left-0 w-full h-1.5 bg-white/30"></div>
      </div>

      {/* 2. Opponent Character (Yamaguchi) */}
      <YamaguchiOpponent pose={yamaguchiPose} position={servePosition} />

      {/* 4. Full-screen Video & Canvas for Motion Tracking */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* 5. Three.js Volleyball 3D Canvas */}
      <VolleyballScene
        physicsRef={physicsRef}
        onReachTarget={handleReachTarget}
        onRoundComplete={handleRoundComplete}
        targetIndicatorX={targetIndicatorX}
      />

      {/* 6. Receiver Player Overlay (Hands & Touch Controls) */}
      <ReceiverOverlay
        playerX={playerX}
        isSquatting={isSquatting}
        isReceiving={isReceiving}
        onMoveLeft={handleMoveLeft}
        onMoveRight={handleMoveRight}
        onReceive={handleReceiveBump}
        hasWebcam={hasWebcam}
      />

      {/* 7. Header HUD & Scoreboard */}
      <div className="absolute top-5 left-6 z-50 flex items-center gap-4 pointer-events-auto">
        <div className="bg-black/85 backdrop-blur-md px-5 py-3 rounded-2xl border-2 border-yellow-400 shadow-2xl flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-wider">MATCH SCORE</span>
            <div className="text-3xl font-black italic tracking-tighter text-white">
              {score} <span className="text-sm font-normal text-gray-400">/ {totalAttempts}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-white/20"></div>

          {/* Speed Indicator */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">SPEED</span>
            </div>
            <div className="text-2xl font-black italic tracking-tighter text-amber-300 flex items-center gap-1.5 leading-none">
              <span>{Math.round(speedMultiplier * 100)}%</span>
              {speedMultiplier > 1.05 && (
                <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  +{Math.round((speedMultiplier - 1.0) * 100)}%
                </span>
              )}
            </div>
          </div>

          {speedMultiplier > 1.05 && (
            <button
              id="btn-reset-speed"
              type="button"
              onClick={handleResetSpeed}
              title="Reset ke kecepatan normal 100%"
              className="p-1.5 text-gray-400 hover:text-amber-300 hover:bg-white/10 rounded-lg transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-8 w-px bg-white/20"></div>

          <button
            id="btn-serve-now"
            type="button"
            onClick={triggerServe}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all uppercase tracking-wider"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>LEMPAR BOLA</span>
          </button>
        </div>
      </div>

      {/* Control Mode & Camera Notification Pill (Top Center) */}
      <div className="absolute top-5 right-6 z-50 flex items-center gap-2 pointer-events-auto">
        {hasWebcam ? (
          <div className="bg-emerald-950/80 border border-emerald-500/60 px-3.5 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md shadow-lg text-xs font-semibold text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <Camera className="w-3.5 h-3.5" />
            <span>Webcam Pose Active</span>
          </div>
        ) : (
          <div className="bg-black/75 border border-cyan-400/50 px-3.5 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md shadow-lg text-xs font-semibold text-cyan-300">
            <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode Keyboard (← → Gerak, Spasi Bump)</span>
            <button
              id="btn-retry-camera"
              type="button"
              onClick={startCamera}
              className="ml-1 text-[11px] bg-cyan-500/30 hover:bg-cyan-500/50 px-2 py-0.5 rounded text-cyan-200 border border-cyan-400/30"
            >
              Aktifkan Kamera
            </button>
          </div>
        )}
      </div>

      {/* Top Banner Notice when Camera has permission issue */}
      {cameraError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs px-4 py-2 rounded-xl backdrop-blur-md shadow-2xl flex items-center gap-2 max-w-lg">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Kamera belum diizinkan di preview iframe. Anda bisa langsung bermain dengan tombol/keyboard, atau buka di tab baru untuk webcam!</span>
          <button
            id="btn-open-new-tab"
            type="button"
            onClick={() => window.open(window.location.href, '_blank')}
            className="shrink-0 flex items-center gap-1 bg-amber-500/30 hover:bg-amber-500/50 px-2 py-1 rounded text-[11px] font-bold text-amber-100 border border-amber-400/30"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Tab Baru</span>
          </button>
        </div>
      )}

      {/* 8. Countdown Notice in Upper Court */}
      {countdown !== null && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[50] pointer-events-none flex flex-col items-center">
          <div
            className="text-7xl md:text-8xl font-black italic tracking-tight text-amber-300 drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] leading-none text-center transform -skew-x-6"
            style={{
              WebkitTextStroke: '2px #111',
              textShadow: '0 0 25px rgba(245, 158, 11, 0.8)',
            }}
          >
            {countdown}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-black tracking-widest text-amber-300 uppercase bg-black/80 px-3 py-1 rounded-full border border-amber-400/60 shadow-lg">
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>KECEPATAN BOLA: {Math.round(speedMultiplier * 100)}%</span>
            {speedMultiplier > 1.05 && (
              <span className="text-[10px] text-emerald-400 font-bold ml-1">
                (+{Math.round((speedMultiplier - 1.0) * 100)}%)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 9. Hit / Miss Outcome Announcement */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] flex flex-col items-center pointer-events-none">
        {gameStatus === 'PERFECT' && (
          <div className="flex flex-col items-center animate-bounce">
            <div
              className="text-[90px] md:text-[130px] font-black italic text-amber-300 drop-shadow-[0_10px_35px_rgba(245,158,11,1)] leading-none tracking-tighter text-center"
              style={{
                WebkitTextStroke: '3px black',
              }}
            >
              PERFECT!
            </div>
            <div className="bg-amber-400 text-black px-8 py-2 -mt-2 transform -skew-x-12 font-black text-lg md:text-xl shadow-2xl border-2 border-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 fill-black" />
              <span>{hitFeedback || '✦ SWEET SPOT BULLSEYE! (+2 PTS) ✦'}</span>
            </div>
          </div>
        )}

        {gameStatus === 'GOOD' && (
          <div className="flex flex-col items-center animate-bounce">
            <div
              className="text-[90px] md:text-[130px] font-black italic text-yellow-300 drop-shadow-[0_10px_30px_rgba(250,204,21,0.9)] leading-none tracking-tighter text-center"
              style={{
                WebkitTextStroke: '3px black',
              }}
            >
              GOOD!
            </div>
            <div className="bg-yellow-400 text-black px-8 py-2 -mt-2 transform -skew-x-12 font-black text-base md:text-lg shadow-2xl border-2 border-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 fill-black" />
              <span>{hitFeedback || '★ NICE RECEIVE! (+1 PT) ★'}</span>
            </div>
          </div>
        )}

        {gameStatus === 'MISS' && (
          <div className="flex flex-col items-center animate-pulse">
            <div
              className="text-[90px] md:text-[130px] font-black italic text-red-500 drop-shadow-[0_10px_30px_rgba(239,68,68,0.9)] leading-none tracking-tighter text-center"
              style={{
                WebkitTextStroke: '3px black',
              }}
            >
              MISS...
            </div>
            <div className="bg-neutral-900/95 text-red-400 border-2 border-red-500 px-6 py-2 -mt-2 transform -skew-x-12 font-bold text-sm md:text-base shadow-2xl max-w-md text-center">
              {hitFeedback || 'POSISI TANGAN MELESET DARI JALUR BOLA!'}
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Hint (Bottom Left) */}
      <div className="absolute bottom-5 left-6 z-50 pointer-events-none hidden md:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300">
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">←</span>
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">→</span>
        <span className="text-[11px]">Gerak</span>
        <span className="mx-1 text-gray-500">•</span>
        <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">SPASI</span>
        <span className="text-[11px]">Receive Bump</span>
        <span className="mx-1 text-gray-500">•</span>
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">ENTER</span>
        <span className="text-[11px]">Lempar Bola</span>
      </div>
    </div>
  );
}
