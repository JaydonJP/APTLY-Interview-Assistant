"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Pause,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";

export interface EvidencePlayerHandle {
  seek: (seconds: number) => void;
  play: () => void;
}

interface EvidencePlayerProps {
  src?: string | null;
  onTimeChange?: (seconds: number) => void;
  onDurationChange?: (seconds: number) => void;
}

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

export const EvidencePlayer = forwardRef<
  EvidencePlayerHandle,
  EvidencePlayerProps
>(function EvidencePlayer({ src, onTimeChange, onDurationChange }, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);

  useImperativeHandle(ref, () => ({
    seek(seconds: number) {
      if (!videoRef.current) return;
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(seconds, videoRef.current.duration || seconds),
      );
      setCurrentTime(videoRef.current.currentTime);
      onTimeChange?.(videoRef.current.currentTime);
    },
    play() {
      void videoRef.current?.play().catch(() => undefined);
    },
  }));

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const seekPercent = (value: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = (value / 100) * video.duration;
    setCurrentTime(video.currentTime);
    onTimeChange?.(video.currentTime);
  };

  const changeVolume = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = value / 100;
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setMuted(next === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const changeSpeed = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = value;
    setSpeed(value);
  };

  if (!src) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-[1.35rem] border border-white/[0.07] bg-black text-center">
        <RotateCcw className="h-5 w-5 text-zinc-700" />
        <p className="mt-4 text-sm font-medium text-zinc-400">
          Recording unavailable
        </p>
        <p className="mt-2 max-w-xs text-xs leading-5 text-zinc-700">
          Transcript and measured evidence remain available for this answer.
        </p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-black shadow-[0_2rem_5rem_rgba(0,0,0,0.26)]">
      <video
        ref={videoRef}
        src={src}
        playsInline
        className="h-full w-full object-contain"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          const nextDuration = videoRef.current?.duration || 0;
          setDuration(nextDuration);
          onDurationChange?.(nextDuration);
        }}
        onTimeUpdate={() => {
          const nextTime = videoRef.current?.currentTime || 0;
          setCurrentTime(nextTime);
          onTimeChange?.(nextTime);
        }}
      />

      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play recording"
          className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:scale-105 hover:bg-black/75"
        >
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/72 to-transparent px-4 pb-4 pt-16 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <div className="flex items-center gap-3">
          <span className="w-10 font-mono text-[0.65rem] tabular-nums text-zinc-400">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(event) => seekPercent(Number(event.target.value))}
            aria-label="Recording progress"
            className="h-1 flex-1 cursor-pointer accent-white"
          />
          <span className="w-10 text-right font-mono text-[0.65rem] tabular-nums text-zinc-400">
            {formatTime(duration)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause recording" : "Play recording"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-200 transition hover:bg-white/[0.1]"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute recording" : "Mute recording"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.1] hover:text-zinc-200"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : volume > 0.5 ? <Volume2 className="h-4 w-4" /> : <Volume1 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume * 100}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label="Recording volume"
              className="hidden h-1 w-20 cursor-pointer accent-white sm:block"
            />
          </div>
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-black/25 p-0.5">
            {[0.75, 1, 1.25, 1.5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => changeSpeed(value)}
                aria-pressed={speed === value}
                className={`rounded-md px-2 py-1 text-[0.65rem] font-medium transition ${
                  speed === value
                    ? "bg-white/[0.12] text-white"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {value}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
