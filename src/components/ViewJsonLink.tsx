interface Props {
  title?: string;
  onClick: () => void;
}

function EyeIcon() {
  return (
    <svg
      className="view-json-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function ViewJsonLink({
  title = 'View JSON',
  onClick,
}: Props) {
  return (
    <button
      type="button"
      className="icon-action-btn"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <EyeIcon />
    </button>
  );
}
