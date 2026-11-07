
type EdukratePlayerProps = {
  videoId: string;
  title: string;
  autoplay?: boolean;
};

export default function EdukratePlayer({
  videoId,
  title,
  autoplay = false,
}: EdukratePlayerProps) {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${
    autoplay ? 1 : 0
  }&controls=1&rel=0&playsinline=1`;

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
