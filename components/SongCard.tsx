"use client";

import Image from "next/image";
import { Plus, Bookmark } from "lucide-react";
import { formatDuration, scoreColor } from "@/lib/utils";
import { Rating, Song } from "@/types";

interface SongCardProps {
  song: Song;
  rating?: Rating;
  onRate?: (song: Song) => void;
  onBookmark?: (song: Song) => void;
  compact?: boolean;
}

export default function SongCard({
  song,
  rating,
  onRate,
  onBookmark,
  compact = false,
}: SongCardProps) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      {/* Album art */}
      <div className="relative shrink-0 rounded-xl overflow-hidden bg-slate-100" style={{ width: 52, height: 52 }}>
        {song.album_art_url ? (
          <Image src={song.album_art_url} alt={song.album_name} fill className="object-cover" sizes="52px" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#4fa8ff]/10 to-[#4fa8ff]/20" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{song.title}</p>
          <span className="text-xs text-white/50 shrink-0 mt-0.5">
            {formatDuration(song.duration_seconds)}
          </span>
        </div>
        <p className="text-xs text-white/50 truncate mt-0.5">{song.artist}</p>
        {rating && (
          <div className="mt-1.5">
            <span className={`text-sm font-bold ${scoreColor(rating.overall_score)}`}>
              {rating.overall_score.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {!compact && (
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => onRate?.(song)}
            className="w-8 h-8 rounded-full bg-[#4fa8ff]/5 hover:bg-[#4fa8ff]/10 flex items-center justify-center transition-colors"
          >
            <Plus size={16} className="text-[#4fa8ff]" />
          </button>
          <button
            onClick={() => onBookmark?.(song)}
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <Bookmark size={15} className="text-white/50" />
          </button>
        </div>
      )}
    </div>
  );
}
