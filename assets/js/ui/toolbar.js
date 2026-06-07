import { el, icon } from '../utils/dom.js';
import { navigate } from '../router.js';
import { debounce } from '../utils/format.js';

const ICONS = {
  search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>'
};

const EXTENSION_OPTIONS = [
  { value: '', label: 'Semua Ekstensi' },
  { value: 'mp4', label: '.mp4 (Video)' },
  { value: 'parquet', label: '.parquet' },
  { value: 'csv', label: '.csv' },
  { value: 'json', label: '.json' }
];

const SORT_OPTIONS = [
  { value: '', label: 'Urutkan Default' },
  { value: 'name_asc', label: 'Nama (A - Z)' },
  { value: 'name_desc', label: 'Nama (Z - A)' },
  { value: 'size_asc', label: 'Ukuran Terkecil' },
  { value: 'size_desc', label: 'Ukuran Terbesar' }
];

export function renderToolbar({ search, extension, sort, path }) {
  const searchInput = el('input', {
    type: 'text',
    class: 'search-input',
    placeholder: 'Cari nama berkas...',
    value: search || '',
    'aria-label': 'Cari nama berkas',
    onInput: debounce((e) => {
      navigate({ path, search: e.target.value, extension, sort, page: 1 });
    }, 300)
  });

  const extSelect = el(
    'select',
    {
      class: 'select-input',
      'aria-label': 'Filter ekstensi',
      onChange: (e) => {
        navigate({ path, search, extension: e.target.value, sort, page: 1 });
      }
    },
    EXTENSION_OPTIONS.map((opt) =>
      el(
        'option',
        { value: opt.value, selected: (extension || '') === opt.value },
        opt.label
      )
    )
  );

  const sortSelect = el(
    'select',
    {
      class: 'select-input',
      'aria-label': 'Urutkan',
      onChange: (e) => {
        navigate({ path, search, extension, sort: e.target.value, page: 1 });
      }
    },
    SORT_OPTIONS.map((opt) =>
      el('option', { value: opt.value, selected: (sort || '') === opt.value }, opt.label)
    )
  );

  return el('div', { class: 'toolbar' }, [
    el('div', { class: 'toolbar-grid' }, [
      el('div', { class: 'input-with-icon' }, [
        el('span', { class: 'icon' }, [icon(ICONS.search, 16)]),
        searchInput
      ]),
      extSelect,
      sortSelect
    ])
  ]);
}
