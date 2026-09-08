import React, { useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';

const features = [
  {
    icon: '🎨',
    title: 'Real CSS, real freedom',
    body: 'Design your Markdown preview with actual CSS and JavaScript files — not cramped preview markup. Your vision, your style.',
  },
  {
    icon: '⬜',
    title: 'Clean source, portable & AI-friendly',
    body: 'Every style lives in external assets. Your Markdown stays lean, clean, and perfect for AI assistants and version control.',
  },
  {
    icon: '✨',
    title: 'Invisible selectors',
    body: 'Apply classes, IDs, and attributes with HTML comments that vanish in the preview — pure intent, zero clutter.',
  },
  {
    icon: '📊',
    title: 'Interactive tables',
    body: 'Automatic search, column filtering, sorting, and pagination on every Markdown table. Data that works for you.',
  },
  {
    icon: '🧩',
    title: 'Mermaid diagrams',
    body: 'Render flowcharts, sequence diagrams, and more straight from fenced code blocks. No plugins, no setup.',
  },
  {
    icon: '🧭',
    title: 'Auto-discovery',
    body: 'Companion .css and .js files are loaded automatically. Match filenames and MdStyled wires everything up for you.',
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
    <Layout title={siteConfig.tagline} description="Style Markdown in VS Code with external CSS and JavaScript — without cluttering the Markdown itself.">
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
            <span className="hero__eyebrow">✦ VS Code Extension</span>
            <h1 className="hero__title">
              Markdown, <br /> magnificently styled.
            </h1>
            <p className="hero__subtitle">
              Style Markdown previews in VS Code with real CSS and JavaScript —
              while keeping your source files clean, portable, and AI-friendly.
            </p>
            <div className="hero__actions">
              <Link className="button button--primary button--lg" to="/docs/intro">
                Get started
              </Link>
              <Link className="button button--secondary button--lg" to="/docs/syntax">
                Explore the syntax
              </Link>
            </div>
          </div>

          <div className="hero__demo">
            <div className="demo-window">
              <div className="demo-window__bar">
                <span className="demo-window__dot" />
                <span className="demo-window__dot" />
                <span className="demo-window__dot" />
                <span className="demo-window__title">brief.md — MdStyled Preview</span>
              </div>
              <div className="demo-window__body">
                <pre>
{`<span class="tok-c"># brief.md</span>
<span class="tok-cm">&lt;!-- @style: ./theme.css --&gt;</span>
<span class="tok-cm">&lt;!-- @script: ./behavior.js --&gt;</span>

<span class="tok-c"># Product Brief</span>

<span class="tok-cm">&lt;!-- .hero --&gt;</span>
Build polished Markdown documents with
normal web tools. <span class="tok-k">→</span> styled, live, in VS Code`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features">
          <h2 className="features__heading">Why MdStyled?</h2>
          <p className="features__sub">
            Bring designer-grade styling to the humble Markdown file — with the
            tools and workflows you already know and love.
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
            <Heading as="h2">Ready to level up your Markdown?</Heading>
            <p>
              Install MdStyled, apply a template, and open a live preview —
              all inside VS Code.
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
