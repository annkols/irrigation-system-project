import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function AuthenticatedUserAvatar({
  userId,
  hasPicture,
  alt,
  imageClassName = "",
  placeholderClassName = "",
}) {
  const requestKey = userId && hasPicture ? String(userId) : "";
  const [avatar, setAvatar] = useState({ key: "", pictureUrl: null, loadFailed: false });
  const currentAvatar = avatar.key === requestKey
    ? avatar
    : { key: requestKey, pictureUrl: null, loadFailed: false };

  useEffect(() => {
    if (!requestKey) return undefined;

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
        setAvatar({ key: requestKey, pictureUrl: objectUrl, loadFailed: false });
      })
      .catch((error) => {
        if (error.name !== "AbortError" && !cancelled) {
          setAvatar({ key: requestKey, pictureUrl: null, loadFailed: true });
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [requestKey, userId]);

  if (currentAvatar.pictureUrl && !currentAvatar.loadFailed) {
    return (
      <img
        src={currentAvatar.pictureUrl}
        alt={alt}
        className={imageClassName}
        onError={() => setAvatar((current) => ({ ...current, loadFailed: true }))}
      />
    );
  }

  return (
    <div className={placeholderClassName} aria-label={alt}>
      <span className="material-symbols-outlined">person</span>
    </div>
  );
}
