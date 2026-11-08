export default function Container({ children, className = '' }) {
  return <div className={`mx-auto w-full max-w-container px-7 ${className}`}>{children}</div>;
}
