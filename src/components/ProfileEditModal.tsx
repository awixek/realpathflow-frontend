import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CurrentUserProfile,
  ProfileUpdateDraft,
  SocialHandle,
  removeAvatar,
  updateCurrentUserProfile,
  uploadAvatar
} from '../lib/profileApi'
import { ApiError } from '../lib/tasksApi'
import { resizeImageToAvatar } from '../lib/imageResize'
import AvatarBadge from './AvatarBadge'

const SOCIAL_PLATFORMS = ['Instagram', 'Twitter/X', 'GitHub', 'LinkedIn', 'YouTube', 'Other']

function PrivacyToggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-paper/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-flow' : 'bg-ink-border'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink-panel transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export default function ProfileEditModal({
  me,
  onClose,
  onSaved,
  onAvatarChanged
}: {
  me: CurrentUserProfile
  onClose: () => void
  onSaved: (updated: CurrentUserProfile) => void
  /** Fired right after a photo upload/removal - updates the parent's
   * copy of `me` without closing the modal, so the rest of the form
   * (still open) and the nav drawer both pick up the new avatar. */
  onAvatarChanged: (updated: CurrentUserProfile) => void
}) {
  const profile = me.profile
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const [username, setUsername] = useState(profile?.username ?? '')
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [handles, setHandles] = useState<SocialHandle[]>(profile?.social_handles ?? [])

  const [isNamePublic, setIsNamePublic] = useState(profile?.is_name_public ?? false)
  const [isLocationPublic, setIsLocationPublic] = useState(profile?.is_location_public ?? false)
  const [isSocialsPublic, setIsSocialsPublic] = useState(profile?.is_socials_public ?? false)
  const [isTasksPublic, setIsTasksPublic] = useState(profile?.is_tasks_public ?? false)
  const [isProgressPublic, setIsProgressPublic] = useState(profile?.is_progress_public ?? false)

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow picking the same file again later
    if (!file) return

    setAvatarError('')
    setAvatarBusy(true)
    try {
      const resized = await resizeImageToAvatar(file)
      const updated = await uploadAvatar(resized)
      setAvatarUrl(updated.profile?.avatar_url ?? null)
      onAvatarChanged(updated)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not upload that photo.')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError('')
    setAvatarBusy(true)
    try {
      const updated = await removeAvatar()
      setAvatarUrl(null)
      onAvatarChanged(updated)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not remove your photo.')
    } finally {
      setAvatarBusy(false)
    }
  }

  function addHandle() {
    if (handles.length >= 10) return
    setHandles((prev) => [...prev, { platform: SOCIAL_PLATFORMS[0], value: '' }])
  }

  function updateHandle(index: number, patch: Partial<SocialHandle>) {
    setHandles((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)))
  }

  function removeHandle(index: number) {
    setHandles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const draft: ProfileUpdateDraft = {
      username: username.trim() || undefined,
      full_name: fullName.trim() || null,
      location: location.trim() || null,
      social_handles: handles.filter((h) => h.value.trim().length > 0),
      is_name_public: isNamePublic,
      is_location_public: isLocationPublic,
      is_socials_public: isSocialsPublic,
      is_tasks_public: isTasksPublic,
      is_progress_public: isProgressPublic
    }

    setSaving(true)
    try {
      const updated = await updateCurrentUserProfile(draft)
      onSaved(updated)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('That username is already taken. Try another.')
      } else if (err instanceof ApiError && err.status === 422) {
        setError('Username must be 3-24 characters: lowercase letters, numbers, underscore only.')
      } else {
        setError(err instanceof Error ? err.message : 'Could not save your profile.')
      }
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/80 px-4 py-8 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-ink-border bg-ink-panel p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl text-paper">Edit profile</h2>
          <button onClick={onClose} className="text-mute hover:text-paper" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
              className="relative shrink-0 rounded-full disabled:opacity-60"
              aria-label="Change photo"
            >
              <AvatarBadge label={username || profile?.username} avatarUrl={avatarUrl} size="lg" />
            </button>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                className="self-start text-sm text-flow hover:underline disabled:opacity-60"
              >
                {avatarBusy ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Add photo'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={avatarBusy}
                  className="self-start text-xs text-mute hover:text-red-400 disabled:opacity-60"
                >
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
          </div>
          {avatarError && (
            <p role="alert" className="text-sm text-red-400">
              {avatarError}
            </p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-paper/80">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              className="rounded-md border border-ink-border bg-ink px-3 py-2.5 text-paper outline-none focus:border-flow"
            />
            <span className="text-xs text-mute">Lowercase letters, numbers, underscore. 3-24 characters. Always visible (needed for your profile link).</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-paper/80">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="rounded-md border border-ink-border bg-ink px-3 py-2.5 text-paper outline-none focus:border-flow"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-paper/80">Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="rounded-md border border-ink-border bg-ink px-3 py-2.5 text-paper outline-none focus:border-flow"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-paper/80">Social handles</span>
            {handles.map((handle, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={handle.platform}
                  onChange={(e) => updateHandle(index, { platform: e.target.value })}
                  className="rounded-md border border-ink-border bg-ink px-2 py-2 text-sm text-paper outline-none focus:border-flow"
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  value={handle.value}
                  onChange={(e) => updateHandle(index, { value: e.target.value })}
                  placeholder="@handle or URL"
                  className="flex-1 rounded-md border border-ink-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-flow"
                />
                <button
                  type="button"
                  onClick={() => removeHandle(index)}
                  aria-label="Remove"
                  className="px-2 text-mute hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
            {handles.length < 10 && (
              <button
                type="button"
                onClick={addHandle}
                className="self-start rounded-md border border-ink-border px-3 py-1.5 text-xs text-paper/80 hover:border-flow"
              >
                + Add social handle
              </button>
            )}
          </div>

          <div className="rounded-md border border-ink-border p-3">
            <p className="mb-1 text-sm text-paper/80">What's public on your profile</p>
            <p className="mb-2 text-xs text-mute">Everything defaults to private. Username is always visible.</p>
            <PrivacyToggle label="Name" checked={isNamePublic} onChange={setIsNamePublic} />
            <PrivacyToggle label="Location" checked={isLocationPublic} onChange={setIsLocationPublic} />
            <PrivacyToggle label="Social handles" checked={isSocialsPublic} onChange={setIsSocialsPublic} />
            <PrivacyToggle label="Ongoing tasks" checked={isTasksPublic} onChange={setIsTasksPublic} />
            <PrivacyToggle label="Total progress" checked={isProgressPublic} onChange={setIsProgressPublic} />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={saving}
            whileTap={{ scale: 0.98 }}
            className="mt-1 rounded-md bg-flow py-2.5 font-medium text-ink transition-colors hover:bg-flow/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
