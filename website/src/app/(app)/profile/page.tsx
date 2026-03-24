import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';

export const metadata: Metadata = {
  title: 'My Profile — EdUsaathiAI',
  description: 'Update your education info, research interests, and exam targets.',
};

export default function ProfilePage() {
  return <ProfileClient />;
}

