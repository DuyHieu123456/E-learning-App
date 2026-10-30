// useRequireAuth — gate for actions that need a signed-in user.
// Guests browse freely (Home, Search, course details, teacher pages),
// but personal/transactional actions — cart, checkout, bookmark,
// reviews, learning actions, project submit, Q&A, follow — do NOT
// run for guests. Instead of sending the guest to a second full
// Login screen (owner complaint 2026-10-30), the gate now opens the
// in-place AuthPrompt modal: one tap signs in with Google right
// there, "Later" just closes it. Returns true when the action may
// proceed (signed in), false when it must stop (guest).
import { useAuth } from '../context/AuthContext';
import { useAuthPrompt } from '../context/AuthPromptContext';

export function useRequireAuth() {
  const { user } = useAuth();
  const { promptLogin } = useAuthPrompt();
  return (): boolean => {
    if (user) return true;
    promptLogin();
    return false;
  };
}
