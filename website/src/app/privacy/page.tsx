import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — EdUsaathiAI',
}

function Heading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-playfair mt-12 mb-4 scroll-mt-8 text-2xl font-bold"
      style={{ color: '#C9993A' }}
    >
      {children}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="font-playfair mt-8 mb-3 text-xl font-bold"
      style={{ color: '#E5B86A' }}
    >
      {children}
    </h3>
  )
}

export default function PrivacyPage() {
  const sections = [
    { id: 'who-we-are', title: '1. Who We Are' },
    { id: 'data-collected', title: '2. Data We Collect' },
    { id: 'why-collect', title: '3. Why We Collect This Data' },
    { id: 'retention', title: '4. How Long We Keep Your Data' },
    { id: 'rights', title: '5. Your Rights Under DPDP Act 2023' },
    { id: 'security', title: '6. Data Storage and Security' },
    { id: 'ai-disclosure', title: '7. AI Processing Disclosure' },
    { id: 'children', title: "8. Children's Privacy" },
    { id: 'cookies', title: '9. Cookies' },
    { id: 'third-parties', title: '10. Third-Party Services' },
    { id: 'international', title: '11. International Users' },
    { id: 'changes', title: '12. Changes to This Policy' },
    { id: 'contact', title: '13. Contact and Grievances' },
  ]

  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: '#0B1F3A', color: '#FAF7F2' }}
    >
      <div className="mx-auto max-w-[800px] px-6 py-16 md:py-24">
        {/* Header */}
        <Link
          href="/"
          className="mb-12 inline-block text-sm font-medium opacity-60 transition-opacity hover:opacity-100"
        >
          &larr; Back to EdUsaathiAI
        </Link>
        <h1
          className="font-playfair mb-4 text-4xl font-extrabold md:text-5xl"
          style={{ color: '#FFFFFF' }}
        >
          Privacy Policy
        </h1>
        <p className="mb-1 text-lg opacity-80">
          <strong>EdUsaathiAI — Ahmedabad, India</strong>
        </p>
        <p className="m-0 text-sm opacity-60">Last updated: March 2026</p>
        <p className="mb-12 text-sm opacity-60">
          Compliant with India&#39;s Digital Personal Data Protection Act 2023
          (DPDP Act)
        </p>

        {/* TOC */}
        <div
          className="mb-16 rounded-2xl p-6"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h2
            className="font-playfair mb-4 text-xl font-bold"
            style={{ color: '#fff' }}
          >
            Table of Contents
          </h2>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm opacity-80 md:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block py-0.5 transition-colors hover:text-amber-400 hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Content */}
        <div className="space-y-6 text-base leading-relaxed opacity-90 md:text-lg">
          <Heading id="who-we-are">1. Who We Are</Heading>
          <p>
            EdUsaathiAI is an AI-powered learning platform operated from
            Ahmedabad, Gujarat, India.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>
              <strong>Data Fiduciary:</strong> EdUsaathiAI, Ahmedabad
            </li>
            <li>
              <strong>Grievance Officer:</strong> Jaydeep Buch
            </li>
            <li>
              <strong>Email:</strong>{' '}
              <a
                href="mailto:privacy@edusaathiai.in"
                style={{ color: '#C9993A' }}
              >
                privacy@edusaathiai.in
              </a>
            </li>
            <li>
              <strong>Response Time:</strong> Within 30 days
            </li>
          </ul>

          <Heading id="data-collected">2. Data We Collect</Heading>

          <SubHeading>Account Information</SubHeading>
          <ul className="list-disc space-y-2 pl-5">
            <li>Full name, email address, city</li>
            <li>Institution name, year of study</li>
            <li>Academic level and degree programme</li>
          </ul>

          <SubHeading>Soul Profile (Learning Intelligence)</SubHeading>
          <ul className="mb-4 list-disc space-y-2 pl-5">
            <li>Topics you discuss and return to</li>
            <li>Subjects you find challenging</li>
            <li>Your research interests and career direction</li>
            <li>Session summaries (3 sentences per session)</li>
            <li>Learning style and pace preferences</li>
          </ul>
          <p className="rounded-xl border border-[#C9993A]/30 bg-[#C9993A]/5 p-4 text-sm md:text-base">
            This soul profile is the core of what makes your Saathi personal to
            you. It is never sold or shared with third parties.
          </p>

          <SubHeading>Usage Data</SubHeading>
          <ul className="list-disc space-y-2 pl-5">
            <li>Chat session counts and timestamps</li>
            <li>Check-in results and progress scores</li>
            <li>Notes you choose to save</li>
            <li>Community board participation</li>
          </ul>

          <SubHeading>Technical Data</SubHeading>
          <ul className="list-disc space-y-2 pl-5">
            <li>Device type and operating system</li>
            <li>IP address (for security, not tracking)</li>
            <li>Session identifiers</li>
          </ul>

          <SubHeading>What We Do NOT Collect</SubHeading>
          <ul className="list-disc space-y-2 pl-5">
            <li>Profile photographs</li>
            <li>Precise location or GPS data</li>
            <li>Browsing history outside our platform</li>
            <li>Payment card details (handled by Razorpay)</li>
            <li>Biometric data of any kind</li>
          </ul>

          <Heading id="why-collect">3. Why We Collect This Data</Heading>

          <div className="mt-4 mb-6 overflow-x-auto">
            <table className="w-full text-left text-sm md:text-base">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-3 font-semibold text-white">Data</th>
                  <th className="py-3 font-semibold text-white">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr>
                  <td className="py-3 pr-4">Account info</td>
                  <td className="py-3">
                    Identify you, personalise your experience
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Soul profile</td>
                  <td className="py-3">
                    Power your Saathi&#39;s memory and personalisation
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Usage data</td>
                  <td className="py-3">Improve the platform, detect abuse</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Technical data</td>
                  <td className="py-3">Security, fraud prevention</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>We process your data on the legal basis of:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Consent</strong> — given at registration
            </li>
            <li>
              <strong>Contract</strong> — to provide the service you paid for
            </li>
            <li>
              <strong>Legitimate interest</strong> — platform security
            </li>
          </ul>

          <Heading id="retention">4. How Long We Keep Your Data</Heading>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Active account:</strong> Data kept for duration of account
            </li>
            <li>
              <strong>After deletion request:</strong> PII anonymised within 30
              days, then permanently deleted
            </li>
            <li>
              <strong>Chat messages:</strong> Retained for 90 days rolling
              window
            </li>
            <li>
              <strong>Soul profile:</strong> Retained for 1 year after last
              active session (allows return)
            </li>
            <li>
              <strong>Payment records:</strong> 7 years (legal requirement)
            </li>
          </ul>

          <Heading id="rights">5. Your Rights Under DPDP Act 2023</Heading>

          <SubHeading>Right to Access (Section 12)</SubHeading>
          <p>
            You can view all data we hold about you. <br />
            Go to: Profile &rarr; My Data &rarr; View my data
          </p>

          <SubHeading>Right to Correction (Section 12)</SubHeading>
          <p>
            You can correct inaccurate personal data. <br />
            Go to: Profile &rarr; My Profile &rarr; Edit
          </p>

          <SubHeading>Right to Erasure (Section 13)</SubHeading>
          <p>
            You can request deletion of your account and all associated personal
            data. <br />
            Go to: Profile &rarr; My Data &rarr; Delete Account <br />
            We will complete deletion within 30 days.
          </p>

          <SubHeading>Right to Withdraw Consent (Section 13)</SubHeading>
          <p>
            You can withdraw consent for data processing. This will result in
            account deactivation. <br />
            Go to: Profile &rarr; My Data &rarr; Manage Consent
          </p>

          <SubHeading>Right to Grievance Redressal (Section 13)</SubHeading>
          <p>
            If you believe your rights have been violated: <br />
            Email:{' '}
            <a
              href="mailto:privacy@edusaathiai.in"
              style={{ color: '#C9993A' }}
            >
              privacy@edusaathiai.in
            </a>{' '}
            <br />
            We will respond within 30 days.
          </p>

          <SubHeading>Right to Data Portability</SubHeading>
          <p>
            You can download all your data as a JSON file. <br />
            Go to: Profile &rarr; My Data &rarr; Download My Data
          </p>

          <Heading id="security">6. Data Storage and Security</Heading>
          <ul className="list-disc space-y-2 pl-5">
            <li>All data stored in Supabase (Mumbai region, India)</li>
            <li>Data does not leave Indian jurisdiction</li>
            <li>Encryption in transit (HTTPS/TLS)</li>
            <li>Encryption at rest (AES-256)</li>
            <li>Row-level security on all database tables</li>
            <li>Regular security audits</li>
          </ul>

          <Heading id="ai-disclosure">7. AI Processing Disclosure</Heading>
          <p>
            Your messages are processed by AI models to generate educational
            responses. We use a chain of providers including Claude (Anthropic),
            Gemini (Google), Grok (xAI), and Groq, selected automatically based
            on availability. We do not use your conversations to train AI
            models. System prompts containing your soul profile are never sent
            to the client device.
          </p>

          <Heading id="children">8. Children&#39;s Privacy</Heading>
          <p>
            EdUsaathiAI is available to users aged 13+. Users under 18 must have
            parental consent. We do not knowingly collect data from children
            under 13. If we discover such data, we will delete it immediately.
          </p>

          <Heading id="cookies">9. Cookies</Heading>
          <p>We use essential cookies only:</p>
          <ul className="mb-4 list-disc space-y-2 pl-5">
            <li>Authentication session cookies</li>
            <li>Security tokens</li>
          </ul>
          <p>We do NOT use:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Advertising cookies</li>
            <li>Third-party tracking cookies</li>
            <li>Analytics cookies that identify you</li>
          </ul>

          <Heading id="third-parties">10. Third-Party Services</Heading>
          <p>We share minimal data with:</p>
          <div className="mt-4 mb-6 overflow-x-auto">
            <table className="w-full text-left text-sm md:text-base">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-3 font-semibold text-white">Service</th>
                  <th className="py-3 font-semibold text-white">Purpose</th>
                  <th className="py-3 font-semibold text-white">Data Shared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr>
                  <td className="py-3 pr-4">Razorpay</td>
                  <td className="py-3 pr-4">Payments</td>
                  <td className="py-3">Payment amount, order ID</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Resend</td>
                  <td className="py-3 pr-4">Emails</td>
                  <td className="py-3">Your email address</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Anthropic</td>
                  <td className="py-3 pr-4">AI responses</td>
                  <td className="py-3">Your messages only</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Groq</td>
                  <td className="py-3 pr-4">AI responses</td>
                  <td className="py-3">Your messages only</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Sentry</td>
                  <td className="py-3 pr-4">Error tracking</td>
                  <td className="py-3">Anonymous error data</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>We never sell your data to any third party.</p>

          <Heading id="international">11. International Users</Heading>
          <p>
            EdUsaathiAI is designed for Indian students. If you access from
            outside India, your data is still stored in India (Mumbai region).
            EU users: we provide GDPR-equivalent rights.
          </p>

          <Heading id="changes">12. Changes to This Policy</Heading>
          <p>
            We will notify you by email before making significant changes to
            this Privacy Policy. The latest version is always at
            edusaathiai.in/privacy
          </p>

          <Heading id="contact">13. Contact and Grievances</Heading>
          <div
            className="mt-4 rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <ul className="mb-4 space-y-2">
              <li>
                <strong>Grievance Officer:</strong> Jaydeep Buch
              </li>
              <li>
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:privacy@edusaathiai.in"
                  style={{ color: '#C9993A' }}
                >
                  privacy@edusaathiai.in
                </a>
              </li>
              <li>
                <strong>Platform:</strong> EdUsaathiAI, Ahmedabad, Gujarat,
                India
              </li>
              <li>
                <strong>Response time:</strong> Within 30 days of receipt
              </li>
            </ul>
            <p>
              To exercise any of your rights, visit:{' '}
              <code>Profile &rarr; My Data</code>
            </p>
            <p>
              Or email us at{' '}
              <a
                href="mailto:privacy@edusaathiai.in"
                style={{ color: '#C9993A' }}
              >
                privacy@edusaathiai.in
              </a>
            </p>
            <p>
              General support:{' '}
              <a
                href="mailto:support@edusaathiai.in"
                style={{ color: '#C9993A' }}
              >
                support@edusaathiai.in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
