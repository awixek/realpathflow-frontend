import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between border-b border-ink-border px-6 py-4">
      <div className="flex items-center gap-6">
        <span className="font-display text-lg text-paper">RealPathFlow</span>
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? 'text-sm text-flow' : 'text-sm text-mute hover:text-paper')}
        >
          Roadmap
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => (isActive ? 'text-sm text-flow' : 'text-sm text-mute hover:text-paper')}
        >
          Profile
        </NavLink>
      </div>

      <button onClick={() => supabase.auth.signOut()} className="text-sm text-mute hover:text-paper">
        Sign out
      </button>
    </nav>
  )
}
