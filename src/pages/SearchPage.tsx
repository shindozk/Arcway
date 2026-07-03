import { useState, useCallback } from 'react';
import { SearchBar } from '../components/search/SearchBar';
import { SearchResults } from '../components/search/SearchResults';
import { useSearch } from '../hooks/useSearch';
import { useAnimateOnMount } from '../utils/animations';

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'auto',
  },
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const { results, loading, search } = useSearch();
  const anim = useAnimateOnMount({ variant: 'fadeIn', duration: 300 });

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      search(q);
    },
    [search]
  );

  return (
    <div style={{ ...styles.root, ...anim.style }}>
      <SearchBar onSearch={handleSearch} />
      <SearchResults results={results} loading={loading} query={query} />
    </div>
  );
}
