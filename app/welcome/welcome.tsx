import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ExpenseChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef<string>("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamFromServer = async (userMessage: string) => {
    if (isStreaming) return; // Prevent duplicate calls
    
    setIsStreaming(true);
    streamingContentRef.current = ""; // Reset streaming content
    
    const userMsg: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    
    const assistantMsg: Message = { role: "assistant", content: "", isStreaming: true };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/expense/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      if (!response.ok) {
        console.error("Network error");
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = "Error: Unable to connect to server.";
          updated[updated.length - 1].isStreaming = false;
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      if (!response.body) {
        console.error("Response body is null");
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = "Error: No response from server.";
          updated[updated.length - 1].isStreaming = false;
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value);
          console.log("CHUNK DATA: ", chunk);

          if (chunk.includes("[END]")) {
            break;
          } else {
            // Accumulate in ref to avoid double rendering issues
            streamingContentRef.current += chunk;
            
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1].content = streamingContentRef.current;
              return updated;
            });
          }
        }
      }
      
      // Mark streaming as complete
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].isStreaming = false;
        }
        return updated;
      });
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = "Error: Failed to fetch response.";
        updated[updated.length - 1].isStreaming = false;
        return updated;
      });
    }
    
    setIsStreaming(false);
    streamingContentRef.current = ""; // Clear ref after streaming
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    if (!input.trim() || isStreaming) return;
    
    const message = input;
    setInput(""); // Clear input immediately
    streamFromServer(message);
  };

  // Helper to detect if content contains HTML
  const isHTML = (content: string): boolean => {
    return /<[a-z][\s\S]*>/i.test(content.trim());
  };

  // Component to render HTML content properly
  const HTMLContent = ({ content, isStreaming }: { content: string; isStreaming: boolean }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (!containerRef.current) return;
      
      if (isStreaming) {
        // During streaming: show raw HTML as code
        containerRef.current.textContent = content;
      } else {
        // After streaming: render as actual HTML
        containerRef.current.innerHTML = content;
      }
    }, [content, isStreaming]);

    if (isStreaming) {
      return (
        <div>
          <div className="mb-2 text-xs text-gray-500 italic">Receiving data...</div>
          <div 
            ref={containerRef}
            className="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-3 rounded border border-gray-200 max-h-64 overflow-y-auto"
          />
        </div>
      );
    }

    return (
      <div 
        ref={containerRef}
        className="overflow-x-auto"
      />
    );
  };

  // Render message content
  const renderContent = (message: Message) => {
    const { content, isStreaming: streaming } = message;
    
    if (!content) {
      return <span className="text-gray-400">...</span>;
    }

    if (isHTML(content)) {
      return <HTMLContent content={content} isStreaming={streaming || false} />;
    }

    return (
        <ReactMarkdown>{content}</ReactMarkdown>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">Expense Assistant</h1>
        <p className="text-sm text-gray-500">Ask me about your expenses</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-lg font-medium text-gray-600 mb-2">
                Start a conversation
              </h2>
              <p className="text-sm text-gray-500">
                Ask me to display your expenses or help with expense tracking
              </p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-500 text-white max-w-[70%]"
                    : "bg-white border border-gray-200 text-gray-800 max-w-[85%]"
                }`}
              >
                {message.role === "assistant" ? (
                  renderContent(message)
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
              
              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isStreaming}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}