import { el, icon } from '../utils/dom.js';
import { navigate } from '../router.js';
import { store } from '../store.js';
import { debounce } from '../utils/format.js';
import { addRecentSearch, getSettings } from '../settings.js';

const ICONS = {
  search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
  close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
};

const EXTENSION_OPTIONS = [
  { value: '', label: 'All extensions' },
  { value: 'mp4', label: '.mp4 (Video)' },
  { value: 'parquet', label: '.parquet' },
  { value: 'csv', label: '.csv' },
  { value: 'json', label: '.json' },
  { value: 'md', label: '.md (Markdown)' },
  { value: 'txt', label: '.txt' },
  { value: 'py', label: '.py (Python)' },
  { value: 'js', label: '.js (JavaScript)' }
];

const SORT_OPTIONS = [
  { value: '', label: 'Default order' },
  { value: 'name_asc', label: 'Name (A - Z)' },
  { value: 'name_desc', label: 'Name (Z - A)' },
  { value: 'size_asc', label: 'Smallest size' },
  { value: 'size_desc', label: 'Largest size' }
];

function buildOptions(options) {
  return options.map((opt) =>
    el('option', { value: opt.value }, opt.label)
  );
}

function recordSearchDebounced(query) {
  if (!query || !query.trim()) return;
  addRecentSearch(query, store.state.path);
}

export function renderToolbar({ search, extension, sort, path }) {
  const initialExtension = extension || getSettings().defaultSort ? sort || '' : '';
  const sortValue = sort || '';

  const searchInput = el('input', {
    type: 'text',
    class: 'search-input',
    placeholder: 'Search file name...',
    value: search || '',
    'aria-label': 'Search file name',
    autocomplete: 'off',
    spellcheck: 'false'
  });

  const searchClear = el(
    'button',
    {
      type: 'button',
      class: 'search-clear',
      'aria-label': 'Clear search',
      style: { display: search ? 'flex' : 'none' },
      onClick: (e) => {
        e.preventDefault();
        searchInput.value = '';
        searchClear.style.display = 'none';
        navigate({ path: store.state.path, search: '', extension: store.state.extension, sort: store.state.sort, page: 1 });
        searchInput.focus();
      }
    },
    [icon(ICONS.close, 14)]
  );

  const debouncedRecord = debounce(recordSearchDebounced, 600);

  searchInput.addEventListener('input', () => {
    const hasValue = searchInput.value.length > 0;
    searchClear.style.display = hasValue ? 'flex' : 'none';
    debouncedRecord(searchInput.value);
  });

  const debouncedSearch = debounce((value) => {
    navigate({
      path: store.state.path,
      search: value,
      extension: store.state.extension,
      sort: store.state.sort,
      page: 1
    });
  }, 300);

  searchInput.addEventListener('input', () => {
    debouncedSearch(searchInput.value);
  });

  const extSelect = el(
    'select',
    {
      class: 'select-input',
      'aria-label': 'Filter by extension'
    },
    buildOptions(EXTENSION_OPTIONS)
  );
  extSelect.value = extension || '';

  extSelect.addEventListener('change', () => {
    navigate({
      path: store.state.path,
      search: store.state.search,
      extension: extSelect.value,
      sort: store.state.sort,
      page: 1
    });
  });

  const sortSelect = el(
    'select',
    {
      class: 'select-input',
      'aria-label': 'Sort order'
    },
    buildOptions(SORT_OPTIONS)
  );
  sortSelect.value = sortValue;

  sortSelect.addEventListener('change', () => {
    navigate({
      path: store.state.path,
      search: store.state.search,
      extension: store.state.extension,
      sort: sortSelect.value,
      page: 1
    });
  });

  const unsubscribe = store.subscribe((state) => {
    if (document.activeElement !== searchInput) {
      const target = state.search || '';
      if (searchInput.value !== target) {
        searchInput.value = target;
        searchClear.style.display = target ? 'flex' : 'none';
      }
    }
    const targetExt = state.extension || '';
    if (extSelect.value !== targetExt) {
      extSelect.value = targetExt;
    }
    const targetSort = state.sort || '';
    if (sortSelect.value !== targetSort) {
      sortSelect.value = targetSort;
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      debouncedSearch(searchInput.value);
    }
    if (e.key === 'Escape' && searchInput.value) {
      e.preventDefault();
      searchInput.value = '';
      searchClear.style.display = 'none';
      navigate({ path: store.state.path, search: '', extension: store.state.extension, sort: store.state.sort, page: 1 });
    }
  });

  const node = el('div', { class: 'toolbar' }, [
    el('div', { class: 'toolbar-grid' }, [
      el('div', { class: 'input-with-icon' }, [
        el('span', { class: 'icon' }, [icon(ICONS.search, 16)]),
        searchInput,
        searchClear
      ]),
      extSelect,
      sortSelect
    ])
  ]);

  node._cleanup = () => unsubscribe();
  return node;
}
