
"use client";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  ArrowUp,
  Image as ImageIcon,
  Menu,
  Paperclip,
  Plus,
  X,
  FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";

import NotiqueSidebar from "@/components/notique/NotiqueSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase/firebase";
import {
  uploadNotiqueAttachments,
  type NotiqueAttachment,
} from "@/lib/uploadNotiqueAttachments";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: NotiqueAttachment[];
  imagePreview?: string;
};

type NotiqueChat = {
  id: string;
  title: string;
  lastMessage?: string;
};

type PdfTextItem = {
  str: string;
};

const welcomeMessage: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm **Notique AI**, your personal study assistant.\n\nYou can upload notes, PDFs, or images and ask me to explain concepts, summarise topics, or help you understand your study material.\n\nWhat would you like to study today?",
};

export default function NotiquePage() {
  const { user, loading } = useAuth();

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState("");

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    welcomeMessage,
  ]);
  const [chats, setChats] = useState<NotiqueChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFreshChat, setIsFreshChat] = useState(true);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Scroll only the message history. Never scroll the document.
  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;

    const frame = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, sending]);

  // Load chat history.
  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, "notiqueChats", user.uid, "chats");
    const q = query(chatsRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedChats = snapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            title: data.title || "New Chat",
            lastMessage: data.lastMessage || "",
          };
        }) as NotiqueChat[];

        setChats(loadedChats);

        if (!activeChatId && !isFreshChat && loadedChats.length > 0) {
          setActiveChatId(loadedChats[0].id);
        }
      },
      (error) => {
        console.error("NOTIQUE CHATS ERROR:", error);
      }
    );

    return () => unsubscribe();
  }, [user, activeChatId, isFreshChat]);

  // Load messages for the selected chat.
  useEffect(() => {
    if (!user || !activeChatId) {
      setMessages([welcomeMessage]);
      return;
    }

    const messagesRef = collection(
      db,
      "notiqueChats",
      user.uid,
      "chats",
      activeChatId,
      "messages"
    );

    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMessages = snapshot.docs.map((item) => {
          const data = item.data();

          return {
            role: data.role,
            content: data.content,
            attachments: data.attachments || [],
          };
        }) as ChatMessage[];

        setMessages(
          loadedMessages.length > 0 ? loadedMessages : [welcomeMessage]
        );
      },
      (error) => {
        console.error("NOTIQUE MESSAGES ERROR:", error);
      }
    );

    return () => unsubscribe();
  }, [user, activeChatId]);

  async function createChat(title = "New Chat") {
    if (!user) return null;

    const chatRef = await addDoc(
      collection(db, "notiqueChats", user.uid, "chats"),
      {
        title,
        lastMessage: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    setActiveChatId(chatRef.id);
    return chatRef.id;
  }

  async function saveMessage(
    chatId: string,
    role: "user" | "assistant",
    content: string,
    attachments: NotiqueAttachment[] = []
  ) {
    if (!user) return;

    await addDoc(
      collection(
        db,
        "notiqueChats",
        user.uid,
        "chats",
        chatId,
        "messages"
      ),
      {
        role,
        content,
        attachments,
        createdAt: serverTimestamp(),
      }
    );

    const chatUpdate =
      role === "user"
        ? {
            title:
              content
                .replace(/[^\w\s]/g, "")
                .trim()
                .split(/\s+/)
                .slice(0, 4)
                .join(" ") || "New Chat",
            lastMessage: content.slice(0, 90),
            updatedAt: serverTimestamp(),
          }
        : {
            lastMessage: content.slice(0, 90),
            updatedAt: serverTimestamp(),
          };

    await setDoc(
      doc(db, "notiqueChats", user.uid, "chats", chatId),
      chatUpdate,
      { merge: true }
    );
  }

  function clearSelectedImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");
  }

  function resetComposer() {
    setMessage("");
    setSelectedPDF(null);
    setPdfText("");
    clearSelectedImage();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleNewChat() {
    setIsFreshChat(true);
    setActiveChatId(null);
    setMessages([welcomeMessage]);
    resetComposer();
    setSending(false);
    setSidebarOpen(false);
  }

  async function handleDeleteChat(chatId: string) {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "notiqueChats", user.uid, "chats", chatId));

      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([welcomeMessage]);
        setIsFreshChat(true);
      }
    } catch (error) {
      console.error("DELETE CHAT ERROR:", error);
    }
  }

  function handleSelectChat(chatId: string) {
    setIsFreshChat(false);
    setActiveChatId(chatId);
    resetComposer();
    setSidebarOpen(false);
  }

  async function handlePDFUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type !== "application/pdf") {
        throw new Error("Please select a PDF file.");
      }

      setSelectedPDF(file);
      setPdfText("");

      const arrayBuffer = await file.arrayBuffer();

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.legacy.min.mjs";

      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
      }).promise;

      let extractedText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        extractedText +=
          content.items
            .map((item) => (item as PdfTextItem).str)
            .join(" ") + "\n";
      }

      setPdfText(extractedText);

      if (!extractedText.trim()) {
        console.warn("This PDF contains no extractable text.");
      }
    } catch (error) {
      console.error("PDF UPLOAD ERROR:", error);
      setSelectedPDF(null);
      setPdfText("");
    } finally {
      e.target.value = "";
    }
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));

    e.target.value = "";
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSend() {
    if (
      (!message.trim() && !selectedPDF && !selectedImage) ||
      sending ||
      !user
    ) {
      return;
    }

    const userMessage = message.trim();
    const pdfToSend = selectedPDF;
    const imageToSend = selectedImage;
    const imagePreviewToSend = imagePreview;
    const extractedPdfText = pdfText;

    const userContent = pdfToSend
      ? `📄 ${pdfToSend.name}${
          userMessage
            ? `\n\n${userMessage}`
            : "\n\nSummarise this PDF."
        }`
      : imageToSend
        ? userMessage || "Describe this image."
        : userMessage;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userContent,
        imagePreview: imagePreviewToSend || undefined,
        attachments: pdfToSend
          ? [
              {
                type: "pdf",
                name: pdfToSend.name,
                url: "",
                path: "",
                size: pdfToSend.size,
              },
            ]
          : [],
      },
    ]);

    setMessage("");
    setSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const chatId =
        activeChatId ||
        (await createChat(
          userContent.replace(/📄|🖼️/g, "").trim().slice(0, 40) ||
            "New Chat"
        ));

      if (!chatId) {
        throw new Error("Could not create a chat.");
      }

      setIsFreshChat(false);

      const filesToUpload = [
        ...(pdfToSend ? [pdfToSend] : []),
        ...(imageToSend ? [imageToSend] : []),
      ];

      const uploadedAttachments = await uploadNotiqueAttachments(
        filesToUpload,
        user.uid,
        chatId
      );

      await saveMessage(
        chatId,
        "user",
        userContent,
        uploadedAttachments
      );

      const finalPrompt = pdfToSend
        ? `
User instruction:
${
  userMessage ||
  "Summarise this PDF in simple student-friendly points."
}

PDF content:
${extractedPdfText.slice(0, 12000)}
`
        : userMessage || "Explain this image clearly.";

      const response = await fetch("/api/notique", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: finalPrompt,
          image: imageToSend
            ? {
                base64: await fileToBase64(imageToSend),
                mimeType: imageToSend.type,
              }
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Notique request failed.");
      }

      const assistantReply =
        data.reply || data.error || "Sorry, I could not generate a reply.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantReply,
        },
      ]);

      await saveMessage(chatId, "assistant", assistantReply);
      } catch (error) {
        console.error("NOTIQUE SEND ERROR:", error);

        const errorMessage =
          error instanceof Error ? error.message : "";

        let userFriendlyMessage =
          "Something went wrong while contacting Notique AI. Please try again.";

        if (
          errorMessage.toLowerCase().includes("message is too long") ||
          errorMessage.toLowerCase().includes("upload a smaller pdf")
        ) {
          userFriendlyMessage =
            "Your message or PDF is too large for Notique to process.\n\nPlease upload a smaller PDF or try sending a shorter message.";
        } else if (errorMessage) {
          userFriendlyMessage = errorMessage;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ **Unable to process your request**\n\n${userFriendlyMessage}`,
          },
        ]);
      }
    finally {
      setSelectedPDF(null);
      setPdfText("");
      clearSelectedImage();
      setSending(false);
    }
  }

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleTextareaChange(value: string) {
    setMessage(value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        128
      )}px`;
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-red-500" />
          Loading Notique...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <NotiqueSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}


      {/* Header */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between bg-[var(--background)] px-3 sm:px-5 lg:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open chat history"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted-strong)] transition hover:bg-[var(--card-soft)] lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2.5">
            <Image
              src="/notique-icon.png"
              alt="Notique"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain"
              priority
            />
            <span className="text-base font-semibold tracking-tight">
              Notique
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--muted-strong)] transition hover:bg-[var(--card-soft)] hover:text-[var(--foreground)]"
        >
          <Plus size={16} />
          <span>New chat</span>
        </button>
      </header>

        {/* Chat content: history scrolls, composer stays fixed below it. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            ref={chatScrollRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-3 pb-6 pt-5 sm:gap-8 sm:px-6 sm:pb-8 sm:pt-8">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";

                return (
                  <div
                    key={index}
                    className={`flex min-w-0 gap-3 sm:gap-4 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div className="mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full">
                        <Image
                          src="/notique-icon.png"
                          alt="Notique"
                          width={32}
                          height={32}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}

                    <div
                      className={`min-w-0 ${
                        isUser
                          ? "max-w-[88%] rounded-3xl bg-[var(--card-soft)] px-4 py-3 sm:max-w-[80%] sm:px-5"
                          : "flex-1 pt-1"
                      }`}
                    >
                      {isUser ? (
                        <div className="space-y-3">
                          {msg.imagePreview && (
                            <img
                              src={msg.imagePreview}
                              alt="Uploaded image"
                              className="max-h-72 max-w-full rounded-xl object-contain"
                            />
                          )}

                          {msg.attachments?.map((file, fileIndex) =>
                            file.type === "image" && file.url ? (
                              <img
                                key={fileIndex}
                                src={file.url}
                                alt={file.name}
                                className="max-h-72 max-w-full rounded-xl object-contain"
                              />
                            ) : file.type === "pdf" ? (
                              <div
                                key={fileIndex}
                                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3"
                              >
                                <FileText
                                  size={20}
                                  className="shrink-0 text-red-500"
                                />
                                <span className="min-w-0 truncate text-sm font-medium">
                                  {file.name}
                                </span>
                              </div>
                            ) : null
                          )}

                          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-[var(--foreground)]">
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div className="notique-markdown min-w-0 break-words text-sm leading-7 text-[var(--foreground)]">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ ...props }) => (
                                <a
                                  {...props}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-red-500 underline underline-offset-2"
                                />
                              ),
                              table: ({ ...props }) => (
                                <div className="my-4 w-full overflow-x-auto rounded-xl border border-[var(--border)]">
                                  <table
                                    {...props}
                                    className="w-full min-w-[400px] border-collapse text-left text-sm"
                                  />
                                </div>
                              ),
                              th: ({ ...props }) => (
                                <th
                                  {...props}
                                  className="border-b border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 font-bold"
                                />
                              ),
                              td: ({ ...props }) => (
                                <td
                                  {...props}
                                  className="border-b border-[var(--border)] px-3 py-2 align-top"
                                />
                              ),
                              pre: ({ ...props }) => (
                                <pre
                                  {...props}
                                  className="my-4 max-w-full overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-xs leading-6"
                                />
                              ),
                              code: ({ className, children, ...props }) => (
                                <code
                                  {...props}
                                  className={`break-words font-mono text-[0.9em] ${
                                    className ||
                                    "rounded bg-[var(--card-soft)] px-1.5 py-0.5 text-red-500"
                                  }`}
                                >
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src="/notique-icon.png"
                      alt="Notique"
                      width={32}
                      height={32}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2 text-sm text-[var(--muted)]">
                    <span>Thinking</span>
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500 [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Composer remains a non-scrolling sibling of chat history. */}
          <div className="relative z-30 w-full shrink-0 border-t border-[var(--border)] bg-[var(--background)] px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 sm:border-t-0 sm:px-6 sm:pb-5 sm:pt-4">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg shadow-black/5 transition focus-within:border-red-500/50 sm:p-3">
                {selectedPDF && (
                  <div className="mb-3 flex items-center gap-3 rounded-xl bg-[var(--card-soft)] px-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                      <FileText size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {selectedPDF.name}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        PDF attached
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPDF(null);
                        setPdfText("");
                      }}
                      aria-label="Remove PDF"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-500"
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}

                {selectedImage && (
                  <div className="mb-3 flex items-center gap-3 rounded-xl bg-[var(--card-soft)] p-3">
                    <img
                      src={imagePreview}
                      alt="Selected image preview"
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {selectedImage.name}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        Image ready to send
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      aria-label="Remove image"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-500"
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={sending}
                    aria-label="Attach PDF"
                    title="Attach PDF"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--card-soft)] hover:text-red-500 disabled:opacity-40 sm:h-11 sm:w-11"
                  >
                    <Paperclip size={19} />
                  </button>

                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    hidden
                    onChange={handlePDFUpload}
                  />

                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={sending}
                    aria-label="Attach image"
                    title="Attach image"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--card-soft)] hover:text-red-500 disabled:opacity-40 sm:h-11 sm:w-11"
                  >
                    <ImageIcon size={19} />
                  </button>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleImageUpload}
                  />

                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => handleTextareaChange(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder={
                      selectedPDF
                        ? "Ask something about this PDF..."
                        : selectedImage
                          ? "Ask something about this image..."
                          : "Message Notique..."
                    }
                    rows={1}
                    disabled={sending}
                    className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-3 text-[16px] leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:opacity-50 sm:text-sm"
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={
                      sending ||
                      (!message.trim() && !selectedPDF && !selectedImage)
                    }
                    aria-label="Send message"
                    title="Send message"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
                  >
                    <ArrowUp size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
