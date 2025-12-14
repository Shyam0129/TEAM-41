import React from 'react';
import { Download, FileText } from 'lucide-react';

interface MessageContentProps {
    content: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
    // Parse markdown links: [text](url)
    const parseContent = (text: string) => {
        const parts: React.ReactNode[] = [];
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(text)) !== null) {
            // Add text before the link
            if (match.index > lastIndex) {
                parts.push(
                    <span key={`text-${lastIndex}`}>
                        {text.substring(lastIndex, match.index)}
                    </span>
                );
            }

            const linkText = match[1];
            const url = match[2];

            // Check if it's a download link (PDF or DOCX)
            const isDownloadLink = url.includes('/download/') &&
                (url.endsWith('.pdf') || url.endsWith('.docx'));

            if (isDownloadLink) {
                // Render as download button
                const fileName = linkText;
                const fileType = url.endsWith('.pdf') ? 'PDF' : 'Word Document';
                const icon = url.endsWith('.pdf') ? '📄' : '📝';

                parts.push(
                    <div key={`link-${match.index}`} className="my-3">
                        <a
                            href={url}
                            download={fileName}
                            className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group"
                        >
                            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-semibold text-sm">{fileName}</div>
                                <div className="text-xs text-blue-100">{fileType}</div>
                            </div>
                            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                        </a>
                    </div>
                );
            } else {
                // Render as regular link
                parts.push(
                    <a
                        key={`link-${match.index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                        {linkText}
                    </a>
                );
            }

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(
                <span key={`text-${lastIndex}`}>
                    {text.substring(lastIndex)}
                </span>
            );
        }

        return parts.length > 0 ? parts : [text];
    };

    // Split content by newlines and parse each line
    const lines = content.split('\n');

    return (
        <div className="whitespace-pre-wrap font-light">
            {lines.map((line, index) => (
                <React.Fragment key={index}>
                    {parseContent(line)}
                    {index < lines.length - 1 && <br />}
                </React.Fragment>
            ))}
        </div>
    );
};
