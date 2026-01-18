import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
    Bold,
    Italic,
    Strikethrough,
    List,
    ListOrdered,
    Link as LinkIcon,
    Undo,
    Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    className?: string;
}

export default function RichTextEditor({
    content,
    onChange,
    placeholder: _placeholder = 'Write your message...',
    className,
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline',
                },
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[200px] px-4 py-3',
            },
        },
    });

    if (!editor) {
        return null;
    }

    const addLink = () => {
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    return (
        <TooltipProvider delayDuration={0}>
            <div className={cn('border rounded-md', className)}>
                {/* Toolbar */}
                <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
                    <ToolbarButton
                        icon={Undo}
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        tooltip="Undo"
                    />
                    <ToolbarButton
                        icon={Redo}
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        tooltip="Redo"
                    />

                    <Separator orientation="vertical" className="mx-1 h-6" />

                    <ToolbarButton
                        icon={Bold}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                        tooltip="Bold (Ctrl+B)"
                    />
                    <ToolbarButton
                        icon={Italic}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                        tooltip="Italic (Ctrl+I)"
                    />
                    <ToolbarButton
                        icon={Strikethrough}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive('strike')}
                        tooltip="Strikethrough"
                    />

                    <Separator orientation="vertical" className="mx-1 h-6" />

                    <ToolbarButton
                        icon={List}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                        tooltip="Bullet list"
                    />
                    <ToolbarButton
                        icon={ListOrdered}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                        tooltip="Numbered list"
                    />

                    <Separator orientation="vertical" className="mx-1 h-6" />

                    <ToolbarButton
                        icon={LinkIcon}
                        onClick={addLink}
                        isActive={editor.isActive('link')}
                        tooltip="Add link"
                    />
                </div>

                {/* Editor */}
                <EditorContent editor={editor} />
            </div>
        </TooltipProvider>
    );
}

interface ToolbarButtonProps {
    icon: React.ElementType;
    onClick: () => void;
    disabled?: boolean;
    isActive?: boolean;
    tooltip: string;
}

function ToolbarButton({
    icon: Icon,
    onClick,
    disabled,
    isActive,
    tooltip,
}: ToolbarButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn('h-8 w-8', isActive && 'bg-accent')}
                    onClick={onClick}
                    disabled={disabled}
                >
                    <Icon className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{tooltip}</TooltipContent>
        </Tooltip>
    );
}
