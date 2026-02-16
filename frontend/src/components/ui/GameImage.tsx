/**
 * Компонент изображения с fallback-заглушкой.
 */
import { useState } from 'react'
import { normalizeMediaUrl } from '../../utils/getAssetUrl'

interface Props {
  src: string
  fallback: string
  alt?: string
  className?: string
}

export default function GameImage({ src, fallback, alt = '', className = '' }: Props) {
  const [errored, setErrored] = useState(false)

  return (
    <img
      src={errored ? fallback : normalizeMediaUrl(src)}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => { if (!errored) setErrored(true) }}
    />
  )
}
