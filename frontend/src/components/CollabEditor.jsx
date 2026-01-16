import React, { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const COLLAB_SERVICE_URL = import.meta.env.VITE_COLLAB_SERVICE_URL || 'ws://localhost:1234';

const CollabEditor = ({ documentId, username = 'Anonymous' }) => {
    const containerRef = useRef(null);
    const quillRef = useRef(null);
    const providerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !documentId) return;

        // Prevent double init
        if (quillRef.current) return;

        console.log(`Connecting to Collab Service for Doc: ${documentId}`);

        // 1. Yjs Document
        const ydoc = new Y.Doc();

        // 2. Provider
        const provider = new WebsocketProvider(COLLAB_SERVICE_URL, documentId, ydoc);
        providerRef.current = provider;

        // 3. Setup Quill
        const editorContainer = document.createElement('div');
        containerRef.current.appendChild(editorContainer);

        const quill = new Quill(editorContainer, {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'blockquote', 'code-block'],
                    ['clean']
                ],
                history: {
                    userOnly: true // Handle undo/redo locally for user actions
                }
            },
            placeholder: 'Type here to collaborate...'
        });
        quillRef.current = quill;

        // 4. Bind Yjs to Quill
        const ytext = ydoc.getText('quill');
        const binding = new QuillBinding(ytext, quill, provider.awareness);

        // 5. Awareness / Presence
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
        provider.awareness.setLocalStateField('user', {
            name: username,
            color: color
        });

        return () => {
            // Cleanup
            console.log('Disconnecting Collab Provider');
            provider.disconnect();
            ydoc.destroy();
            // containerRef.current.innerHTML = ''; // Basic cleanup
            // quillRef.current = null;
        };
    }, [documentId, username]);

    return (
        <div className="collab-session">
            <div className="status-bar mb-2 text-sm text-gray-500">
                Connected as <strong>{username}</strong> to <em>{documentId}</em>
            </div>
            <div
                ref={containerRef}
                style={{ height: '500px', border: '1px solid #ccc' }}
                className="editor-wrapper"
            />
        </div>
    );
};

export default CollabEditor;
