import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function AuthenticatedUserAvatar({
  userId,
  hasPicture,
  alt,
  imageClassName = "",
  placeholderClassName = "",
}) {
  const [pictureUrl, setPictureUrl] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setPictureUrl(null);
    setLoadFailed(false);
    if (!userId || !hasPicture) return undefined;

    let objectUrl;
    let cancelled = false;
    const controller = new AbortController();

    fetch(`${API_BASE_URL}/users/${userId}/avatar/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPictureUrl(objectUrl);
      })
      .catch((error) => {
        if (error.name !== "AbortError" && !cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, hasPicture]);

  if (pictureUrl && !loadFailed) {
    return <img src={pictureUrl} alt={alt} className={imageClassName} onError={() => setLoadFailed(true)} />;
  }

  return (
    <div className={placeholderClassName} aria-label={alt}>
      <span className="material-symbols-outlined">person</span>
    </div>
  );
}
