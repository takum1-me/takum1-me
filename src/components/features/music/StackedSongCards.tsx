interface SongData {
  title: string;
  artist: string;
  appleMusicUrl: string;
  artworkUrl: string;
}

interface SongListProps {
  songs: SongData[];
  /** 表示する上限。省略すると全件 */
  limit?: number;
}

/**
 * よく聴いている曲。アートワークを小さく並べるだけの静的なリスト。
 */
export default function SongList({ songs, limit }: SongListProps) {
  const items = limit ? songs.slice(0, limit) : songs;

  if (items.length === 0) return null;

  return (
    <ul className="song-list">
      {items.map((song) => (
        <li key={song.appleMusicUrl} className="song-list__item">
          <a
            className="song-list__link"
            href={song.appleMusicUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className="song-list__art"
              src={song.artworkUrl}
              alt=""
              loading="lazy"
              aria-hidden="true"
            />
            <span className="song-list__text">
              <span className="song-list__title">{song.title}</span>
              <span className="song-list__artist">{song.artist}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
