import { el } from '../utils/dom.js';
import { navigate } from '../router.js';

export function renderPagination({ pagination, path, search, extension, sort }) {
  if (!pagination) {
    return null;
  }
  
  // Ensure all values are numbers to prevent NaN
  const total_items = Number(pagination.total_items) || 0;
  const current_page = Number(pagination.current_page) || 1;
  const total_pages = Number(pagination.total_pages) || 0;
  const limit_per_page = Number(pagination.limit_per_page) || 25;

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

  const start = (current_page - 1) * limit_per_page + 1;
  const end = Math.min(current_page * limit_per_page, total_items);

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
