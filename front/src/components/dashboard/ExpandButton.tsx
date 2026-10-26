export default function ExpandButton({
  title,
  onClick
}: {
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="candle-btn expand-btn"
      aria-label={`Ampliar ${title}`}
      title="Ampliar"
      onClick={onClick}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9" />
      </svg>
    </button>
  )
}
