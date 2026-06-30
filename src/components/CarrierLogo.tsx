import { useState } from 'react';

interface Props {
  url: string | null | undefined;
  name: string;
  size?: 'sm' | 'md';
}

function initialsFromName(name: string): string {
  return (
    name
      .replace(/\(.*\)/, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export default function CarrierLogo({ url, name, size = 'md' }: Props) {
  const [failed, setFailed] = useState(false);
  const initials = initialsFromName(name);
  const showImage = url && !failed;

  return (
    <span
      className={`carrier-logo-box carrier-logo-${size}${showImage ? '' : ' carrier-logo-fallback'}`}
      title={name}
    >
      {showImage ? (
        <img
          src={url}
          alt={`${name} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="carrier-logo-initials">{initials}</span>
      )}
    </span>
  );
}
