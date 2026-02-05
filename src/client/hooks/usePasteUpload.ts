import { useEffect, useCallback, type RefObject } from "react";

interface UsePasteUploadOptions {
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  onError?: (error: string) => void;
}

export function usePasteUpload(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  content: string,
  setContent: (value: string) => void,
  options?: UsePasteUploadOptions
) {
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (!item.type.startsWith("image/") && !item.type.startsWith("video/")) continue;

        e.preventDefault();

        const file = item.getAsFile();
        if (!file) continue;

        options?.onUploadStart?.();

        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch("/api/media/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error || "Upload failed");
          }

          const data = (await res.json()) as { url: string; mimeType: string; filename: string };

          // Build markdown to insert
          let markdown: string;
          if (data.mimeType.startsWith("video/")) {
            markdown = `<video src="${data.url}" controls></video>`;
          } else {
            markdown = `![${data.filename}](${data.url})`;
          }

          // Insert at cursor position
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = content.slice(0, start);
            const after = content.slice(end);
            const newContent = before + markdown + after;
            setContent(newContent);

            // Restore cursor position after the inserted text
            requestAnimationFrame(() => {
              const newPos = start + markdown.length;
              textarea.selectionStart = newPos;
              textarea.selectionEnd = newPos;
              textarea.focus();
            });
          } else {
            setContent(content + "\n" + markdown);
          }
        } catch (err) {
          options?.onError?.(err instanceof Error ? err.message : "Upload failed");
        } finally {
          options?.onUploadEnd?.();
        }

        break; // Only handle first media item
      }
    },
    [textareaRef, content, setContent, options]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, [textareaRef, handlePaste]);
}
