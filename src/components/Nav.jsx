export default function Nav({ onAboutClick }) {
  return (
    <header className="nav">
      <div className="nav__title" aria-hidden="false">
        <span className="nav__title-line">CAN I WATCH THIS MOVIE</span>
        <span className="nav__title-line">WITH MY GRANDMA?</span>
      </div>
      <button type="button" className="nav__about" onClick={onAboutClick}>
        ABOUT
      </button>
    </header>
  )
}
