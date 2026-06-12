export const API_BASE_URL = 'https://novabase-cloud.mailtestvartext.workers.dev';

export const STORAGE_KEYS = {
  HF_TOKEN: 'novabase.hf.token',
  HF_REFRESH_TOKEN: 'novabase.hf.refresh_token',
  USER_INFO: 'novabase.user.info',
  THEME: 'novabase.theme',
  PATH_HISTORY: 'novabase.path.history',
  SETTINGS: 'novabase.settings',
  SIDEBAR_OPEN: 'novabase.sidebar.open',
  PREV_REPO: 'novabase.prev.repo'
};

export const DEFAULTS = {
  ITEMS_PER_PAGE: 25,
  PATH: '',
  SEARCH: '',
  EXTENSION: '',
  SORT: '',
  PAGE: 1
};

export const HASH_PREFIX = '#h-';

export const TEXT_PREVIEW_MAX_BYTES = 2 * 1024 * 1024;

export const FILE_TYPES = {
  VIDEO: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv'],
  AUDIO: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm'],
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'heif', 'avif', 'tiff', 'tif'],
  JSON: ['json'],
  CSV: ['csv', 'tsv'],
  TEXT: [
    'txt', 'text', 'log', 'rtf', 'md', 'markdown', 'rst', 'adoc',
    'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg', 'env', 'properties',
    'xml', 'xsl', 'xslt', 'rss', 'atom',
    'html', 'htm', 'xhtml', 'svg', 'vue', 'svelte', 'astro', 'liquid',
    'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'css', 'scss', 'sass', 'less', 'styl',
    'py', 'rb', 'php', 'pl', 'perl',
    'java', 'kt', 'kts', 'scala', 'clj', 'cljs', 'groovy',
    'go', 'rs', 'swift', 'm', 'mm',
    'c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hxx',
    'cs', 'fs', 'vb',
    'dart', 'lua', 'r',
    'ex', 'exs', 'erl', 'hrl', 'hs',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
    'sql', 'graphql', 'gql', 'proto',
    'vim', 'vimrc', 'el',
    'dockerfile', 'containerfile', 'makefile', 'mk', 'cmake', 'gradle',
    'diff', 'patch', 'po',
    'editorconfig', 'gitignore', 'gitattributes', 'dockerignore',
    'npmrc', 'babelrc', 'eslintrc', 'prettierrc', 'lock'
  ]
};

export const CODE_LANG_HINT = {
  js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JavaScript',
  ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', rb: 'Ruby', php: 'PHP', java: 'Java',
  go: 'Go', rs: 'Rust', swift: 'Swift', kt: 'Kotlin', kts: 'Kotlin',
  c: 'C', h: 'C Header', cpp: 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++',
  cs: 'C#', scala: 'Scala', clj: 'Clojure',
  sh: 'Shell', bash: 'Bash', zsh: 'Zsh', fish: 'Fish', ps1: 'PowerShell',
  html: 'HTML', htm: 'HTML', xml: 'XML', svg: 'SVG',
  css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
  md: 'Markdown', sql: 'SQL', graphql: 'GraphQL',
  vue: 'Vue', svelte: 'Svelte',
  dockerfile: 'Dockerfile', makefile: 'Makefile',
  env: 'Env', gitignore: 'Git', editorconfig: 'EditorConfig'
};
