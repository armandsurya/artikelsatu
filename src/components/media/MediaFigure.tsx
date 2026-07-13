import { useMediaByUrl, resolveAlt } from "@/lib/media/metadata";

type Props = {
  src: string;
  /** Fallback used when the media row has no alt/title (e.g. article title). */
  fallbackAlt?: string;
  className?: string;
  imgClassName?: string;
  /** When true, wraps the image in <figure> and shows caption below. Default: true. */
  showCaption?: boolean;
  loading?: "lazy" | "eager";
  /** Force alt override (rare — prefer using Media Library). */
  altOverride?: string;
};

/**
 * Renders an image using metadata from the Media Library (single source of truth).
 * - `alt` is always populated (fallbacks prevent empty alt).
 * - `<figcaption>` is rendered only when caption exists.
 * - `width`/`height` are set when known to prevent CLS.
 */
export function MediaFigure({
  src,
  fallbackAlt,
  className,
  imgClassName,
  showCaption = true,
  loading = "lazy",
  altOverride,
}: Props) {
  const { data: media } = useMediaByUrl(src);
  const alt = altOverride?.trim() || resolveAlt(media, fallbackAlt);
  const caption = media?.caption?.trim() || "";

  const img = (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      width={media?.width ?? undefined}
      height={media?.height ?? undefined}
      className={imgClassName}
    />
  );

  if (!showCaption || !caption) {
    return <div className={className}>{img}</div>;
  }

  return (
    <figure className={className}>
      {img}
      <figcaption className="mt-2 text-center text-sm italic leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
