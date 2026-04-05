import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useRef, useState, useCallback } from 'react';
import {
    Bold, Italic,
    List, ListOrdered, Quote, Minus, Code,
    Image as ImageIcon, Video, Link as LinkIcon,
    Undo, Redo,
} from 'lucide-react';
import styles from './RichTextEditor.module.css';

interface Props {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export const RichTextEditor = ({ content, onChange, placeholder = 'Tell your story…' }: Props) => {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                codeBlock: {},
                blockquote: {},
                horizontalRule: {},
            }),
            Image.configure({ inline: false, allowBase64: true }),
            Youtube.configure({ width: 640, height: 480, nocookie: true }),
            Placeholder.configure({ placeholder }),
            Link.configure({ openOnClick: false, autolink: true }),
        ],
        content: content || '',
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: { class: 'tiptap' },
        },
    });

    /* ── Image: convert to base64 and insert ── */
    const handleImageFile = useCallback((file: File) => {
        if (!editor) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const src = e.target?.result as string;
            editor.chain().focus().setImage({ src, alt: file.name }).run();
        };
        reader.readAsDataURL(file);
    }, [editor]);

    const onImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageFile(file);
        e.target.value = '';
    };

    /* ── Video embed ── */
    const insertVideo = () => {
        if (!editor || !videoUrl.trim()) return;
        editor.chain().focus().setYoutubeVideo({ src: videoUrl.trim() }).run();
        setVideoUrl('');
        setVideoModalOpen(false);
    };

    /* ── Link ── */
    const insertLink = () => {
        if (!editor) return;
        if (!linkUrl.trim()) {
            editor.chain().focus().unsetLink().run();
        } else {
            editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
        }
        setLinkUrl('');
        setLinkModalOpen(false);
    };

    if (!editor) return null;

    const ToolBtn = ({
        onClick, active, title, children,
    }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            className={`${styles.btn} ${active ? styles.active : ''}`}
            title={title}
            aria-label={title}
            aria-pressed={active}
        >
            {children}
        </button>
    );

    return (
        <>
            <div className={styles.wrapper}>
                {/* Toolbar */}
                <div className={styles.toolbar}>
                    {/* Headings */}
                    <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
                        <span className={styles.hlabel}>H1</span>
                    </ToolBtn>
                    <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
                        <span className={styles.hlabel}>H2</span>
                    </ToolBtn>
                    <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
                        <span className={styles.hlabel}>H3</span>
                    </ToolBtn>

                    <div className={styles.divider} />

                    {/* Inline */}
                    <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                        <Bold size={15} />
                    </ToolBtn>
                    <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                        <Italic size={15} />
                    </ToolBtn>
                    <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
                        <Code size={14} />
                    </ToolBtn>
                    <ToolBtn
                        onClick={() => {
                            const prev = editor.isActive('link') ? editor.getAttributes('link').href ?? '' : '';
                            setLinkUrl(prev);
                            setLinkModalOpen(true);
                        }}
                        active={editor.isActive('link')}
                        title="Link"
                    >
                        <LinkIcon size={14} />
                    </ToolBtn>

                    <div className={styles.divider} />

                    {/* Blocks */}
                    <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
                        <List size={15} />
                    </ToolBtn>
                    <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
                        <ListOrdered size={15} />
                    </ToolBtn>
                    <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
                        <Quote size={15} />
                    </ToolBtn>
                    <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
                        <Code size={15} />
                    </ToolBtn>
                    <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
                        <Minus size={15} />
                    </ToolBtn>

                    <div className={styles.divider} />

                    {/* Media */}
                    <ToolBtn onClick={() => imageInputRef.current?.click()} active={false} title="Insert image">
                        <ImageIcon size={15} />
                    </ToolBtn>
                    <ToolBtn onClick={() => setVideoModalOpen(true)} active={false} title="Embed YouTube / Vimeo video">
                        <Video size={15} />
                    </ToolBtn>

                    <div className={styles.divider} />

                    {/* History */}
                    <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">
                        <Undo size={14} />
                    </ToolBtn>
                    <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">
                        <Redo size={14} />
                    </ToolBtn>
                </div>

                {/* Content */}
                <div className={styles.editorArea}>
                    <EditorContent editor={editor} />
                </div>

                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className={styles.imageInput}
                    onChange={onImagePick}
                />
            </div>

            {/* Video modal */}
            {videoModalOpen && (
                <div className={styles.videoModal} onClick={() => setVideoModalOpen(false)}>
                    <div className={styles.videoModalInner} onClick={e => e.stopPropagation()}>
                        <p className={styles.videoModalTitle}>Embed a Video</p>
                        <input
                            autoFocus
                            className={styles.videoModalInput}
                            placeholder="Paste a YouTube or Vimeo URL…"
                            value={videoUrl}
                            onChange={e => setVideoUrl(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') insertVideo(); if (e.key === 'Escape') setVideoModalOpen(false); }}
                        />
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                            Supports YouTube and Vimeo links.
                        </p>
                        <div className={styles.videoModalActions}>
                            <button
                                type="button"
                                onClick={() => setVideoModalOpen(false)}
                                style={{ padding: '8px 18px', borderRadius: '999px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={insertVideo}
                                disabled={!videoUrl.trim()}
                                style={{ padding: '8px 18px', borderRadius: '999px', background: 'var(--gradient-neon)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: videoUrl.trim() ? 1 : 0.5 }}
                            >
                                Embed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link modal */}
            {linkModalOpen && (
                <div className={styles.linkModal} onClick={() => setLinkModalOpen(false)}>
                    <div className={styles.videoModalInner} onClick={e => e.stopPropagation()}>
                        <p className={styles.videoModalTitle}>Insert Link</p>
                        <input
                            autoFocus
                            className={styles.videoModalInput}
                            placeholder="https://example.com"
                            value={linkUrl}
                            onChange={e => setLinkUrl(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') insertLink(); if (e.key === 'Escape') setLinkModalOpen(false); }}
                        />
                        <div className={styles.videoModalActions}>
                            <button
                                type="button"
                                onClick={() => setLinkModalOpen(false)}
                                style={{ padding: '8px 18px', borderRadius: '999px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={insertLink}
                                style={{ padding: '8px 18px', borderRadius: '999px', background: 'var(--gradient-neon)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                            >
                                {linkUrl.trim() ? 'Apply' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
