// Reusable filter tile row used across all pages.
// Each tile shows a label + count. Clicking it sets/clears a filter.

export function FilterTiles({ tiles, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tiles.map((tile) => {
        const isActive = selected === tile.value;
        return (
          <button
            key={tile.value ?? tile.label}
            onClick={() => onSelect(isActive ? null : tile.value)}
            className={`
              flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-all min-w-[90px]
              ${isActive
                ? 'bg-brand-600 border-brand-600 text-white shadow-md'
                : 'bg-white border-gray-200 text-gray-700 hover:border-brand-400 hover:shadow-sm'
              }
            `}
          >
            <span className={`text-xl font-bold leading-none ${isActive ? 'text-white' : 'text-gray-900'}`}>
              {tile.count}
            </span>
            <span className={`text-xs mt-1 leading-tight ${isActive ? 'text-brand-100' : 'text-gray-500'}`}>
              {tile.label}
            </span>
            {tile.sub != null && (
              <span className={`text-xs font-medium mt-0.5 ${isActive ? 'text-brand-200' : 'text-gray-400'}`}>
                {tile.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
