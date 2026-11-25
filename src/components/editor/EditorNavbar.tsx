// Import Link for client-side navigation and useNavigate to programmatically redirect the user
import { Link, useNavigate } from "react-router-dom";

// Import icons from lucide-react — Share2 is the share icon, LogOut is the logout icon
import { Share2, LogOut, Save, Terminal, Play } from "lucide-react";

// Import the auth store to access the current user's info and auth actions
import { useAuthStore } from "@/store/authStore";
import { useEditorStore } from "@/store/editorStore";

type EditorNavbarProps = {
  roomCode: string;
  onlineMembers: Array<{ userId: string; name: string; color: string }>;
  onOpenRooms: () => void;
  onShareRoom: () => void;
  onToggleTerminal: () => void;
  onRunCode: () => void;
  onCopyRoomCode: () => void;
};

export default function EditorNavbar({
  roomCode,
  onlineMembers,
  onOpenRooms,
  onShareRoom,
  onToggleTerminal,
  onRunCode,
  onCopyRoomCode,
}: EditorNavbarProps) {
  // Pull the current user object, authentication status, and logout function from the global auth store
  const { user, isAuthenticated, logout } = useAuthStore();
  const { activeFileId, saveFile } = useEditorStore();

  // useNavigate gives us a function to redirect the user to a different page programmatically
  const navigate = useNavigate();

  // This function runs when the logout button is clicked
  const handleLogout = () => {
    logout(); // Clears the session from localStorage and resets auth state in the store
    navigate("/"); // Redirects the user back to the home page after logging out
  };

  return (
    // Outer navbar container — fixed height of 12 units, bottom border, flex layout to space items left and right
    <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-secondary">

      {/* Logo on the left — clicking it navigates to the home page */}
      <Link to="/" className="font-bold text-base tracking-wide text-foreground">
        IG<span className="text-primary">NI</span>S
        {/* "NI" is highlighted in the primary brand color to create the stylized "IGNIS" logo */}
      </Link>

      {/* Right side — contains the room badge, share button, and user info/logout */}
      <div className="flex items-center gap-3">

        {/* Room ID badge — shows which collaborative room the user is currently in */}
        {roomCode && (
          <button
            onClick={onCopyRoomCode}
            className="bg-card px-3 py-1 rounded text-xs font-mono text-muted-foreground border border-border hover:bg-ignis-surface-hover transition-colors"
            title="Copy room code"
          >
            {roomCode} ({onlineMembers.length})
          </button>
        )}

        {roomCode && onlineMembers.length > 0 && (
          <div className="flex items-center gap-1.5">
            {onlineMembers.map((member) => (
              <span
                key={member.userId}
                title={member.name}
                className="w-6 h-6 rounded-full text-[10px] font-mono flex items-center justify-center text-black"
                style={{ backgroundColor: member.color || "#4ECDC4" }}
              >
                {(member.name || "U").charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={onOpenRooms}
          className="flex items-center gap-1.5 bg-card text-foreground px-3 py-1.5 rounded text-xs font-mono border border-border hover:bg-ignis-surface-hover transition-colors"
          title="Open Rooms"
        >
          Rooms
        </button>
        <button
          onClick={() => saveFile(activeFileId)}
          className="flex items-center gap-1.5 bg-card text-foreground px-3 py-1.5 rounded text-xs font-mono border border-border hover:bg-ignis-surface-hover transition-colors"
          title="Save (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={onRunCode}
          className="flex items-center gap-1.5 bg-card text-foreground px-3 py-1.5 rounded text-xs font-mono border border-border hover:bg-ignis-surface-hover transition-colors"
          title="Run current file"
        >
          <Play className="w-3.5 h-3.5" />
          Run
        </button>
        <button
          onClick={onToggleTerminal}
          className="flex items-center gap-1.5 bg-card text-foreground px-3 py-1.5 rounded text-xs font-mono border border-border hover:bg-ignis-surface-hover transition-colors"
          title="Toggle terminal"
        >
          <Terminal className="w-3.5 h-3.5" />
          Terminal
        </button>
        <button
          onClick={onShareRoom}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded text-xs font-mono hover:bg-ignis-teal-glow transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" /> {/* Share icon, sized at 3.5 units */}
          Share
        </button>

        {/* Conditional rendering — show user info if logged in, otherwise show a placeholder avatar */}
        {isAuthenticated && user ? (
          // User is logged in — show their username (or email as fallback) and a logout button
          <div className="flex items-center gap-2">

            {/* Display the username if available, otherwise fall back to showing the email */}
            <span className="text-xs font-mono text-muted-foreground">{user.username || user.email}</span>

            {/* Logout button — clicking it calls handleLogout to clear session and redirect */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-ignis-surface-hover text-muted-foreground hover:text-foreground transition-colors"
              title="Logout" // Tooltip text shown on hover
            >
              <LogOut className="w-3.5 h-3.5" /> {/* Logout icon, sized at 3.5 units */}
            </button>

          </div>
        ) : (
          // User is NOT logged in — show a circular placeholder avatar that links to the login page
          <Link to="/login" className="w-7 h-7 bg-muted rounded-full block" />
        )}

      </div>
    </div>
  );
}