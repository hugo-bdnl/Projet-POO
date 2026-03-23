import type { RoverPhoto } from "../types/rovers";

interface RoverPhotoGalleryProps {
  photos?: RoverPhoto[];
  galleryUrl: string | null;
}

/**
 * Galerie photos d'un rover.
 * Affiche les photos statiques si disponibles, sinon un placeholder.
 */
export function RoverPhotoGallery({
  photos,
  galleryUrl,
}: RoverPhotoGalleryProps) {
  if (!photos || photos.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#667",
          gap: "16px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", opacity: 0.4 }}>📷</div>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
          Photos à venir
        </p>
        {galleryUrl && (
          <a
            href={galleryUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#00b4d8",
              fontSize: "0.85rem",
              textDecoration: "none",
              borderBottom: "1px solid rgba(0, 180, 216, 0.3)",
              paddingBottom: "2px",
            }}
          >
            Voir la galerie officielle
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "8px",
        padding: "8px",
        overflowY: "auto",
        maxHeight: "100%",
      }}
    >
      {photos.map((photo, i) => (
        <div key={i} style={{ position: "relative" }}>
          <img
            src={photo.src}
            alt={photo.caption}
            loading="lazy"
            style={{
              width: "100%",
              borderRadius: "6px",
              aspectRatio: "1",
              objectFit: "cover",
              background: "#111",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "4px 6px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
              borderRadius: "0 0 6px 6px",
              fontSize: "0.7rem",
              color: "#aaa",
            }}
          >
            {photo.caption}
          </div>
        </div>
      ))}
    </div>
  );
}
