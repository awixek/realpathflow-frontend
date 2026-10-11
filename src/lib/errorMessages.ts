import { ApiError } from './tasksApi'

export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'Your session has expired. Please sign in again.'
    if (error.status === 404) return 'We couldn’t find that item. It may have been removed.'
    if (error.status === 409) return 'That action conflicts with the current state. Refresh and try again.'
    if (error.status === 422) return 'Some details aren’t valid. Check the form and try again.'
    if (error.status >= 500) return 'The server is having trouble right now. Please try again in a moment.'
    return fallback
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return 'Couldn’t reach RealPathFlow. Check your internet connection and try again.'
  }

  if (error instanceof Error && /network|cors|failed to fetch/i.test(error.message)) {
    return 'Couldn’t reach RealPathFlow. Check your internet connection and try again.'
  }

  // A plain Error we threw ourselves (not a raw network/stack-trace
  // message) is usually already written for a person to read - e.g.
  // "Push notifications are not supported or permission was denied."
  // Surfacing it beats hiding the real reason behind a generic fallback,
  // which made problems like the phone-reminders toggle failing
  // impossible to diagnose from the UI alone.
  if (error instanceof Error && error.message && error.message.length < 200) {
    return error.message
  }

  return fallback
}
