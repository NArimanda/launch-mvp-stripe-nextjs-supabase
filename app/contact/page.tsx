import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with BoxOfficeCalls.',
};

/** Replace with your Google Form “Send” share link (forms.gle or docs.google.com/forms/...). */
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd19RW-sC_yC9eX2uoR4XvFGSCeTKFJla37q7a3UnWGtfaFqQ/viewform?usp=publish-editor';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-black mb-3">
            Contact
          </h1>
          <p className="text-neutral-600">
            Reach out by email or open our Google Form.
          </p>
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-black mb-2">Email</h2>
          <p className="text-neutral-700 mb-3">
            For direct inquiries, use the address below.
          </p>
          <a
            href="mailto:outcomeoracle@gmail.com"
            className="text-blue-700 underline font-medium"
          >
            outcomeoracle@gmail.com
          </a>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-black mb-2">Google Form</h2>
          <p className="text-neutral-700 mb-4">
            Submit feedback or questions through our Google Form (opens in a new tab)
            <code className="text-sm bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800">
              
            </code>{' '}
          </p>
          <a
            href={GOOGLE_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium bg-blue-700 text-white hover:bg-blue-800 transition-colors"
          >
            Open contact form
          </a>
        </section>
      </div>
    </main>
  );
}
