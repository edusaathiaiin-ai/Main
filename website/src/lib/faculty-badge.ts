export type BadgeType =
  | 'faculty_verified'
  | 'emeritus'
  | 'expert_verified'
  | 'pending'

export function getFacultyBadgeType(faculty: {
  verification_status: string
  employment_status: string
  is_emeritus: boolean
}): BadgeType {
  if (faculty.is_emeritus && faculty.verification_status === 'verified') {
    return 'emeritus'
  }
  if (
    faculty.employment_status === 'independent' &&
    faculty.verification_status === 'verified'
  ) {
    return 'expert_verified'
  }
  if (faculty.verification_status === 'verified') {
    return 'faculty_verified'
  }
  return 'pending'
}
