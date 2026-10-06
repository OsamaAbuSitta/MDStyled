import React, { useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Heading from '@theme/Heading';

const features = [
  {
    icon: '🎨',
    title: 'From Markdown to masterpiece',
    body: 'MdStyled compiles Markdown into polished, real HTML, then hands you the reins. Shape every detail with the web technologies you already know.',
  },
  {
    icon: '⚡',
    title: 'CSS & JavaScript at full power',
    body: 'Attach .css and .js via directives or frontmatter. Layouts, themes, charts, interactions, animations. No limits, no preview markup.',
  },
  {
    icon: '🤖',
    title: 'Built for the AI generation',
    body: 'Clean, portable Markdown stays the source of truth: the format AI agents read, write, and version best. Styling never bleeds into content.',
  },
  {
    icon: '✨',
    title: 'Invisible selectors',
    body: 'Apply classes, IDs, and attributes with HTML comments that vanish in the preview. Pure intent, zero clutter.',
  },
  {
    icon: '🧭',
    title: 'Auto-discovery',
    body: 'Companion .css and .js files are loaded automatically. Match filenames and MdStyled wires everything up for you.',
  },
  {
    icon: '🧩',
    title: 'Mermaid diagrams',
    body: 'Render flowcharts, sequence diagrams, and more straight from fenced code blocks. No plugins, no setup.',
  },
  {
    icon: '📊',
    title: 'Interactive tables',
    body: 'Search, sort, and paginate Markdown tables out of the box, as proof of what the engine enables.',
  },
  {
    icon: '✏️',
    title: 'Edit in the preview',
    body: 'Editable templates refine Markdown blocks right in the styled, live view. Save, and it re-renders instantly.',
  },
  {
    icon: '🗂️',
    title: 'Card designer',
    body: 'Lay out card grids visually: add, remove, and reorder cards, edit headers and content, and set columns and rows. It saves back as plain Markdown.',
  },
];

const heroCode = `<!-- @style: ./theme.css -->
<!-- @script: ./behavior.js -->

# Product Brief

<!-- .hero -->
Build polished Markdown documents
with normal web tools.`;

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  const eyesRef = useRef(null);

  useEffect(() => {
    const el = eyesRef.current;
    if (!el) return;
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      el.style.backgroundPosition = `${50 + x / 6}% ${50 + y / 6}%`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <Layout title={siteConfig.tagline} description="Turn Markdown into refined HTML experiences styled with real CSS & JavaScript, live in VS Code, with clean and portable source.">
      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hero__eyes" ref={eyesRef}
            style={{
              background: 'radial-gradient(circle at 30% 40%, rgba(168,85,247,0.18), transparent 45%), radial-gradient(circle at 70% 60%, rgba(34,211,238,0.16), transparent 45%)',
              transition: 'background-position 0.2s ease',
            }}
          />
          <div className="hero__inner">
            <span className="hero__eyebrow">✦ VS Code extension</span>
            <h1 className="hero__title">
              Markdown, <br /> magnificently styled.
            </h1>
            <p className="hero__subtitle">
              MdStyled turns Markdown into a refined HTML experience you shape
              with real CSS and JavaScript, rendered live in VS Code while your
              source stays clean, portable, and AI-friendly.
            </p>
            <div className="hero__actions">
              <Link className="button button--primary button--lg" to="/docs/intro">
                Get started
              </Link>
              <Link className="button button--secondary button--lg" href="https://marketplace.visualstudio.com/items?itemName=OAS.mdstyled">
                Install
              </Link>
            </div>
          </div>

          <div className="hero__demo">
            <div className="demo-window">
              <div className="demo-window__bar">
                <span className="demo-window__dot" />
                <span className="demo-window__dot" />
                <span className="demo-window__dot" />
                <span className="demo-window__title">launch.md - MdStyled Preview</span>
              </div>
              <div className="demo-window__media">
                <img
                  src={useBaseUrl('/img/editor-demo.gif')}
                  width="800"
                  height="540"
                  alt="Editing a Markdown file in the MdStyled preview: typing into a paragraph, adding a checklist item, adding a table row in the table designer, and adding a card in the card designer."
                />
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features">
          <h2 className="features__heading">One tool, unlimited polish</h2>
          <p className="features__sub">
            MdStyled compiles Markdown to refined HTML powered by the web's own
            technologies. Interactive tables, editing, diagrams: just a preview
            of what's possible.
          </p>
          <div className="feature-grid">
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-card__icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-banner">
          <div className="cta-box">
            <Heading as="h2">From plain text to pixel-perfect</Heading>
            <p>
              Install MdStyled, open a preview, and shape it with real CSS and
              JavaScript, all inside VS Code.
            </p>
            <Link className="button button--primary button--lg" to="/docs/install">
              Install MdStyled
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
