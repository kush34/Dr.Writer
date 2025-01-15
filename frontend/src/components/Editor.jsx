import React, { useContext, useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import { UserContext } from '@/context/UserContext';
import apiClient from '@/service/axiosConfig';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import EditFileDialog from '../components/EditFileDialog';
import ShareFileDialog from '../components/ShareFileDialoag';
import socket from '@/service/socket'; // Import the shared socket instance
import { useToast } from "@/hooks/use-toast";
import { Printer } from 'lucide-react';
import '../service/IndexDb'
import { addDocument, updateDocumentIndexDb ,syncData} from '../service/IndexDb';
import { ThemeContext } from '@/context/ThemeContext';
const Editor = () => {
    const {theme} = useContext(ThemeContext);
    const { user, loading, setLoading } = useContext(UserContext);
    const navigate = useNavigate();
    const quillRef = useRef(null);
    const id = useParams();
    const { toast } = useToast();
    const [fileInfo, setFileInfo] = useState();
    const [content, setContent] = useState('');
    const [title, setTitle] = useState(fileInfo?.title);

    const modules = {
        toolbar: [
          [{ font: [] }], // Font family
          [{ size: ['small', false, 'large', 'huge'] }], // Font size
          ['bold', 'italic', 'underline'], // Bold, italic, underline
          [{ color: [] }, { background: [] }], // Font color and background color
          [{ align: [] }], // Text alignment
          ['clean'], // Clear formatting
        //   ["link", "image"],
        ],
    };

    const formats = [
        'font', 'size', 'bold', 'italic', 'underline',
        'color', 'background', 'align',
        // 'image'
    ];

    const handleChange = (content, delta, source, editor) => {
        if (source === "user") {
            setContent(content);
            socket.emit('text-changes', delta, id.id);
        }
    };

    const insertDelta = (delta) => {
        if (quillRef.current && quillRef.current.getEditor) {
            const quill = quillRef.current.getEditor();
            quill.updateContents(delta);
        } else {
            console.error("Quill instance is not available");
        }
    };

    const getContent = async () => {
        try {
            const response = await apiClient.post('/document/documentData', {
                file_id: id.id,
            });
            // console.log(response.data);
            setFileInfo(response.data);
            setContent(response.data.content);
        } catch (error) {
            // console.log(error);
        }
    };

    const updateDocument = async () => {
        try {
            const response = await apiClient.post('/document/documentUpdate', {
                file_id: id.id,
                title,
                newContent: content,
            });
            if (response.status === 200) {
                toast({
                    description: "Changes saved",
                });
                return;
            }
        } catch (error) {
            console.error("API request failed, saving to IndexedDB:", error);
            try {
                await addDocument({
                    _id: id.id,
                    title:fileInfo?.title,
                    newContent: content,
                });
                toast({
                    description: "Changes saved offline",
                });
            } catch (dbError) {
                console.error("Failed to save to IndexedDB:", dbError);
            }
        }
    };
    
    //gets file content
    useEffect(() => {
        const fetchData = async () => {
            const syncSuccess = await syncData(id.id); // Ensure syncData finishes first
            if (syncSuccess) {
                await getContent(); // Fetch content only after syncData completes successfully
            } else {
                console.error("Sync failed. Fetching content skipped.");
            }
        };
    
        fetchData(); // Call the async function
    }, [user]);
    //socket events
    useEffect(() => {
        socket.emit('enter', user?.email, id.id);

        socket.on('enter', async (email, code) => {
            console.log(`User joined:`, email);
        });

        socket.on('text-changes', async (delta) => {
            // console.log(delta);
            insertDelta(delta);
        });

        socket.on('test', async () => {
            console.log(`Test event fired`);
        });

        return () => {
            // Clean up event listeners to avoid duplicate responses
            socket.off('enter');
            socket.off('text-changes');
            socket.off('test');
        };
    }, []);
    if (loading) return <p>Loading...</p>;
    if (!user) return <p>User not logged in</p>;
    return (
        <div> 
            <div className='nav flex justify-between'>
                <div className='title flex font-semibold text-xl'>
                    <div className='my-2'>
                        {fileInfo ? fileInfo.title : `Title`}
                    </div>
                    <div className="editbtn text-sm mx-2 text-zinc-400 hover:text-zinc-700 cursor-pointer">
                        <EditFileDialog fileInfo={fileInfo} setTitle={setTitle} />
                    </div>
                    <div className="editbtn text-sm cursor-pointer">
                        <ShareFileDialog className='border-2 text-black hover:bg-black hover:text-white '/>
                    </div>
                    <div className="editbtn text-sm mx-2 cursor-pointer">
                        <Button onClick={window.print} className={`${theme ? "text-black":""} hover:bg-black hover:text-white`} variant="outline"><Printer /></Button>
                    </div>
                </div>
                <div className="title m-2 flex justify-end gap-3">
                    <Button onClick={updateDocument} className={`${theme ? "text-black":""} hover:bg-black hover:text-white`} variant="outline">Save</Button>
                    <Button onClick={() => navigate(`/home`)} className={`${theme ? "text-black":""} hover:bg-black hover:text-white`} variant="outline">Back</Button>
                </div>
            </div>
            <ReactQuill
                theme="snow"
                className='editor'
                value={content}
                onChange={handleChange}
                modules={modules}
                formats={formats}
                ref={quillRef}
                placeholder="Start typing..."
                style={{ height: '80vh' }}
            />
        </div>
    );
};

export default Editor;
