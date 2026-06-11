import { $, el, mount } from '../utils/dom.js';

export async function renderVersionView() {
  const container = el('div', { class: 'version-view' }, [
    el('h2', { class: 'version-heading' }, 'Deploy Version Manifest')
  ]);

  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entries = Object.entries(data.files || {}).sort(([a], [b]) => a.localeCompare(b));

    container.append(el('div', { class: 'version-summary' }, [
      el('div', { class: 'version-summary-row' }, [
        el('span', { class: 'version-summary-label' }, 'Overall Hash'),
        el('code', { class: 'version-overall-hash' }, data.overall || 'N/A')
      ]),
      el('div', { class: 'version-summary-row' }, [
        el('span', { class: 'version-summary-label' }, 'Files'),
        el('span', { class: 'version-summary-value' }, `${entries.length}`)
      ])
    ]));

    const table = el('table', { class: 'version-table' });
    const thead = el('thead', null, [
      el('tr', null, [
        el('th', { class: 'version-col-num' }, '#'),
        el('th', { class: 'version-col-path' }, 'Path'),
        el('th', { class: 'version-col-hash' }, 'SHA-256')
      ])
    ]);
    const tbody = el('tbody');

    for (let i = 0; i < entries.length; i++) {
      const [path, hash] = entries[i];
      tbody.append(el('tr', null, [
        el('td', { class: 'version-col-num' }, String(i + 1)),
        el('td', { class: 'version-col-path' }, path),
        el('td', { class: 'version-col-hash' }, [el('code', null, hash)])
      ]));
    }

    table.append(thead, tbody);
    container.append(table);
  } catch (err) {
    container.append(el('div', { class: 'version-error' }, [
      el('p', null, [`Failed to load version.json — ${err.message}`])
    ]));
  }

  return container;
}
