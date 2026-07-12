import { useEffect, useId, useState } from 'react';
import { LoaderCircle, MapPin, Search } from 'lucide-react';

import { searchLocations } from '../../api/locations';

export default function AddressAutocomplete({ label, value, onChange, onSelect, required = false }) {
  const inputId = useId();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setQuery(value);
    if (!value) setSelected(false);
  }, [value]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (selected || normalizedQuery.length < 3) {
      setResults([]);
      setOpen(false);
      setError('');
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await searchLocations(normalizedQuery, controller.signal);
        const suggestions = response.data.data ?? [];
        setResults(suggestions);
        setActiveIndex(-1);
        setOpen(true);
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') {
          setResults([]);
          setOpen(true);
          setError(
            requestError.response?.data?.error?.message ?? 'Could not search locations. Try again.'
          );
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  const handleInput = (event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    setSelected(false);
    onChange(nextValue);
  };

  const chooseLocation = (location) => {
    setQuery(location.label);
    setSelected(true);
    setResults([]);
    setOpen(false);
    setError('');
    onSelect(location);
  };

  const handleKeyDown = (event) => {
    if (!open || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      chooseLocation(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs uppercase tracking-wider text-slate-400"
      >
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${inputId}-suggestions`}
          autoComplete="off"
          required={required}
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Start typing an address or landmark"
          className="input-base rounded-md py-2 pl-9 pr-9"
        />
        {loading && (
          <LoaderCircle className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-amber-400" />
        )}
      </div>

      {open && (
        <div
          id={`${inputId}-suggestions`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md glass-panel shadow-xl"
        >
          {error ? (
            <p className="px-3 py-3 text-xs text-red-400">{error}</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-500">No matching locations found.</p>
          ) : (
            results.map((location, index) => (
              <button
                key={location.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={() => chooseLocation(location)}
                className={`flex w-full items-start gap-2 border-b border-white/5 px-3 py-2.5 text-left last:border-0 ${
                  index === activeIndex ? 'bg-slate-800' : 'hover:bg-slate-800'
                }`}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  <span className="block text-sm text-slate-200">{location.label}</span>
                  {(location.city || location.state) && (
                    <span className="block text-xs text-slate-500">
                      {[location.city, location.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
          <p className="border-t border-white/5 px-3 py-1.5 text-right text-[10px] text-slate-600">
            Powered by Geoapify
          </p>
        </div>
      )}
    </div>
  );
}
