import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
};

// =============================================================================
// PASTE YOUR ABOUT PAGE CONTENT (HTML ONLY) INSIDE String.raw`...` BELOW.
// Replace everything between the backticks, including the placeholder.
// Tip: keep using String.raw`...` so backslashes in pasted HTML are not escaped.
// =============================================================================
const aboutHtml = String.raw`<div class="about-content space-y-6 text-[15px] leading-relaxed text-neutral-800">
<h2 class="text-2xl font-bold text-black">About BoxOfficeCalls</h2>
<p>BoxOfficeCalls is a platform for tracking and evaluating box office predictions.</p>
<p>Users can place predictions on the performance of upcoming movies and compare their outcomes against real box office results. Each prediction is recorded and resolved based on publicly available data, creating a transparent and consistent record of performance over time.</p>
<h3 class="text-lg font-semibold text-black pt-2">How It Works</h3>
<ul class="list-disc pl-6 space-y-1">
<li>Users select a movie and place a prediction on its box office performance</li>
<li>Predictions are grouped into defined markets (such as opening weekend or first 30 days)</li>
<li>Once the timeframe ends, results are determined using verified box office data</li>
<li>Outcomes are recorded and made visible across the platform</li>
</ul>
<h3 class="text-lg font-semibold text-black pt-2">Market Resolution</h3>
<p>All predictions are resolved using publicly available box office data, primarily sourced from Box Office Mojo and cross-referenced with other sources when necessary.</p>
<ul class="list-disc pl-6 space-y-1">
<li>Weekend markets may vary slightly depending on release timing and holidays</li>
<li>Monthly markets are defined as the first 30 days after release</li>
<li>Preview earnings are included in all results</li>
<li>Results are finalized after a short delay to ensure accuracy and avoid reliance on projections</li>
</ul>
<h3 class="text-lg font-semibold text-black pt-2">Purpose</h3>
<p>BoxOfficeCalls is designed to provide a structured way to track predictions over time. The platform acts as a public record of outcomes, allowing users to evaluate accuracy and compare performance with others.</p>
<p>All activity on the platform is for informational and entertainment purposes only.</p>
</div>`;

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-black mb-3">
            About
          </h1>
          <p className="text-neutral-600">
          </p>
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div
            id="about-embed-placeholder"
            className="about-body text-neutral-900 [&_a]:text-blue-700 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: aboutHtml }}
          />
        </section>
      </div>
    </main>
  );
}
