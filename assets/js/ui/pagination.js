import { el } from '../utils/dom.js';
import { navigate } from '../router.js';

export function renderPagination({ pagination, path, search, extension, sort }) {
  if (!pagination) {
    return null;
  }
  const { total_items, current_page, total_pages, limit_per_page } = pagination;

  if (total_pages <= 1) {
    const start = total_items === 0 ? 0 : 1;
    const end = total_items;
    return el('div', { class: 'pagination' }, [
      el(
        'div',
        {},
        total_items === 0
          ? 'No objects to display.'
          : `Showing ${start} - ${end} of ${total_items} objects.`
      ),
      el('div', { class: 'pagination-buttons' }, [
        el('button', { class: 'pagination-btn', disabled: true }, 'Previous'),
        el('button', { class: 'pagination-btn', disabled: true }, 'Next')
      ])
    ]);
  }

  const start = (current_page - 1) * (typeof limit_per_page === 'number' ? limit_per_page : 0) + 1;
  const end = Math.min(current_page * (typeof limit_per_page === 'number' ? limit_per_page : 0), total_items);

  const prev = el(
    'button',
    {
      class: 'pagination-btn',
      disabled: current_page <= 1,
      onClick: () => navigate({ path, search, extension, sort, page: current_page - 1 })
    },
    'Previous'
  );
  const next = el(
    'button',
    {
      class: 'pagination-btn',
      disabled: current_page >= total_pages,
      onClick: () => navigate({ path, search, extension, sort, page: current_page + 1 })
    },
    'Next'
  );

  return el('div', { class: 'pagination' }, [
    el('div', null, [
      'Showing ',
      el('strong', {}, `${start} - ${end}`),
      ' of ',
      el('strong', {}, String(total_items)),
      ' objects (page ',
      el('strong', {}, `${current_page}/${total_pages}`),
      ')'
    ]),
    el('div', { class: 'pagination-buttons' }, [prev, next])
  ]);
}
