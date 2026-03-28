export default function Verdict({ children }) {
  if (!children) return null
  return <p className="verdict">{children}</p>
}
