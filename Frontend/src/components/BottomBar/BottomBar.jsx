export function BottomBar({ activeKey, onChange }) {
  const items = [
    { key: 'timer', label: 'Timer' },
    { key: 'a', label: 'Option A' },
    { key: 'b', label: 'Option B' },
    { key: 'c', label: 'Option C' },
  ];

  return (
    <nav className="bottom-bar" aria-label="Bottom navigation">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`bottom-bar__item ${activeKey === item.key ? 'is-active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

