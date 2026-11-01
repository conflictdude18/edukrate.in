
"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  MessageSquarePlus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type NotiqueChat = {
  id: string;
  title: string;
  lastMessage?: string;
};

type NotiqueSidebarProps = {
  chats: NotiqueChat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  open?: boolean;
  onClose?: () => void;
};

function getTwoWordTitle(title?: string) {
  if (!title) return "New Chat";

  const words = title
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words.join(" ") || "New Chat";
}

export default function NotiqueSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  open,
  onClose,
}: NotiqueSidebarProps) {
  const router = useRouter();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[10001] flex h-[100dvh] w-[280px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] px-4 py-5 text-[var(--foreground)] transition-transform duration-300 lg:sticky lg:top-0 lg:z-30 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Mobile navigation */}
        <div className="mb-5 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--muted-strong)] transition hover:bg-[var(--card-soft)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={17} />
            <span>Back to Edukrate</span>
          </button>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-strong)] transition hover:text-[var(--foreground)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notique branding */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-soft)]">
            <Image
              src="/notique-icon.png"
              alt="Notique AI"
              fill
              sizes="44px"
              className="object-contain p-1"
              priority
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-black tracking-tight">
              Notique AI
            </h2>
            <p className="truncate text-xs text-[var(--muted)]">
              Your study assistant
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500 active:scale-[0.98]"
        >
          <MessageSquarePlus size={17} />
          New Chat
        </button>

        <div className="mb-6 flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-3 text-sm text-[var(--muted)]">
          <Search size={16} />
          <span>Chat search coming soon</span>
        </div>

        <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
          <Sparkles size={13} />
          Recent conversations
          <span className="ml-auto rounded-md bg-[var(--card-soft)] px-2 py-0.5 text-[10px]">
            {chats.length}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pb-4">
          {chats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm leading-6 text-[var(--muted)]">
              No conversations yet. Start a new chat with Notique.
            </div>
          ) : (
            chats.map((chat) => {
              const active = chat.id === activeChatId;

              return (
                <div
                  key={chat.id}
                  className={`group flex w-full min-w-0 items-center gap-1 rounded-xl border transition ${
                    active
                      ? "border-red-500/25 bg-red-500/10"
                      : "border-transparent hover:border-[var(--border)] hover:bg-[var(--card-soft)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat.id)}
                    className="min-w-0 flex-1 px-3 py-3 text-left"
                  >
                    <span
                      className={`block truncate text-sm font-semibold ${
                        active
                          ? "text-red-500"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {getTwoWordTitle(chat.title)}
                    </span>

                    {chat.lastMessage && (
                      <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                        {chat.lastMessage}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete ${chat.title}`}
                    onClick={() => onDeleteChat(chat.id)}
                    className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] opacity-100 transition hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
          <p className="text-sm font-bold text-[var(--foreground)]">
            Notique is free
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Notique AI is currently available to students in testing mode.
          </p>
        </div>
      </aside>
    </>
  );
}
