import type { TourStep } from './TourTooltip'

export const STUDENT_TOUR: TourStep[] = [
  {
    target: '[data-tour="nav-chat"]',
    title: '💬 Your Saathi',
    description:
      'This is your personal AI companion. It remembers your name, semester, and subjects. Ask anything — it knows you.',
  },
  {
    target: '[data-tour="nav-board"]',
    title: '🏛️ Community Board',
    description:
      'Post questions publicly. Your Saathi answers instantly. Verified faculty can also reply with expert knowledge.',
  },
  {
    target: '[data-tour="nav-more"]',
    title: '🎓 Faculty Finder & More',
    description:
      'Tap here to find verified professors, book 1:1 sessions, browse internships, and declare what you want to learn.',
  },
  {
    target: '[data-tour="nav-explore"]',
    title: '🗺️ Your Treasure Chest',
    description:
      'Curated books, journals, tools and channels — refreshed every week by your Saathi. Everything beyond the chat.',
  },
  {
    target: '[data-tour="nav-profile"]',
    title: '👤 Your Soul Profile',
    description:
      'Your Saathi builds a profile of you over time — depth, mastered topics, your dream. The more you chat, the better it knows you.',
  },
]

export const FACULTY_TOUR: TourStep[] = [
  {
    target: '[data-tour="faculty-dashboard"]',
    title: '📋 Your Dashboard',
    description:
      'Welcome, Professor. Manage sessions, answer student questions, announce lectures, and track your earnings — all from here.',
  },
  {
    target: '[data-tour="faculty-board"]',
    title: '🏛️ Community Board',
    description:
      'Students post questions here. Your answers earn you a Faculty Verified ✓ badge and build your reputation with thousands of students.',
  },
  {
    target: '[data-tour="faculty-sessions"]',
    title: '📅 1:1 Sessions',
    description:
      'Students book sessions with you. Set your fee and availability. 80% of every session goes directly to you.',
  },
  {
    target: '[data-tour="faculty-live"]',
    title: '🎙️ Live Lectures',
    description:
      'Announce a lecture — students book seats and pay upfront. A 30-seat lecture at ₹1,000 = ₹24,000 in one evening.',
  },
  {
    target: '[data-tour="faculty-verification"]',
    title: '✅ Get Verified',
    description:
      'Complete your profile and get your Faculty Verified badge. It builds student trust and unlocks all features.',
  },
]

export const INSTITUTION_TOUR: TourStep[] = [
  {
    target: '[data-tour="institution-dashboard"]',
    title: '🏢 Your Recruitment Hub',
    description:
      'Post internships, discover soul-matched students, and connect with India\'s most motivated learners.',
  },
  {
    target: '[data-tour="institution-post"]',
    title: '📋 Post an Internship',
    description:
      'Unlike job boards, we match by soul — depth, subjects, level. You see the top 20 matches, not 500 random CVs.',
  },
  {
    target: '[data-tour="institution-applicants"]',
    title: '👁️ Soul Profiles',
    description:
      'Each applicant shows their learning depth, research dreams, and mastered topics. Know who is genuinely curious before you interview.',
  },
  {
    target: '[data-tour="institution-analytics"]',
    title: '📊 Track Everything',
    description:
      'Views, applications, shortlists. Know which postings attract the best students.',
  },
]
