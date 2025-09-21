interface SongCardProps {
  title: string;
  artist: string;
  appleMusicUrl: string;
  artworkUrl: string;
}

export default function SongCard({ title, artist, appleMusicUrl, artworkUrl }: SongCardProps) {
  return (
    <a 
      href={appleMusicUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="song-card"
    >
      <img src={artworkUrl} alt={`${title} - ${artist}`} />
      <div className="song-info">
        <div className="song-title">{title}</div>
        <div className="song-artist">{artist}</div>
      </div>
    </a>
  );
}
