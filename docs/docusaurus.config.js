// @ts-check
// Note: type annotations allow type checking and IDE autocompletion

import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'MdStyled',
  tagline: 'Refined Markdown previews, styled with real CSS & JavaScript',
  favicon: 'img/favicon.svg',

  // Set the production url of your site here
  url: 'https://osamaabusitta.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/MDStyled/',

  // GitHub pages deployment config.
  organizationName: 'OsamaAbuSitta',
  projectName: 'MDStyled',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/OsamaAbuSitta/MDStyled/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'MdStyled',
        logo: {
          alt: 'MdStyled Logo',
          src: 'img/logo.svg',
        },
        items: [
          { to: '/docs/intro', label: 'Docs', position: 'left' },
          { to: '/docs/syntax', label: 'Syntax', position: 'left' },
          { to: '/docs/templates', label: 'Templates', position: 'left' },
          { to: '/docs/editing', label: 'Editing', position: 'left' },
          {
            href: 'https://github.com/OsamaAbuSitta/MDStyled',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Introduction', to: '/docs/intro' },
              { label: 'Installation', to: '/docs/install' },
              { label: 'Core Syntax', to: '/docs/syntax' },
              { label: 'Templates', to: '/docs/templates' },
            ],
          },
          {
            title: 'Features',
            items: [
              { label: 'Interactive Templates', to: '/docs/interactive' },
              { label: 'In-Preview Editing', to: '/docs/editing' },
              { label: 'Commands', to: '/docs/commands' },
              { label: 'Auto-discovery', to: '/docs/auto-discovery' },
              { label: 'Built-in Extras', to: '/docs/extras' },
            ],
          },
          {
            title: 'More',
            items: [
              { label: 'Development', to: '/docs/development' },
              { label: 'How it works', to: '/docs/how-it-works' },
              {
                label: 'GitHub',
                href: 'https://github.com/OsamaAbuSitta/MDStyled',
              },
              { label: 'License', to: '/docs/about' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Osama Abu-Sitta. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.vsDark,
        additionalLanguages: ['css', 'json', 'bash', 'typescript'],
      },
    }),
};

export default config;
