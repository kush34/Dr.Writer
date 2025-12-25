import { ArrowDown, ChevronDown, X } from "lucide-react";
import { useState } from "react"


const FAQs = () => {
    const [currentIdx, setCurrentIdx] = useState(null);
    const faqs = [
        {
            title: "What is Dr.Writer ?",
            answer: "Dr.Writer is a full-featured document editor similar to Google Docs or Microsoft Word, built for the web with real-time collaboration so multiple users can edit simultaneously.",
        },
        {
            title: "How does real-time collaboration work ?",
            answer: "Dr.Writer uses Socket.IO to broadcast edits instantly across all connected users in a document, so you see other people’s changes live.",
        },
        {
            title: "Do I need an account to use Dr.Writer ?",
            answer: "Yes — you sign in/authenticate using Firebase Authentication, which handles user login and security.",
        },
        {
            title: "How do I share documents with others ?",
            answer: "You can generate shareable links and set permissions (edit/view/comment) for collaborators.",
        }
    ]

    return (
        <div className="text-secondary flex flex-col justify-center items-center p-10 border ">
            <div className="title font-medium text-2xl">
                FAQs
            </div>
            <div className="w-full xl:w-1/3 flex flex-col gap-4 mt-8">
                {faqs.map((faq, index) => {
                    return (
                        <button key={index} className="bg-accent px-5 py-2 flex flex-col items-start border gap-2" onClick={() => setCurrentIdx(prev => (prev == index) ? null : index)}>
                            <div className="w-full flex justify-between">
                                <span className="text-bolder text-foreground">
                                    {faq.title}
                                </span>
                                <span>{currentIdx != index ? <ChevronDown /> : <X />}</span>
                            </div>
                            <span className={` ${currentIdx == index ? "inline" : "hidden"} text-start`}>
                                {faq.answer}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default FAQs;