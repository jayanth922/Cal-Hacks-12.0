import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptMessage {
  speaker: "agent" | "user";
  text: string;
  timestamp: Date;
}

interface ParsedTripDetails {
  city: string;
  startDate: string;
  endDate: string;
}

export default function VoiceAgent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [agentTranscript, setAgentTranscript] = useState<TranscriptMessage[]>([]);
  const [userTranscript, setUserTranscript] = useState<TranscriptMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState<string>(""); // For showing real-time speech
  
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const utteranceBufferRef = useRef<string[]>([]); // Buffer to accumulate utterances

  // Add initial agent greeting
  useEffect(() => {
    setAgentTranscript([{
      speaker: "agent",
      text: "Hello! I'm your AI travel assistant. Tell me where you'd like to go and when you'd like to travel. For example, 'I want to visit Paris from November 1st to November 5th'.",
      timestamp: new Date()
    }]);
    
    // Cleanup on unmount
    return () => {
      console.log("Component unmounting, cleaning up...");
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (websocketRef.current) {
        websocketRef.current.close(1000, "Component unmounted");
      }
    };
  }, []);

  // Extract trip details from conversation
  const extractTripDetails = (messages: TranscriptMessage[]): ParsedTripDetails | null => {
    const allText = messages.map(m => m.text).join(" ");
    console.log("🔍 Analyzing text:", allText);
    
    // Extract city/location with more flexible patterns
    const cityPatterns = [
      /(?:visit|go to|travel to|trip to|going to)\s+([A-Z][a-zA-Z\s]+?)(?:\s+from|\s+on|\s+in|\s+starting|\s+between|\.|\,|$)/i,
      /(?:visit|go to|travel to|trip to|going to)\s+([A-Z][a-zA-Z]+)/i,
      /(?:^|\s)([A-Z][a-zA-Z\s]{3,})(?:\s+from|\s+on)/i,
    ];
    
    let city = "";
    for (const pattern of cityPatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        city = match[1].trim();
        // Clean up common words that might be picked up
        city = city.replace(/\s+(from|on|in|starting|between)$/i, '').trim();
        console.log("✅ Found city:", city);
        break;
      }
    }

    // Extract dates with MUCH more flexible patterns
    const datePatterns = [
      // "from November 2 to November 10"
      /from\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\s+to\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      // "November 2 to November 10" (without "from")
      /(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\s+to\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      // "2 to 10 November" or "2 to November 10"
      /(\d{1,2}(?:st|nd|rd|th)?)\s+to\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/i,
      // "11/1 to 11/5" or "11-1 to 11-5"
      /(\d{1,2}[-\/]\d{1,2}(?:[-\/]\d{2,4})?)\s+(?:to|through|-|until)\s+(\d{1,2}[-\/]\d{1,2}(?:[-\/]\d{2,4})?)/i,
      // "starting November 1 ending November 5"
      /starting\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?)\s+ending\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/i,
      // "between November 1 and November 5"
      /between\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?)\s+and\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/i,
    ];

    let startDate = "";
    let endDate = "";

    for (const pattern of datePatterns) {
      const match = allText.match(pattern);
      if (match && match[1] && match[2]) {
        console.log("📅 Date match found:", match[1], "to", match[2]);
        startDate = parseToISODate(match[1]);
        endDate = parseToISODate(match[2]);
        console.log("📅 Parsed dates:", startDate, "to", endDate);
        if (startDate && endDate) break;
      }
    }

    // Validation
    if (city && startDate && endDate) {
      console.log("✅ Complete trip details extracted:", { city, startDate, endDate });
      return { city, startDate, endDate };
    }
    
    console.log("⚠️ Incomplete details - City:", city, "Start:", startDate, "End:", endDate);
    return null;
  };

  // Convert natural language date to ISO format (YYYY-MM-DD)
  const parseToISODate = (dateStr: string): string => {
    try {
      console.log("📆 Parsing date string:", dateStr);
      
      // Remove ordinal suffixes (1st, 2nd, 3rd, 4th)
      dateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/g, '$1');
      
      // Handle "2" becoming "November 2" if just a number
      if (/^\d{1,2}$/.test(dateStr.trim())) {
        // Assume current month if just a day number
        const now = new Date();
        const monthName = now.toLocaleString('en-US', { month: 'long' });
        dateStr = `${monthName} ${dateStr}`;
      }
      
      // Parse the date
      let date = new Date(dateStr);
      
      // If parsing failed, try adding the current year
      if (isNaN(date.getTime())) {
        const now = new Date();
        const currentYear = now.getFullYear();
        dateStr = `${dateStr} ${currentYear}`;
        date = new Date(dateStr);
      }
      
      // If no year specified, assume current year or next year if date has passed
      if (!dateStr.match(/\d{4}/) && !isNaN(date.getTime())) {
        const now = new Date();
        date.setFullYear(now.getFullYear());
        
        // If the date is in the past, assume next year
        if (date < now) {
          date.setFullYear(now.getFullYear() + 1);
        }
      }
      
      if (!isNaN(date.getTime())) {
        const isoDate = date.toISOString().split('T')[0];
        console.log("✅ Parsed to ISO:", isoDate);
        return isoDate;
      }
    } catch (e) {
      console.error("❌ Error parsing date:", e);
    }
    console.log("⚠️ Failed to parse date:", dateStr);
    return "";
  };

  // Generate itinerary with extracted details
  const generateItinerary = async (details: ParsedTripDetails) => {
    setIsProcessing(true);
    
    // Disconnect voice session immediately
    console.log("🔌 Ending voice session...");
    disconnect();
    
    try {
      console.log("📤 Sending structured data to ASI backend:", details);
      
      const response = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: details.city,
          startDate: details.startDate,
          endDate: details.endDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate itinerary: ${response.statusText}`);
      }

      const itinerary = await response.json();
      console.log("✅ Itinerary generated successfully:", itinerary.id);
      
      // Save to localStorage
      try {
        const raw = localStorage.getItem("itineraries");
        const arr = raw ? JSON.parse(raw) : [];
        const deduped = arr.filter((a: any) => a.id !== itinerary.id);
        const newItineraries = [itinerary, ...deduped];
        localStorage.setItem("itineraries", JSON.stringify(newItineraries));
        console.log("💾 Itinerary saved to localStorage");
        
        // Trigger a custom event so the Home page can reload immediately
        window.dispatchEvent(new CustomEvent("itineraryUpdated", { detail: itinerary }));
      } catch (e) {
        console.error("Error saving itinerary:", e);
      }

      toast({
        title: "Success! 🎉",
        description: `Your trip to ${details.city} is ready. Redirecting...`,
      });

      // Redirect to home page immediately to show the itinerary
      console.log("🔄 Redirecting to /home...");
      setTimeout(() => {
        setLocation("/home");
      }, 800);
    } catch (error: any) {
      console.error("❌ Error generating itinerary:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate itinerary",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  // Connect to Deepgram
  const connectToDeepgram = async () => {
    try {
      const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;
      
      console.log("Checking API key...", DEEPGRAM_API_KEY ? "Found" : "Missing");
      
      if (!DEEPGRAM_API_KEY) {
        toast({
          title: "Configuration Error",
          description: "Deepgram API key is not configured. Please add VITE_DEEPGRAM_API_KEY to your .env file and restart the server.",
          variant: "destructive",
        });
        return;
      }

      console.log("Connecting to Deepgram...");

      // Create WebSocket connection to Deepgram with improved settings for longer utterances
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?` +
        `model=nova-2&` +
        `language=en&` +
        `smart_format=true&` +
        `interim_results=true&` +
        `endpointing=500&` +  // Wait 500ms of silence before finalizing
        `vad_events=true&` +   // Voice activity detection events
        `utterance_end_ms=2000`, // Wait 2 seconds before ending utterance
        ["token", DEEPGRAM_API_KEY]
      );

      ws.onopen = () => {
        console.log("✅ Connected to Deepgram successfully");
        setIsConnected(true);
        toast({
          title: "Connected",
          description: "Voice service connected. Start speaking!",
        });
        startRecording(ws);
      };

            ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Handle speech started event
        if (data.type === 'SpeechStarted') {
          console.log("🎤 Speech started");
          utteranceBufferRef.current = []; // Clear buffer when new speech starts
        }
        
        if (data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript;
          const isFinal = data.is_final;
          
          if (transcript) {
            if (!isFinal) {
              // Show interim results in real-time (optional: display to user)
              console.log("Interim:", transcript);
              setInterimTranscript(transcript);
            } else {
              // Final transcript - add to buffer
              console.log("Final transcript:", transcript);
              setInterimTranscript(""); // Clear interim
              
              // Add to utterance buffer
              utteranceBufferRef.current.push(transcript);
              
              // Add to user transcript immediately for display
              setUserTranscript(prev => [...prev, {
                speaker: "user",
                text: transcript,
                timestamp: new Date()
              }]);
            }
          }
        }
        
        // Handle utterance end event - this means user stopped speaking
        if (data.type === 'UtteranceEnd' || data.speech_final) {
          console.log("✅ Utterance ended - processing complete statement");
          
          // Combine all buffered transcripts into one complete statement
          const completeStatement = utteranceBufferRef.current.join(" ").trim();
          
          if (completeStatement) {
            console.log("📝 Complete statement:", completeStatement);
            
            // Generate intelligent agent response based on complete context
            setTimeout(() => {
              // Check if we have complete information before responding
              // Use all accumulated transcripts for better context
              const allUserMessages = userTranscript.map(t => t.text).join(" ") + " " + completeStatement;
              const details = extractTripDetails([{
                speaker: "user",
                text: allUserMessages,
                timestamp: new Date()
              }]);
              
              let response: string;
              
              if (details) {
                // We have all the information - confirm and prepare to generate
                console.log("✅ All details extracted:", details);
                response = `Perfect! I have everything I need. Creating your personalized itinerary for ${details.city} from ${details.startDate} to ${details.endDate}. This will just take a moment...`;
                
                setAgentTranscript(prev => [...prev, {
                  speaker: "agent",
                  text: response,
                  timestamp: new Date()
                }]);
                
                // Generate the itinerary and auto-redirect
                console.log("🚀 Initiating itinerary generation...");
                setTimeout(() => generateItinerary(details), 1500);
              } else {
                // We still need more information
                response = generateAgentResponse(completeStatement);
                setAgentTranscript(prev => [...prev, {
                  speaker: "agent",
                  text: response,
                  timestamp: new Date()
                }]);
              }
            }, 500);
            
            // Clear the buffer after processing
            utteranceBufferRef.current = [];
          }
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice service. Check console for details.",
          variant: "destructive",
        });
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log("Disconnected from Deepgram. Code:", event.code, "Reason:", event.reason);
        setIsConnected(false);
        setIsRecording(false);
        
        if (event.code !== 1000) { // 1000 is normal closure
          toast({
            title: "Disconnected",
            description: "Voice service disconnected. Click to reconnect.",
            variant: "destructive",
          });
        }
      };

      websocketRef.current = ws;
    } catch (error: any) {
      console.error("❌ Error connecting to Deepgram:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initialize voice service",
        variant: "destructive",
      });
    }
  };

  // Start recording audio
  const startRecording = async (ws: WebSocket) => {
    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      
      console.log("✅ Microphone access granted");
      
      // Use MediaRecorder if available, otherwise fall back to AudioContext
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(500); // Send data every 500ms
        mediaRecorderRef.current = mediaRecorder;
        console.log("✅ Recording started with MediaRecorder");
      } else {
        // Fallback to AudioContext
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        const source = audioContextRef.current.createMediaStreamSource(stream);
        
        // Use AudioWorklet if available, otherwise ScriptProcessor
        try {
          await audioContextRef.current.audioWorklet.addModule(
            URL.createObjectURL(new Blob([`
              class AudioProcessor extends AudioWorkletProcessor {
                process(inputs) {
                  const input = inputs[0];
                  if (input.length > 0) {
                    this.port.postMessage(input[0]);
                  }
                  return true;
                }
              }
              registerProcessor('audio-processor', AudioProcessor);
            `], { type: 'application/javascript' }))
          );
          
          const processorNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
          processorNode.port.onmessage = (event) => {
            if (ws.readyState === WebSocket.OPEN) {
              const audioData = event.data;
              const int16Data = new Int16Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
              }
              ws.send(int16Data.buffer);
            }
          };
          
          source.connect(processorNode);
          processorNode.connect(audioContextRef.current.destination);
          console.log("✅ Recording started with AudioWorklet");
        } catch (e) {
          // Final fallback to ScriptProcessor
          const processor = audioContextRef.current.createScriptProcessor(2048, 1, 1);
          
          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const audioData = e.inputBuffer.getChannelData(0);
              const int16Data = new Int16Array(audioData.length);
              
              for (let i = 0; i < audioData.length; i++) {
                int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
              }
              
              ws.send(int16Data.buffer);
            }
          };
          
          source.connect(processor);
          processor.connect(audioContextRef.current.destination);
          console.log("✅ Recording started with ScriptProcessor (fallback)");
        }
      }
      
      setIsRecording(true);
      toast({
        title: "Recording",
        description: "Listening to your voice...",
      });
    } catch (error: any) {
      console.error("❌ Error starting recording:", error);
      toast({
        title: "Microphone Error",
        description: error.message || "Could not access microphone. Please grant permissions.",
        variant: "destructive",
      });
    }
  };

  // Generate intelligent agent response based on user input and current context
  const generateAgentResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    // Check what information we already have from ALL user messages
    const allMessages = [...userTranscript, { speaker: "user" as const, text: userInput, timestamp: new Date() }];
    const allText = allMessages.map(m => m.text).join(" ");
    console.log("🤖 Generating response for accumulated text:", allText);
    
    // Try to extract what we have so far
    let hasCity = false;
    let hasStartDate = false;
    let hasEndDate = false;
    let cityName = "";
    
    // Check for city
    const cityMatch = allText.match(/(?:visit|go to|travel to|trip to|going to)\s+([A-Z][a-zA-Z\s]+?)(?:\s+from|\s+on|\s+in|\s+starting|\s+between|\.|\,|$)/i);
    if (cityMatch) {
      hasCity = true;
      cityName = cityMatch[1].trim().replace(/\s+(from|on|in|starting|between)$/i, '').trim();
      console.log("Found city:", cityName);
    }
    
    // Check for dates
    const dateMatch = allText.match(/(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\s+to\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i);
    if (dateMatch) {
      hasStartDate = true;
      hasEndDate = true;
      console.log("Found dates:", dateMatch[1], "to", dateMatch[2]);
    }
    
    // Give specific feedback based on what we have
    if (!hasCity && !hasStartDate && !hasEndDate) {
      return "I'd be happy to help you plan your trip! Where would you like to go, and when are you planning to travel?";
    }
    
    if (hasCity && !hasStartDate && !hasEndDate) {
      return `Great! I see you want to visit ${cityName}. When would you like to travel? Please tell me your dates.`;
    }
    
    if (hasCity && hasStartDate && hasEndDate) {
      // This shouldn't happen as it would be caught earlier, but just in case
      return `Perfect! I have your trip to ${cityName}. Let me create your itinerary!`;
    }
    
    if (hasCity && (hasStartDate || hasEndDate)) {
      return `Almost there! I have ${cityName} and partial dates. Can you confirm both your start and end dates?`;
    }
    
    if (!hasCity && (hasStartDate || hasEndDate)) {
      return "I have your travel dates. Which city or destination would you like to visit?";
    }
    
    // Fallback
    return "Could you tell me the destination city and your complete travel dates (start and end)?";
  };

  // Stop recording and disconnect
  const disconnect = () => {
    console.log("Disconnecting...");
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (websocketRef.current) {
      websocketRef.current.close(1000, "User disconnected");
      websocketRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    
    console.log("✅ Disconnected successfully");
  };

  // Manual skip to home
  const skipToHome = () => {
    disconnect();
    setLocation("/home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Travel Assistant</h1>
              <p className="text-sm text-gray-600">Voice-powered itinerary planning</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={skipToHome}>
                Skip to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Agent Transcript (Left Side) */}
          <Card className="p-6 flex flex-col h-[calc(100vh-250px)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">AI Assistant</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {agentTranscript.map((msg, idx) => (
                <div key={idx} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500 rounded-full p-2 text-white">
                      <Mic className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{msg.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* User Transcript (Right Side) */}
          <Card className="p-6 flex flex-col h-[calc(100vh-250px)]">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">You</h2>
              <p className="text-sm text-gray-600">Your voice input appears here</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {userTranscript.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-center">
                  <div>
                    <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Start speaking to see your transcript here</p>
                  </div>
                </div>
              ) : (
                userTranscript.map((msg, idx) => (
                  <div key={idx} className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-500 rounded-full p-2 text-white">
                        <Mic className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{msg.text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="mt-6 flex justify-center gap-4">
          {!isConnected && !isProcessing ? (
            <Button
              size="lg"
              onClick={connectToDeepgram}
              className="px-8"
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Voice Session
            </Button>
          ) : isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600 font-medium">
                Generating your personalized itinerary...
              </p>
            </div>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              onClick={disconnect}
              className="px-8"
            >
              <MicOff className="mr-2 h-5 w-5" />
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Creating Your Itinerary
            </h3>
            <p className="text-gray-600">
              Our AI is crafting a personalized travel plan just for you.
              You'll be redirected to view it shortly...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
