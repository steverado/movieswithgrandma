export default function SearchBar({ value, onChange, onSearch, disabled }) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Glass Onion"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        disabled={disabled}
        autoComplete="off"
        spellCheck="false"
        aria-label="Movie title"
      />
      <button
        type="button"
        className="search-bar__submit"
        onClick={onSearch}
        disabled={disabled}
        aria-label="Search"
      >
        🍆
      </button>
    </div>
  )
}
