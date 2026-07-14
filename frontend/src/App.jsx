import { useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const API_BASE = import.meta.env.VITE_API_URL;

function SummaryDisplay({ summary }) {
  const cleaned = summary.replace(/[`#*]/g, ""); 
  const lines = cleaned.split("\n");

  return (
    <>
      <h2 className="text-xl font-bold mb-3  text-left ">Summary:</h2>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        const leadingSpaces = line.match(/^(\s*)/)[0].length;
        const trimmed = line.trim();

        if (trimmed.startsWith("-")) {
          const text = trimmed.replace(/^-+\s*/, "");
          const nestLevel = Math.floor(leadingSpaces / 2);

          return (
            <p
              key={i}
              className="font-normal text-gray-700 mb-1"
              style={{ marginLeft: `${(nestLevel + 1) * 20}px` }}
            >
              • {text}
            </p>
          );
        }

        return (
          <p key={i} className="font-bold text-lg mt-3 mb-1">
            {trimmed}
          </p>
        );
      })}
    </>
  );
}

export default function App() {
  const [summary, setSummary] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [hasUploaded, setHasUploaded] = useState(false);

  const handleCopy = (text, index) => {
    if (!text) {
      console.warn("Nothing to copy");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1500);
      })
      .catch((err) => console.error("Copy failed:", err));
  };

  const handleEdit = (index, text) => {
    setQuestion(text);
    setEditingIndex(index);
  };

  const fileInputRef = useRef(null);
  const handlePlusClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVideoFile(file);
    setYoutubeUrl("");
  };




  const handleUpload = async () => {
  if (!videoFile && !youtubeUrl.trim()) {
    toast.error("Paste a URL or choose a file first");
    return;
  }

  setUploading(true);
  setSummary("");
  

  try {
    let res;

    if (videoFile) {
      const formData = new FormData();
      formData.append("video", videoFile);

      res = await fetch(`${API_BASE}/upload-file`, {
        method: "POST",
        body: formData,
      });
    } else {
      res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl }),
      });
    }

    const data = await res.json();

    if (data.success) {
      toast.success(data.message || "Video uploaded successfully!", {
        style: { background: "#228B22", color: "#fff" },
      });
      setYoutubeUrl("");
      setVideoFile(null);
      setHasUploaded(true);
    } else {
      toast.error(data.message || "Invalid video or URL!");
    }

    if (data.success && data.summary) {
      setSummary(data.summary);
      setVideoTitle(data.title);
    }
  } catch (err) {
    toast.error("Could not reach server");
    console.error(err);
  } finally {
    setUploading(false);
  }
};

  const handleAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const botReply = data.success
        ? data.answer
        : data.message || "Something went wrong";

      setMessages((prev) => [
        ...prev,
        {
          type: "user",
          text: question,
        },
        {
          type: "bot",
          text: botReply,
        },
      ]);

      setQuestion("");
    } catch (err) {
      (setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: "Could not reach server",
        },
      ]),
        err);
    } finally {
      setAsking(false);
    }
  };

  return (
    <>
      <div className="App sticky top-0 bg-blue-100 text-center p-4 z-50">
        <div className="flex items-center justify-center gap-2 ">
          <img src="/online-teaching.png" className="w-10 h-10 inline-block" />
          <h1 className="text-3xl font-bold import font-sans">
           Video Learning Assistant....
          </h1>
        </div>
        <p className=" text-gray-600 font-sans">
          Summarize videos • Ask questions • Learn faster
        </p>
      </div>

      <div>
      
        <div className={`fixed left-0 right-0 z-50 flex justify-center p-4 bg-white
                transition-all duration-500 ease-out
                 ${hasUploaded ? 'top-24' : 'top-1/2 -translate-y-1/2'}`}>
          <div className="relative">
            <input
              type="file"
              accept="video/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={handlePlusClick}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl text-gray-500 hover:text-gray-800"
            >
              +
            </button>

            
            <input
              className="border border-gray-300 p-2 pl-10 rounded placeholder:text-gray-400 font-sans w-190"
              type="text"
              placeholder="paste video URL and upload video"
              value={videoFile ? videoFile.name : youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                setVideoFile(null);
              }}
              readOnly={!!videoFile}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex justify-end text-white px-4 py-2 rounded-full ml-2 disabled:opacity-50 m-0"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <img src="/upload.png" alt="Upload" className="w-6 h-6" />
            )}
          </button>
        </div>

        {summary && (
          <div className="p-4 flex flex-col items-center justify-center m-5">
            <h2 className="font-semibold text-lg">🎥 {videoTitle}</h2>

            <div className="rounded p-4  whitespace-pre-wrap text-base  font-bold font-sans  bg-pink-50  overflow-y-auto max-auto w-190 max-h-96 mr-18">
              <SummaryDisplay summary={summary} />
            </div>
          </div>
        )}

        <div className="fixed bottom-0  flex justify-center z-50 bg-white w-full">
          <div className="relative  flex justify-center m-5 p-4 mb-0 ">
            <input
              className="border border-gray-200 rounded p-4 placeholder:text-gray-400 w-200 bg-gray-100 font-sans"
              type="text"
              placeholder="Ask your question here"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            />

            <button
              onClick={handleAsk}
              disabled={asking}
              className="absolute right-0 top-2 text-white px-4 py-2 rounded-full ml-2 disabled:opacity-50 m-2 "
            >
              {asking ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <img src="/send.png" alt="Send" className="w-10 h-10" />
              )}
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto pb-24 mt-6">
          {messages.map((msg, index) => (
            <div key={index} className={`font-sans  mb-5 `}>
              <div
                className={`flex font-sans  mb-5 ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
        className={`px-4 py-2 font-sans rounded-2xl max-w-[70%] ${
          msg.type === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
        } ${editingIndex === index ? "ring-2 ring-yellow-400" : ""}`}   
      >
                  {msg.text}
                </div>
              </div>

              {msg.type === "user" && (
                <div className="mt-3 mr-2">
                  <div className="flex gap-2 justify-end ">
                    <img
                      src="/pen.png"
                      alt="Edit"
                      title="Edit"
                      className="w-5 h-5 cursor-pointer opacity-70 hover:opacity-100 transition"
                      onClick={() => handleEdit(index, msg.text)}
                    />
                    <img
                      src="/copy.png"
                      alt="Copy"
                      title="Copy"
                      className="w-5 h-5 cursor-pointer opacity-70 hover:opacity-100 transition"
                      onClick={() => handleCopy(msg.text, index)}
                    />
                    {copiedIndex === index && (
                      <span className="text-xs text-gray-500 ml-1">
                        Copied!
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <img
        src="/video-player.png"
        alt="Chat mascot"
        className="fixed bottom-24 left-30 w-80 h-80 z-40"
      />
      
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </>
  );
}
