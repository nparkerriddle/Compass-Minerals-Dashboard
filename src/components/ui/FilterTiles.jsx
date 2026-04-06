// Reusable filter tile row used across all pages.
// Each tile shows a label + count. Clicking it sets/clears a filter.
// Tiles accept an optional `color` prop: blue | green | yellow | orange | red | purple | gray

const THEMES = {
  blue:   { top: 'border-t-blue-500',   grad: 'from-blue-50/60 to-white',   val: 'text-blue-600',   activeBg: 'bg-blue-600' },
  green:  { top: 'border-t-green-500',  grad: 'from-green-50/60 to-white',  val: 'text-green-600',  activeBg: 'bg-green-600' },
  yellow: { top: 'border-t-amber-400',  grad: 'from-amber-50/60 to-white',  val: 'text-amber-600',  activeBg: 'bg-amber-500' },
  orange: { top: 'border-t-orange-400', grad: 'from-orange-50/60 to-white', val: 'text-orange-600', activeBg: 'bg-orange-500' },
  red:    { top: 'border-t-red-500',    grad: 'from-red-50/60 to-white',    val: 'text-red-600',    activeBg: 'bg-red-600' },
  purple: { top: 'border-t-purple-500', grad: 'from-purple-50/60 to-white', val: 'text-purple-600', activeBg: 'bg-purple-600' },
  gray:   { top: 'border-t-gray-400',   grad: 'from-gray-50/60 to-white',   val: 'text-gray-500',   activeBg: 'bg-gray-500' },
};

export function FilterTiles({ tiles, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tiles.map((tile) => {
        const isActive = selected === tile.value;
        const t = THEMES[tile.color] ?? THEMES.blue;
        return (
          <button
            key={tile.value ?? tile.label}
            onClick={() => onSelect(isActive ? null : tile.value)}
            className={`
              flex flex-col items-start px-4 py-3 rounded-xl text-left transition-all duration-200 min-w-[100px] shadow-sm
              ${isActive
                ? `${t.activeBg} shadow-md -translate-y-0.5`
                : `bg-gradient-to-b ${t.grad} border border-gray-100 border-t-[3px] ${t.top} hover:shadow-md hover:-translate-y-0.5`
              }
            `}
          >
            <span className={`text-2xl font-bold leading-none ${isActive ? 'text-white' : t.val}`}>
              {tile.count}
            </span>
            <span className={`text-xs mt-1.5 leading-tight ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
              {tile.label}
            </span>
            {tile.sub != null && (
              <span className={`text-xs font-medium mt-0.5 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                {tile.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
