// Site-wide constants. Single source of truth — import from here rather
// than hard-coding strings elsewhere. The actual values live in
// ./lib/site-data.js so plain Node (tests, no TypeScript) can import them
// too; see CLAUDE.md.
export * from './lib/site-data.js';
