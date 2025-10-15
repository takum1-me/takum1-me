import React from "react";
import OverlayCard from "../../shared/card/OverlayCard";

interface SongData {
  title: string;
  artist: string;
  appleMusicUrl: string;
  artworkUrl: string;
}

interface SongCardProps {
  song: SongData;
  className?: string;
}

export default function SongCard({ song, className = "" }: SongCardProps) {
  return (
    <OverlayCard
      title={song.title}
      subtitle={song.artist}
      imageUrl={song.artworkUrl}
      imageAlt={`${song.artist} - ${song.title}`}
      href={song.appleMusicUrl}
      className={`song-card ${className}`}
    />
  );
}
