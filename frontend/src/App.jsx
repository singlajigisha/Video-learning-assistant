import { useRef, useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const API_BASE = import.meta.env.VITE_API_URL;

function SummaryDisplay({ summary }) {
  const cleaned = summary.replace(/[`#*]/g, "");
  const lines = cleaned.split("\n");

  return (
    <>
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3  text-left ">
        Summary:
      </h2>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i}  />;

        const leadingSpaces = line.match(/^(\s*)/)[0].length;
        const trimmed = line.trim();

        if (trimmed.startsWith("-")) {
          const text = trimmed.replace(/^-+\s*/, "");
          const nestLevel = Math.floor(leadingSpaces /1);

          return (
            <p
              key={i}
              className="font-normal text-gray-700 text-sm sm:text-base  mb-0"
              style={{ marginLeft: `${(nestLevel + 1) * 20}px` }}
            >
              • {text}
            </p>
          );
        }

        return (
          <p
            key={i}
            className=" text-base sm:text-lg md:text-xl mt-3 mb-1"
          >
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

  const fileInputRef = useRef(null);
  const lastMessageRef = useRef(null);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [messages]);

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
          <h1 className="font-bold import font-sans  sm:text-2xl md:text-3xl lg:text-4xl">
            Video Learning Assistant....
          </h1>
        </div>
        <p className="mt-2 text-gray-600 font-sans text-sm sm:text-base md:text-lg">
          Summarize videos • Ask questions • Learn faster
        </p>
      </div>

      <div>
        <div
          className={`fixed left-0 right-0 z-50 bg-white flex justify-center px-4
    transition-all duration-500 ease-out
    ${hasUploaded ? "top-24" : "top-1/2 -translate-y-1/2"}`}
        >
          <div className="flex w-full max-w-5xl items-center gap-2 mt-7 ">
            <div className="relative flex-1">
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-gray-500 hover:text-gray-800"
              >
                +
              </button>

              <input
                className="
          w-full
          border
          border-gray-300
          rounded-full
          bg-white
          py-3
          pl-10
          pr-4
          placeholder:text-gray-400
          font-sans
          text-sm
          sm:text-base
        "
                type="text"
                placeholder="Paste YouTube URL or upload video"
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
              className="flex items-center justify-center rounded-full disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <img
                  src="/upload.png"
                  alt="Upload"
                  className="w-8 h-8 sm:w-10 sm:h-10"
                />
              )}
            </button>
          </div>
        </div>

        {summary && (
          <div className="p-4 flex flex-col items-center justify-center mt-15 my-5 ">
            <h2 className="font-semibold text-lg sm:text-xl text-center mb-4">
              🎥 {videoTitle}
            </h2>

            <div className="w-full max-w-5xl bg-pink-50 rounded-lg p-4 whitespace-pre-wrap text-sm sm:text-base  font-sans overflow-y-auto max-h-96">
              <SummaryDisplay summary={summary} />
            </div>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-white-200">
          <div className="relative  flex justify-center m-5 p-3 sm:p-4  ">
            <div className="relative w-full max-w-5xl">
              <input
                className="w-full max-w-5xl border border-gray-200 rounded-full bg-gray-200 px-4 py-3 pr-16 placeholder:text-gray-400 font-sans text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 "
                type="text"
                placeholder="Ask your question here"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              />

              <button
                onClick={handleAsk}
                disabled={asking}
                className="absolute right-0  sm:right-6 top-1/2 -translate-y-1/2 disabled:opacity-50 "
              >
                {asking ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <img
                    src="/send.png"
                    alt="Send"
                    className="w-8 h-8 sm:w-10 sm:h-10"
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl px-3 sm:px-4 md:px-6 mx-auto pb-24 mt-6">
          {messages.map((msg, index) => {
            {/* const isLast = index === messages.length - 1; */}
            const isLast =
    msg.type === "bot" &&
    index === messages.map((m) => m.type).lastIndexOf("bot");
            return (
              <div
                key={index}
                ref={isLast ? lastMessageRef : null}
                className={`font-sans mb-5`}
              >
                <div
                  className={`flex font-sans mb-5 ${
                    msg.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2 font-sans rounded-2xl max-w-[90%] sm:max-w-[80%] md:max-w-[70%] ${
                      msg.type === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-black"
                    } ${editingIndex === index ? "ring-2 ring-yellow-400" : ""}`}
                  >
                    {msg.text}
                  </div>
                </div>

                {msg.type === "user" && (
                  <div className="mt-3 mr-2">
                    <div className="flex gap-2 justify-end">
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
            );
          })}
        </div>
      </div>

      <img
        src="/video-player.png"
        alt="Chat mascot"
        className="hidden md:block fixed bottom-20 left-4 lg:left-8 xl:left-12 w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64  xl:w-80  xl:h-80 z-40"
      />

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </>
  );
}
