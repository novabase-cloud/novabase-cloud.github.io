export function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return '--';
  let sizeFormat = 'binary';
  try {
    const stored = localStorage.getItem('novabase.settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.sizeFormat === 'decimal' || parsed.sizeFormat === 'binary') {
        sizeFormat = parsed.sizeFormat;
      }
    }
  } catch (_) {
    /* ignore */
  }
  const base = sizeFormat === 'decimal' ? 1000 : 1024;
  const units = sizeFormat === 'decimal'
    ? ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    : ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / Math.pow(base, i);
  const decimals = i === 0 ? 0 : value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[i]}`;
}

export function getExtension(name) {
  if (!name) return '';
  const idx = name.lastIndexOf('.');
  if (idx === -1 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}

const DOTFILE_KIND = {
  '.gitignore': 'gitignore',
  '.gitattributes': 'gitattributes',
  '.dockerignore': 'dockerignore',
  '.editorconfig': 'editorconfig',
  '.npmrc': 'npmrc',
  '.babelrc': 'babelrc',
  '.eslintrc': 'eslintrc',
  '.prettierrc': 'prettierrc',
  '.env': 'env'
};

const NAMED_FILE_KIND = {
  dockerfile: 'dockerfile',
  containerfile: 'containerfile',
  makefile: 'makefile',
  rakefile: 'rakefile',
  gemfile: 'gemfile',
  procfile: 'procfile',
  license: 'text',
  readme: 'text',
  changelog: 'text',
  contributing: 'text',
  authors: 'text'
};

export function getFileKey(name) {
  if (!name) return '';
  const baseName = name.split('/').pop();
  const lower = baseName.toLowerCase();

  if (DOTFILE_KIND[lower]) {
    return DOTFILE_KIND[lower];
  }

  if (NAMED_FILE_KIND[lower]) {
    return NAMED_FILE_KIND[lower];
  }

  return getExtension(baseName);
}

export function getBaseName(path) {
  if (!path) return '';
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

export function getParentPath(path) {
  if (!path) return '';
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

export function joinPath(base, name) {
  if (!base) return name;
  return `${base}/${name}`;
}

export function debounce(fn, wait = 250) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}
