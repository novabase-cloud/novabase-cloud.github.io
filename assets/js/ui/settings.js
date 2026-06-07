import { el } from '../utils/dom.js';
import {
  getSettings,
  updateSettings,
  removeRecentSearch,
  clearRecentSearches
} from '../settings.js';
import { navigate } from '../router.js';

const SORT_OPTIONS = [
  { value: '', label: 'Default order' },
  { value: 'name_asc', label: 'Name (A - Z)' },
  { value: 'name_desc', label: 'Name (Z - A)' },
  { value: 'size_asc', label: 'Smallest size' },
  { value: 'size_desc', label: 'Largest size' }
];

function formatTimestamp(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch (_) {
    return '';
  }
}

function buildRecentList(recent, onPick, onRemove) {
  if (!recent.length) {
    return el('p', { class: 'settings-empty' }, 'No recent searches yet.');
  }
  return el(
    'ul',
    { class: 'settings-recent-list', role: 'list' },
    recent.map((item) => {
      const removeBtn = el(
        'button',
        {
          type: 'button',
          class: 'btn-icon',
          'aria-label': `Remove "${item.query}" from history`,
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(item.query);
          }
        },
        ['×']
      );
      const pickBtn = el(
        'button',
        {
          type: 'button',
          class: 'settings-recent-item',
          onClick: (e) => {
            e.preventDefault();
            onPick(item);
          }
        },
        [
          el('span', { class: 'settings-recent-query' }, [item.query]),
          el('span', { class: 'settings-recent-meta' }, [
            item.path ? `in /${item.path}` : 'in root',
            ' · ',
            formatTimestamp(item.timestamp)
          ])
        ]
      );
      return el('li', { class: 'settings-recent-row' }, [pickBtn, removeBtn]);
    })
  );
}

export function renderSettingsView() {
  const settings = getSettings();

  const sizeFormatSelect = el('select', { class: 'select-input' }, [
    el('option', { value: 'binary' }, 'Binary (KiB, MiB)'),
    el('option', { value: 'decimal' }, 'Decimal (KB, MB)')
  ]);
  sizeFormatSelect.value = settings.sizeFormat;
  sizeFormatSelect.addEventListener('change', () => {
    updateSettings({ sizeFormat: sizeFormatSelect.value });
  });

  const showHiddenCheckbox = el('input', {
    type: 'checkbox',
    id: 'setting-show-hidden'
  });
  showHiddenCheckbox.checked = !!settings.showHidden;
  showHiddenCheckbox.addEventListener('change', () => {
    updateSettings({ showHidden: showHiddenCheckbox.checked });
  });

  const defaultSortSelect = el('select', { class: 'select-input' },
    SORT_OPTIONS.map((opt) =>
      el('option', { value: opt.value }, opt.label)
    )
  );
  defaultSortSelect.value = settings.defaultSort || '';
  defaultSortSelect.addEventListener('change', () => {
    updateSettings({ defaultSort: defaultSortSelect.value });
  });

  const itemsPerPageInput = el('input', {
    type: 'number',
    min: '5',
    max: '100',
    step: '5',
    class: 'text-input',
    id: 'setting-items-per-page'
  });
  itemsPerPageInput.value = String(settings.itemsPerPage);
  itemsPerPageInput.addEventListener('change', () => {
    const val = parseInt(itemsPerPageInput.value, 10);
    if (!Number.isNaN(val) && val > 0) {
      updateSettings({ itemsPerPage: val });
    }
  });

  const handlePick = (item) => {
    navigate({
      path: item.path || '',
      search: item.query,
      extension: '',
      sort: '',
      page: 1
    });
  };

  const handleRemove = (query) => { removeRecentSearch(query); };
  const handleClearAll = () => { clearRecentSearches(); };

  const listNode = buildRecentList(settings.recentSearches, handlePick, handleRemove);

  const clearAllBtn = el(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost btn-sm',
      onClick: (e) => {
        e.preventDefault();
        if (getSettings().recentSearches.length === 0) return;
        handleClearAll();
      }
    },
    ['Clear all']
  );

  return el('div', { class: 'settings-view' }, [
    el('header', { class: 'settings-header' }, [
      el('div', null, [
        el('h1', { class: 'settings-title' }, ['Settings']),
        el('p', { class: 'settings-subtitle' }, [
          'Customize your browsing experience. Changes are saved automatically.'
        ])
      ])
    ]),

    el('section', { class: 'settings-section' }, [
      el('h2', { class: 'settings-section-title' }, ['Search history']),
      el('p', { class: 'settings-section-desc' }, [
        'Quickly revisit recent searches. The 10 most recent entries are kept.'
      ]),
      listNode,
      el('div', { class: 'settings-actions' }, [clearAllBtn])
    ]),

    el('section', { class: 'settings-section' }, [
      el('h2', { class: 'settings-section-title' }, ['File sizes']),
      el('div', { class: 'settings-row' }, [
        el('label', { for: 'setting-size-format' }, ['Size format:']),
        sizeFormatSelect
      ]),
      el('p', { class: 'settings-hint' }, [
        'Binary uses powers of 1024 (e.g. 1 KiB = 1024 B). ',
        'Decimal uses powers of 1000 (e.g. 1 KB = 1000 B).'
      ])
    ]),

    el('section', { class: 'settings-section' }, [
      el('h2', { class: 'settings-section-title' }, ['Display']),
      el('div', { class: 'settings-row' }, [
        el('label', { for: 'setting-show-hidden' }, [
          showHiddenCheckbox,
          ' Show hidden files (starting with a dot)'
        ])
      ]),
      el('div', { class: 'settings-row' }, [
        el('label', { for: 'setting-default-sort' }, ['Default sort:']),
        defaultSortSelect
      ]),
      el('div', { class: 'settings-row' }, [
        el('label', { for: 'setting-items-per-page' }, ['Items per page:']),
        itemsPerPageInput
      ])
    ]),

    el('section', { class: 'settings-section' }, [
      el('h2', { class: 'settings-section-title' }, ['About']),
      el('dl', { class: 'settings-about' }, [
        el('div', null, [
          el('dt', null, ['API endpoint']),
          el('dd', null, [el('code', null, [window.location.origin || 'Origin'])])
        ]),
        el('div', null, [
          el('dt', null, ['Build']),
          el('dd', null, [el('span', { id: 'settings-build-id' }, ['v1.0.0'])])
        ])
      ])
    ])
  ]);
}
