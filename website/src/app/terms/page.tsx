import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — EdUsaathiAI',
};

function Heading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-playfair text-2xl font-bold mt-12 mb-4 scroll-mt-8" style={{ color: '#C9993A' }}>
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-playfair text-xl font-bold mt-8 mb-3" style={{ color: '#E5B86A' }}>
      {children}
    </h3>
  );
}

export default function TermsPage() {
  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'what-is', title: '2. What EdUsaathiAI Is' },
    { id: 'disclaimer', title: '3. AI Disclaimer — Important' },
    { id: 'eligibility', title: '4. Eligibility' },
    { id: 'user-account', title: '5. User Account' },
    { id: 'acceptable-use', title: '6. Acceptable Use' },
    { id: 'subscription', title: '7. Subscription and Payments' },
    { id: 'intellectual-property', title: '8. Intellectual Property' },
    { id: 'privacy', title: '9. Privacy' },
    { id: 'liability', title: '10. Limitation of Liability' },
    { id: 'termination', title: '11. Termination' },
    { id: 'governing-law', title: '12. Governing Law' },
    { id: 'changes', title: '13. Changes to Terms' },
    { id: 'contact', title: '14. Contact' },
  ];

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#0B1F3A', color: '#FAF7F2' }}>
      <div className="max-w-[800px] mx-auto px-6 py-16 md:py-24">
        
        {/* Header */}
        <Link href="/" className="inline-block mb-12 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">
          &larr; Back to EdUsaathiAI
        </Link>
        <h1 className="font-playfair text-4xl md:text-5xl font-extrabold mb-4" style={{ color: '#FFFFFF' }}>
          Terms of Service
        </h1>
        <p className="text-lg opacity-80 mb-1"><strong>EdUsaathiAI — Ahmedabad, India</strong></p>
        <p className="text-sm opacity-60 mb-12">Last updated: March 2026</p>

        {/* TOC */}
        <div className="p-6 rounded-2xl mb-16" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="font-playfair text-xl font-bold mb-4" style={{ color: '#fff' }}>Table of Contents</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm opacity-80">
            {sections.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:text-amber-400 hover:underline transition-colors block py-0.5">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Content */}
        <div className="space-y-6 text-base md:text-lg leading-relaxed opacity-90">
          <Heading id="acceptance">1. Acceptance of Terms</Heading>
          <p>
            By accessing or using EdUsaathiAI ("the Platform", "we", "us"), you agree to be bound by these Terms of Service. 
            If you do not agree, do not use the Platform.
          </p>

          <Heading id="what-is">2. What EdUsaathiAI Is</Heading>
          <p>
            EdUsaathiAI is an AI-powered learning companion platform. We provide subject-specific AI bots ("Saathis") 
            that assist students, faculty, and learners with educational content.
          </p>

          <Heading id="disclaimer">3. AI Disclaimer — Important</Heading>
          <p className="font-semibold px-4 border-l-4 py-2" style={{ borderColor: '#F43F5E', background: 'rgba(244,63,94,0.1)' }}>
            EdUsaathiAI Saathis are AI learning companions. They are NOT licensed professionals.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>KanoonSaathi is NOT a lawyer and does NOT provide legal advice.</li>
            <li>MedicoSaathi is NOT a doctor and does NOT provide medical diagnosis.</li>
            <li>PharmaSaathi is NOT a pharmacist.</li>
            <li>PsychSaathi is NOT a therapist.</li>
            <li>No Saathi replaces qualified professionals.</li>
          </ul>
          <p>Always consult a licensed professional for legal, medical, financial, or psychological matters.</p>

          <Heading id="eligibility">4. Eligibility</Heading>
          <p>
            You must be 13 years or older to use EdUsaathiAI. Users under 18 require parental or guardian consent. 
            By registering, you confirm you meet these requirements.
          </p>

          <Heading id="user-account">5. User Account</Heading>
          <p>You are responsible for:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activity that occurs under your account</li>
            <li>Providing accurate registration information</li>
            <li>Notifying us of any unauthorised access</li>
          </ul>

          <Heading id="acceptable-use">6. Acceptable Use</Heading>
          <p>You agree NOT to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Share your account with others</li>
            <li>Attempt to extract AI training data</li>
            <li>Use the Platform for illegal purposes</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Attempt to bypass security measures</li>
            <li>Use automated bots to access the Platform</li>
            <li>Impersonate other users or professionals</li>
          </ul>

          <Heading id="subscription">7. Subscription and Payments</Heading>
          <SubHeading>Free Tier</SubHeading>
          <p>Available to all users at no cost with daily chat limits.</p>

          <SubHeading>Founding Student Access</SubHeading>
          <p>
            First 500 students receive 60 days of full Plus access at no cost. No payment card required. 
            After 60 days, access reverts to Free tier unless upgraded.
          </p>

          <SubHeading>Paid Plans</SubHeading>
          <ul className="list-disc pl-5 space-y-2">
            <li>Saathi Plus: ₹199/month or ₹1,499/year</li>
            <li>Saathi Pro: ₹499/month or ₹3,999/year</li>
            <li>Saathi Unlimited: ₹4,999/month (no annual)</li>
          </ul>
          <p>
            All payments processed via Razorpay, a licensed Indian payment gateway. 
            Prices are inclusive of applicable taxes.
          </p>

          <SubHeading>Cancellation</SubHeading>
          <p>Plus and Pro plans may be cancelled anytime. Cancellation takes effect at end of billing period.</p>

          <SubHeading>Refund Policy</SubHeading>
          <ul className="list-disc pl-5 space-y-2">
            <li>Plus and Pro: Pro-rata refunds available within 7 days of charge if unused</li>
            <li>Unlimited: No refunds. Pause anytime instead.</li>
            <li>Founding Access: Not applicable (free)</li>
          </ul>

          <SubHeading>Pause</SubHeading>
          <p>
            Plus, Pro, and Unlimited subscribers may pause their subscription (max 2 times/year). 
            Billing is frozen during pause period.
          </p>

          <Heading id="intellectual-property">8. Intellectual Property</Heading>
          <p>
            All content on EdUsaathiAI — including bot personas, soul engine technology, platform design, 
            and educational frameworks — is the intellectual property of EdUsaathiAI, Ahmedabad. 
            Unauthorised reproduction is prohibited.
          </p>
          <p>
            User-generated content (questions, notes) remains yours. You grant us a limited licence 
            to process it to provide the service.
          </p>

          <Heading id="privacy">9. Privacy</Heading>
          <p>
            Your use of EdUsaathiAI is governed by our Privacy Policy, which forms part of these Terms. 
            We comply with India's Digital Personal Data Protection Act 2023.
          </p>

          <Heading id="liability">10. Limitation of Liability</Heading>
          <p>EdUsaathiAI is provided "as is". We are not liable for:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Accuracy of AI-generated content</li>
            <li>Decisions made based on Saathi responses</li>
            <li>Service interruptions or data loss</li>
            <li>Indirect or consequential damages</li>
          </ul>
          <p>
            Our total liability shall not exceed the amount paid by you in the 3 months preceding the claim.
          </p>

          <Heading id="termination">11. Termination</Heading>
          <p>We may suspend or terminate accounts that:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Violate these Terms</li>
            <li>Engage in account sharing or abuse</li>
            <li>Attempt to harm the Platform or other users</li>
          </ul>
          <p>You may delete your account anytime via Profile &rarr; My Data &rarr; Delete Account.</p>

          <Heading id="governing-law">12. Governing Law</Heading>
          <p>
            These Terms are governed by the laws of India. Disputes shall be subject to the exclusive 
            jurisdiction of courts in Ahmedabad, Gujarat, India.
          </p>

          <Heading id="changes">13. Changes to Terms</Heading>
          <p>
            We may update these Terms periodically. Significant changes will be notified via email. 
            Continued use after notification constitutes acceptance.
          </p>

          <Heading id="contact">14. Contact</Heading>
          <div className="p-6 rounded-xl mt-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="mb-2">For questions about these Terms:</p>
            <p className="mb-1"><strong>Email:</strong> legal@edusaathiai.in</p>
            <p><strong>Address:</strong> EdUsaathiAI, Ahmedabad, Gujarat, India</p>
          </div>
        </div>
      </div>
    </div>
  );
}
