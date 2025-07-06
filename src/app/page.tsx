
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Mail, Users, FileText, Sparkles, Send, Bot, Lightbulb, Plus, Search, Home, MessageCircle, User, ArrowLeft, Check, CheckCheck, Trash2, RefreshCw, Volume2, LogOut, ChevronDown, Loader2, X, Settings, FileEdit } from 'lucide-react';
import { analyzeText, type AnalyzeTextOutput } from '@/ai/flows/analyze-text';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { generateCommunityDescription } from '@/ai/flows/generate-community-description';
import { suggestSentences } from '@/ai/flows/suggest-sentences';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, type User as FirebaseUser, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, db, rtdb } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, setDoc, getDocs, orderBy, getDoc, updateDoc, arrayUnion, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, onValue, onDisconnect, serverTimestamp as rtdbServerTimestamp, push, runTransaction, query as rtdbQuery, orderByChild, update as rtdbUpdate, remove as rtdbRemove } from 'firebase/database';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CommunityCard, CreateCommunityCard } from '@/components/community-cards';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Helper to get a consistent conversation ID
const getConversationId = (uid1: string, uid2: string) => {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

const USER_COLORS = [
    'text-red-500', 'text-green-500', 'text-blue-500', 'text-yellow-500', 
    'text-purple-500', 'text-pink-500', 'text-indigo-500', 'text-teal-500'
];

const THEMES = [
    { name: 'default', primary: '116 12% 51%', ring: '116 12% 51%' },
    { name: 'rose', primary: '346.8 77.2% 49.8%', ring: '346.8 77.2% 49.8%' },
    { name: 'orange', primary: '24.6 95% 53.1%', ring: '24.6 95% 53.1%' },
    { name: 'green', primary: '142.1 76.2% 36.3%', ring: '142.1 76.2% 36.3%' },
    { name: 'blue', primary: '221.2 83.2% 53.3%', ring: '221.2 83.2% 53.3%' },
];

const getUserColor = (userId: string) => {
    if (!userId) return USER_COLORS[0];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return USER_COLORS[hash % USER_COLORS.length];
};

const ChatView = ({ user, conversation, usersCache, messages, newMessage, setNewMessage, onSendMessage, onBack, suggestions, isSuggesting, onSuggestionClick }: any) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]);

  if (!conversation?.id || !user) return null;

  const otherParticipantId = conversation.participantIds.find((id: string) => id !== user.uid);
  const otherUser = usersCache[otherParticipantId];
  
  return (
      <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center p-4 border-b border-blue-200/50 backdrop-blur-lg bg-white/90">
              <button onClick={onBack} className="mr-2 sm:mr-4 p-2 rounded-full hover:bg-gray-200">
                  <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-3">
                 <span className="text-white font-semibold text-base sm:text-lg">{otherUser?.displayName?.charAt(0).toUpperCase()}</span>
              </div>
              <h2 className="font-semibold text-gray-900">{otherUser?.displayName}</h2>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-hover">
              {messages.map((msg: any) => {
                  const isReadByOther = msg.readBy?.includes(otherParticipantId);
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl max-w-xs md:max-w-md ${msg.senderId === user.uid ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                            <p className="text-sm break-words">{msg.content}</p>
                        </div>
                        {msg.senderId === user.uid && (
                            isReadByOther ? <CheckCheck className="h-4 w-4 text-blue-500" /> : <Check className="h-4 w-4 text-orange-500" />
                        )}
                    </div>
                  )
              })}
               <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-blue-200/50 backdrop-blur-lg bg-white/90">
                {(isSuggesting || suggestions.length > 0) && (
                    <div className="mb-2 p-2 bg-blue-50/50 rounded-lg border border-blue-200/30">
                        <div className="flex items-center gap-2 flex-wrap min-h-[20px]">
                            {isSuggesting && suggestions.length === 0 && (
                                <span className="text-xs text-gray-500 flex items-center gap-1 animate-pulse">
                                    <Bot className="h-3 w-3" />
                                    ...
                                </span>
                            )}
                            {suggestions.map((suggestion: string, index: number) => (
                                <button
                                    key={index}
                                    onClick={() => onSuggestionClick(suggestion)}
                                    className="text-xs bg-white text-blue-800 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors border border-blue-200/50"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
              <div className="flex items-center space-x-2">
                  <input 
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
                      placeholder="Écrivez un message..."
                      className="flex-1 w-full p-3 border-2 border-input rounded-xl focus:border-primary focus:outline-none bg-blue-50/30 backdrop-blur-sm text-sm"
                  />
                  <button 
                      onClick={onSendMessage}
                      className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                      disabled={!newMessage.trim()}
                  >
                      <Send className="h-5 w-5" />
                  </button>
              </div>
          </div>
      </div>
  );
};

const CommunityChatView = ({ user, community, messages, newMessage, setNewMessage, onSendMessage, onBack, isCreator, onEdit, onDelete, suggestions, isSuggesting, onSuggestionClick }: any) => {
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  
    useEffect(() => {
      scrollToBottom();
    }, [messages]);
  
    if (!community?.id || !user) return null;
  
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center p-4 border-b border-purple-200/50 backdrop-blur-lg bg-white/90">
                <button onClick={onBack} className="mr-2 sm:mr-4 p-2 rounded-full hover:bg-gray-200">
                    <ArrowLeft className="h-5 w-5 text-gray-700" />
                </button>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-semibold text-base sm:text-lg">{community.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                    <h2 className="font-semibold text-gray-900">{community.name}</h2>
                    <p className="text-xs text-gray-500">{community.memberCount} {community.memberCount > 1 ? 'membres' : 'membre'}</p>
                </div>
                {isCreator && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onEdit}>
                                <FileEdit className="mr-2 h-4 w-4" />
                                <span>Modifier</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Supprimer</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
  
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-hover">
                {messages.map((msg: any) => (
                    <div key={msg.id} className={`flex flex-col gap-1 ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                        {msg.senderId !== user.uid && <span className={`text-xs font-bold ml-3 ${getUserColor(msg.senderId)}`}>{msg.senderName}</span>}
                        <div className={`px-4 py-2 rounded-2xl max-w-xs md:max-w-md ${msg.senderId === user.uid ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                            <p className="text-sm break-words">{msg.content}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
  
            {/* Input Area */}
            <div className="p-4 border-t border-purple-200/50 backdrop-blur-lg bg-white/90">
                {(isSuggesting || suggestions.length > 0) && (
                    <div className="mb-2 p-2 bg-purple-50/50 rounded-lg border border-purple-200/30">
                        <div className="flex items-center gap-2 flex-wrap min-h-[20px]">
                            {isSuggesting && suggestions.length === 0 && (
                                <span className="text-xs text-gray-500 flex items-center gap-1 animate-pulse">
                                    <Bot className="h-3 w-3" />
                                    ...
                                </span>
                            )}
                            {suggestions.map((suggestion: string, index: number) => (
                                <button
                                    key={index}
                                    onClick={() => onSuggestionClick(suggestion)}
                                    className="text-xs bg-white text-purple-800 px-2 py-1 rounded-full hover:bg-purple-100 transition-colors border border-purple-200/50"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex items-center space-x-2">
                    <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
                        placeholder="Écrivez un message dans la communauté..."
                        className="flex-1 w-full p-3 border-2 border-input rounded-xl focus:border-primary focus:outline-none bg-purple-50/30 backdrop-blur-sm text-sm"
                    />
                    <button 
                        onClick={onSendMessage}
                        className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                        disabled={!newMessage.trim()}
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};


const FicheApp = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const [userText, setUserText] = useState('');
  
  // AI analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeTextOutput | null>(null);
  
  // Auth states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const { toast } = useToast();

  // Messaging states
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [usersToMessage, setUsersToMessage] = useState<any[]>([]);
  const [usersCache, setUsersCache] = useState<{[key: string]: any}>({});
  const [presenceCache, setPresenceCache] = useState<{[key: string]: any}>({});
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [conversationSearchQuery, setConversationSearchQuery] = useState('');
  const [messageFilter, setMessageFilter] = useState('all'); // 'all', 'unread'

  // TTS states
  const [userTextAudio, setUserTextAudio] = useState<string | null>(null);
  const [isGeneratingUserTextAudio, setIsGeneratingUserTextAudio] = useState(false);
  const [aiExplanationAudio, setAiExplanationAudio] = useState<string | null>(null);
  const [isGeneratingAiAudio, setIsGeneratingAiAudio] = useState(false);
  
  // Community states
  const [communities, setCommunities] = useState<any[]>([]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<any | null>(null);
  const [communityMessages, setCommunityMessages] = useState<any[]>([]);
  const [newCommunityMessage, setNewCommunityMessage] = useState('');
  const [communityUnreadCounts, setCommunityUnreadCounts] = useState<{ [key: string]: number }>({});
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<any | null>(null);
  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [showEditCommunityModal, setShowEditCommunityModal] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<any | null>(null);
  const [showDeleteCommunityConfirm, setShowDeleteCommunityConfirm] = useState<any | null>(null);
  const [isUpdatingCommunity, setIsUpdatingCommunity] = useState(false);


  // Settings states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  const [profileVisibility, setProfileVisibility] = useState(true);

  // Notification sound
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const prevTotalUnreadDirectMessages = useRef(0);
  const prevTotalUnreadCommunityMessages = useRef(0);
  const isInitialLoad = useRef(true);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // AI text suggestions
  const [textSuggestions, setTextSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debouncedUserText = useDebounce(userText, 750);

  // AI chat suggestions
  const [directMessageSuggestions, setDirectMessageSuggestions] = useState<string[]>([]);
  const [isSuggestingDirect, setIsSuggestingDirect] = useState(false);
  const debouncedNewMessage = useDebounce(newMessage, 750);

  const [communityMessageSuggestions, setCommunityMessageSuggestions] = useState<string[]>([]);
  const [isSuggestingCommunity, setIsSuggestingCommunity] = useState(false);
  const debouncedNewCommunityMessage = useDebounce(newCommunityMessage, 750);


  // AI Suggestions Effect
  useEffect(() => {
    if (debouncedUserText.trim().length > 10) {
      const fetchSuggestions = async () => {
        setIsSuggesting(true);
        try {
          const result = await suggestSentences({ text: debouncedUserText });
          setTextSuggestions(result.suggestions);
        } catch (error) {
          console.error("Erreur lors de la récupération des suggestions:", error);
          setTextSuggestions([]);
        } finally {
          setIsSuggesting(false);
        }
      };
      fetchSuggestions();
    } else {
      setTextSuggestions([]);
    }
  }, [debouncedUserText]);

  // AI Suggestions Effect for Direct Messages
  useEffect(() => {
    if (debouncedNewMessage.trim().length > 3 && selectedConversation) {
        const fetchSuggestions = async () => {
            setIsSuggestingDirect(true);
            try {
                const result = await suggestSentences({ text: debouncedNewMessage });
                setDirectMessageSuggestions(result.suggestions);
            } catch (error) {
                console.error("Erreur lors de la récupération des suggestions de chat:", error);
                setDirectMessageSuggestions([]);
            } finally {
                setIsSuggestingDirect(false);
            }
        };
        fetchSuggestions();
    } else {
        setDirectMessageSuggestions([]);
    }
  }, [debouncedNewMessage, selectedConversation]);

  // AI Suggestions Effect for Community Messages
  useEffect(() => {
      if (debouncedNewCommunityMessage.trim().length > 3 && selectedCommunity) {
          const fetchSuggestions = async () => {
              setIsSuggestingCommunity(true);
              try {
                  const result = await suggestSentences({ text: debouncedNewCommunityMessage });
                  setCommunityMessageSuggestions(result.suggestions);
              } catch (error) {
                  console.error("Erreur lors de la récupération des suggestions de communauté:", error);
                  setCommunityMessageSuggestions([]);
              } finally {
                  setIsSuggestingCommunity(false);
              }
          };
          fetchSuggestions();
      } else {
          setCommunityMessageSuggestions([]);
      }
  }, [debouncedNewCommunityMessage, selectedCommunity]);


  // Apply theme from localStorage on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'default';
    const theme = THEMES.find(t => t.name === savedTheme) || THEMES[0];
    setCurrentTheme(savedTheme);
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--ring', theme.ring);
  }, []);

  // Fetch user data and cache it
  const fetchUsersData = async (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return;
    const newUsersToFetch = userIds.filter(id => !usersCache[id]);
    if (newUsersToFetch.length === 0) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "in", newUsersToFetch));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: {[key: string]: any} = {};
      querySnapshot.forEach((doc) => {
        fetchedUsers[doc.data().uid] = doc.data();
      });
      setUsersCache(prev => ({...prev, ...fetchedUsers}));
    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs:", error);
    }
  };

  // Presence System
  useEffect(() => {
    if (!user) return;

    const userStatusRef = rtdbRef(rtdb, `/status/${user.uid}`);
    const presenceInfo = {
        state: 'online',
        last_changed: rtdbServerTimestamp(),
    };
    
    onDisconnect(userStatusRef).set({ state: 'offline', last_changed: rtdbServerTimestamp() })
        .then(() => {
            rtdbSet(userStatusRef, presenceInfo);
        });

    const statusRef = rtdbRef(rtdb, '/status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            setPresenceCache(data);
        }
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for conversations
  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    const conversationsRef = collection(db, "conversations");
    const q = query(conversationsRef, where("participantIds", "array-contains", user.uid), orderBy("updatedAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const convos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConversations(convos);

      const allParticipantIds = convos.flatMap(c => c.participantIds);
      const uniqueParticipantIds = [...new Set(allParticipantIds)];
      fetchUsersData(uniqueParticipantIds);
    }, (error: any) => {
      console.error("Erreur d'écoute des conversations: ", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for messages in the selected conversation
  useEffect(() => {
    if (!selectedConversation?.id) {
        setMessages([]);
        return;
    }

    const messagesRef = collection(db, "conversations", selectedConversation.id, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
    }, (error: any) => {
        console.error("Erreur d'écoute des messages: ", error);
    });

    return () => unsubscribe();
  }, [selectedConversation?.id, user?.uid]);
  
  // Mark messages as read
  useEffect(() => {
    if (!selectedConversation?.id || !user?.uid || !messages.length) {
      return;
    }
  
    const markAsRead = async () => {
      if (!selectedConversation?.id || !user?.uid) return;
  
      const conversationRef = doc(db, 'conversations', selectedConversation.id);
      const batch = writeBatch(db);
      let unreadCount = 0;
  
      messages.forEach(msg => {
        if (msg.senderId !== user.uid && (!msg.readBy || !msg.readBy.includes(user.uid))) {
          const msgRef = doc(db, 'conversations', selectedConversation.id, 'messages', msg.id);
          batch.update(msgRef, {
            readBy: arrayUnion(user.uid)
          });
          unreadCount++;
        }
      });
      
      if (unreadCount > 0) {
        batch.update(conversationRef, {
          [`unreadCounts.${user.uid}`]: 0
        });
  
        try {
          await batch.commit();
        } catch (error) {
          console.error("Erreur lors de la mise à jour des messages comme lus:", error);
        }
      }
    };
    
    markAsRead();
  }, [selectedConversation?.id, messages, user?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setShowLogin(false);
        const userRef = doc(db, "users", currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(doc(db, "users", currentUser.uid), {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "Anonymous",
              photoURL: currentUser.photoURL || null,
              createdAt: serverTimestamp(),
              isVerified: currentUser.emailVerified,
              visibility: "public",
            });
          } else {
             setProfileVisibility(userSnap.data().visibility === 'public');
          }
        } catch (error: any) {
          console.error("Erreur de synchronisation de l'utilisateur:", error);
          toast({
            title: "Erreur de synchronisation",
            description: "Impossible de synchroniser les données utilisateur.",
            variant: "destructive",
          });
        }
      } else {
        isInitialLoad.current = true; // Reset on logout
      }
    });
    return () => unsubscribe();
  }, [toast]);
  
    // Listen for communities in Realtime Database
    useEffect(() => {
        setIsLoadingCommunities(true);
        const communitiesRef = rtdbRef(rtdb, "communities");
        
        const unsubscribe = onValue(communitiesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const comms = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                comms.sort((a, b) => b.createdAt - a.createdAt);
                setCommunities(comms);
            } else {
                setCommunities([]);
            }
            setIsLoadingCommunities(false);
        }, (error) => {
            console.error("Error fetching communities from RTDB:", error);
            setIsLoadingCommunities(false);
            toast({ title: "Erreur", description: "Impossible de charger les communautés.", variant: 'destructive' });
        });
  
        return () => unsubscribe();
    }, [toast]);

    // Listen for community messages
    useEffect(() => {
        if (!selectedCommunity?.id) {
            setCommunityMessages([]);
            return;
        }

        const messagesRef = rtdbRef(rtdb, `community-messages/${selectedCommunity.id}`);
        const q = rtdbQuery(messagesRef, orderByChild('timestamp'));
        
        const unsubscribe = onValue(q, (snapshot) => {
            const data = snapshot.val();
            let msgs: any[] = [];
            if (data) {
                msgs = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            }
            setCommunityMessages(msgs);
        });

        return () => unsubscribe();
    }, [selectedCommunity?.id, user?.uid]);

    // Listen for community unread counts
    useEffect(() => {
        if (!user) {
            setCommunityUnreadCounts({});
            return;
        }

        const userCommunities = communities.filter(c => c.members && c.members[user.uid]);
        const unsubscribers: (() => void)[] = [];

        userCommunities.forEach(comm => {
            const unreadRef = rtdbRef(rtdb, `community-unread-counts/${comm.id}/${user.uid}`);
            const unsubscribe = onValue(unreadRef, (snapshot) => {
                const count = snapshot.val() || 0;
                setCommunityUnreadCounts(prev => ({ ...prev, [comm.id]: count }));
            });
            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user, communities]);


  const handleAuthError = (error: any) => {
    console.error("Erreur d'authentification:", error.code, error.message);
    let title = "Erreur d'authentification";
    let description = "Une erreur inconnue est survenue. Veuillez réessayer.";

    switch (error.code) {
        case 'auth/invalid-email':
            description = "L'adresse e-mail n'est pas valide.";
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            description = "L'adresse e-mail ou le mot de passe est incorrect.";
            break;
        case 'auth/email-already-in-use':
            description = "Cette adresse e-mail est déjà utilisée par un autre compte.";
            break;
        case 'auth/weak-password':
            description = "Le mot de passe doit contenir au moins 6 caractères.";
            break;
        case 'auth/popup-closed-by-user':
            description = "La fenêtre de connexion a été fermée. Si le problème persiste, assurez-vous que ce domaine est autorisé dans les paramètres d'authentification de votre projet Firebase.";
            break;
        default:
            description = error.message || description;
            break;
    }
    toast({ title, description, variant: 'destructive' });
  };

  const handleEmailSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: "Champs manquants", description: "Veuillez entrer une adresse e-mail et un mot de passe.", variant: "destructive" });
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast({ title: "Mot de passe faible", description: "Minimum 8 caractères, une majuscule et un chiffre.", variant: "destructive" });
      return;
    }
    setIsAuthLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
  
      await setDoc(doc(db, "users", newUser.uid), {
          uid: newUser.uid,
          email: newUser.email,
          displayName: newUser.email?.split('@')[0] || "Anonymous",
          photoURL: newUser.photoURL || null,
          createdAt: serverTimestamp(),
          isVerified: newUser.emailVerified,
          visibility: "public",
        });
      
      toast({ title: 'Compte créé', description: 'Votre compte a été créé avec succès.' });
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsAuthLoading(false);
    }
  };
  
  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
        toast({ title: "Champs manquants", description: "Veuillez entrer une adresse e-mail et un mot de passe.", variant: "destructive" });
        return;
    }
    setIsAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Connexion réussie', description: 'Vous êtes maintenant connecté.' });
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsAuthLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || "Anonymous",
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
          isVerified: user.emailVerified,
          visibility: "public",
        });
      }
      toast({ title: 'Connexion réussie', description: 'Vous êtes maintenant connecté avec Google.' });
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if(user) {
       const userStatusRef = rtdbRef(rtdb, `/status/${user.uid}`);
       await rtdbSet(userStatusRef, { state: 'offline', last_changed: rtdbServerTimestamp() });
    }
    await signOut(auth);
    setSelectedConversation(null);
    setSelectedCommunity(null);
    toast({ title: 'Déconnexion', description: 'Vous avez été déconnecté.' });
  };

  const handleResetAI = () => {
    setUserText('');
    setAnalysisResult(null);
    setAiExplanationAudio(null);
    setUserTextAudio(null);
    setTextSuggestions([]);
    toast({ title: 'Réinitialisé', description: 'Vous pouvez démarrer une nouvelle analyse.' });
  };

  const handleAnalyze = async () => {
    if (!userText.trim()) { return; }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAiExplanationAudio(null);
    setTextSuggestions([]);
    try {
        const result = await analyzeText({ text: userText });
        setAnalysisResult(result);
    } catch (error) {
        console.error("Erreur lors de l'analyse du texte:", error);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleTextToSpeech = async (text: string, type: 'user' | 'ai') => {
    if (!text.trim()) return;
  
    if (type === 'user') {
      setIsGeneratingUserTextAudio(true);
      setUserTextAudio(null);
    } else {
      setIsGeneratingAiAudio(true);
      setAiExplanationAudio(null);
    }
  
    try {
      const result = await textToSpeech({ text });
      if (type === 'user') {
        setUserTextAudio(result.media);
      } else {
        setAiExplanationAudio(result.media);
      }
    } catch (error) {
      console.error("Erreur de synthèse vocale:", error);
      toast({
        title: "Erreur de synthèse vocale",
        description: "Impossible de générer l'audio.",
        variant: "destructive",
      });
    } finally {
      if (type === 'user') {
        setIsGeneratingUserTextAudio(false);
      } else {
        setIsGeneratingAiAudio(false);
      }
    }
  };

  const handleOpenNewMessageModal = async () => {
    if (!user) return;
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "!=", user.uid));
        const querySnapshot = await getDocs(q);
        const allUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsersToMessage(allUsers);
        setShowNewMessageModal(true);
    } catch(error: any) {
        console.error("Impossible de lister les utilisateurs:", error);
    }
  };
  
  const handleStartConversation = async (otherUser: any) => {
    if (!user) return;
  
    const conversationId = getConversationId(user.uid, otherUser.uid);
    const conversationRef = doc(db, "conversations", conversationId);
    
    try {
        const conversationSnap = await getDoc(conversationRef);
        let convoData;
        if (!conversationSnap.exists()) {
            convoData = {
                participantIds: [user.uid, otherUser.uid],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                type: 'direct',
                lastMessage: null,
                unreadCounts: {
                    [user.uid]: 0,
                    [otherUser.uid]: 0,
                },
            };
            await setDoc(conversationRef, convoData);
            setSelectedConversation({ id: conversationId, ...convoData });
        } else {
            convoData = conversationSnap.data();
            setSelectedConversation({ id: conversationId, ...convoData });
        }
        setShowNewMessageModal(false);
        setSearchUserQuery('');
    } catch (error: any) {
        console.error("Erreur au démarrage de la conversation:", error);
        toast({
            title: "Erreur",
            description: "Impossible de démarrer la conversation. " + (error?.message || ''),
            variant: "destructive",
        });
    }
};

const handleDeleteConversation = async (conversationId: string | null) => {
    if (!conversationId) return;

    const conversationRef = doc(db, 'conversations', conversationId);
    
    try {
        const messagesQuery = query(collection(conversationRef, 'messages'));
        const messagesSnapshot = await getDocs(messagesQuery);
        const batch = writeBatch(db);
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        await deleteDoc(conversationRef);

        toast({
            title: "Conversation supprimée",
            description: "La conversation a été supprimée avec succès.",
        });

    } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        toast({
            title: "Erreur de suppression",
            description: "Impossible de supprimer la conversation.",
            variant: "destructive",
        });
    } finally {
        setShowDeleteConfirm(null);
        if (selectedConversation?.id === conversationId) {
            setSelectedConversation(null);
        }
    }
  };


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedConversation?.id) return;

    const conversationRef = doc(db, "conversations", selectedConversation.id);
    const messagesRef = collection(conversationRef, "messages");
    const otherParticipantId = selectedConversation.participantIds.find((id: string) => id !== user.uid);
    
    const batch = writeBatch(db);

    try {
      const messageContent = newMessage;
      setNewMessage('');
      setDirectMessageSuggestions([]);


      const newMessageRef = doc(messagesRef);
      batch.set(newMessageRef, {
          content: messageContent,
          senderId: user.uid,
          timestamp: serverTimestamp(),
          type: 'text',
          readBy: [user.uid]
      });

      batch.update(conversationRef, {
          lastMessage: {
              content: messageContent,
              senderId: user.uid,
              timestamp: serverTimestamp()
          },
          updatedAt: serverTimestamp(),
          [`unreadCounts.${otherParticipantId}`]: increment(1)
      });
      
      await batch.commit();

    } catch(error) {
      console.error("Erreur d'envoi du message:", error);
      toast({
        title: "Erreur d'envoi",
        description: "Votre message n'a pas pu être envoyé.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateDescription = async () => {
    if (!newCommunityName.trim()) {
        toast({ title: 'Nom manquant', description: 'Veuillez d\'abord nommer votre communauté.', variant: 'destructive'});
        return;
    }
    setIsGeneratingDescription(true);
    try {
        const result = await generateCommunityDescription({ prompt: newCommunityName });
        setNewCommunityDescription(result.description);
    } catch (error) {
        console.error('Error generating description:', error);
        toast({ title: 'Erreur', description: 'Impossible de générer la description.', variant: 'destructive'});
    } finally {
        setIsGeneratingDescription(false);
    }
  };
  
  const handleCreateCommunity = async () => {
    if (!user || !newCommunityName.trim() || !newCommunityDescription.trim()) {
        toast({ title: "Champs requis", description: "Le nom et la description sont obligatoires.", variant: "destructive" });
        return;
    }
    setIsCreatingCommunity(true);
    try {
        const newCommunityRef = push(rtdbRef(rtdb, 'communities'));
        await rtdbSet(newCommunityRef, {
            name: newCommunityName,
            description: newCommunityDescription,
            creatorId: user.uid,
            visibility: 'public',
            createdAt: rtdbServerTimestamp(),
            memberCount: 1,
            members: {
                [user.uid]: {
                    joinedAt: rtdbServerTimestamp()
                }
            }
        });
        
        toast({ title: "Communauté créée !", description: "Votre communauté est maintenant en ligne." });
        setShowCreateCommunityModal(false);
        setNewCommunityName('');
        setNewCommunityDescription('');

    } catch (error) {
        console.error("Error creating community in RTDB:", error);
        toast({ title: "Erreur", description: "Impossible de créer la communauté.", variant: "destructive" });
    } finally {
        setIsCreatingCommunity(false);
    }
  };
  
  const handleJoinCommunity = async (communityId: string) => {
    if (!user) {
        toast({ title: "Non authentifié", description: "Vous devez être connecté pour rejoindre une communauté.", variant: "destructive" });
        return;
    }
    const communityRef = rtdbRef(rtdb, `communities/${communityId}`);
    try {
        await runTransaction(communityRef, (currentData) => {
            if (currentData) {
                if (currentData.members && currentData.members[user.uid]) {
                    return; 
                }
                currentData.memberCount = (currentData.memberCount || 0) + 1;
                if (!currentData.members) {
                    currentData.members = {};
                }
                currentData.members[user.uid] = { joinedAt: rtdbServerTimestamp() };
            }
            return currentData;
        });
        toast({ title: "Bienvenue !", description: "Vous avez rejoint la communauté avec succès." });
    } catch (error) {
        console.error("Erreur pour rejoindre la communauté:", error);
        toast({ title: "Erreur", description: "Impossible de rejoindre la communauté pour le moment.", variant: "destructive" });
    }
  };

  const handleLeaveCommunity = async (community: any) => {
    if (!user || !community) return;
    if (user.uid === community.creatorId) {
        toast({ title: "Action non autorisée", description: "Le créateur ne peut pas quitter sa propre communauté.", variant: "destructive"});
        return;
    }

    const communityRef = rtdbRef(rtdb, `communities/${community.id}`);
    try {
        await runTransaction(communityRef, (currentData) => {
            if (currentData) {
                if (currentData.members && currentData.members[user.uid]) {
                    currentData.memberCount = (currentData.memberCount || 1) - 1;
                    currentData.members[user.uid] = null;
                }
            }
            return currentData;
        });
        toast({ title: "Au revoir !", description: `Vous avez quitté la communauté ${community.name}.` });
        setShowLeaveConfirm(null);
    } catch (error) {
        console.error("Erreur pour quitter la communauté:", error);
        toast({ title: "Erreur", description: "Impossible de quitter la communauté pour le moment.", variant: "destructive" });
    }
  };

  const handleSendCommunityMessage = async () => {
      if (!newCommunityMessage.trim() || !user || !selectedCommunity?.id) return;
  
      const messagesRef = rtdbRef(rtdb, `community-messages/${selectedCommunity.id}`);
      const newMessageRef = push(messagesRef);
      
      try {
          const messageContent = newCommunityMessage;
          setNewCommunityMessage('');
          setCommunityMessageSuggestions([]);


          await rtdbSet(newMessageRef, {
              content: messageContent,
              senderId: user.uid,
              senderName: user.displayName || user.email?.split('@')[0] || "Anonymous",
              timestamp: rtdbServerTimestamp(),
          });

          // Increment unread count for other members
          const members = selectedCommunity.members ? Object.keys(selectedCommunity.members) : [];
          members.forEach(memberId => {
              if (memberId !== user.uid) {
                  const unreadRef = rtdbRef(rtdb, `community-unread-counts/${selectedCommunity.id}/${memberId}`);
                  runTransaction(unreadRef, (currentCount) => {
                      return (currentCount || 0) + 1;
                  });
              }
          });

      } catch (error) {
          console.error("Error sending community message:", error);
          toast({
              title: "Erreur d'envoi",
              description: "Votre message n'a pas pu être envoyé.",
              variant: "destructive",
          });
      }
  };

  const handleEnterCommunity = (community: any) => {
      if (!user) return;
      
      const unreadRef = rtdbRef(rtdb, `community-unread-counts/${community.id}/${user.uid}`);
      rtdbSet(unreadRef, 0);

      setSelectedCommunity(community);
  };

  const handleOpenEditCommunityModal = () => {
    if (!selectedCommunity) return;
    setEditingCommunity({
        id: selectedCommunity.id,
        name: selectedCommunity.name,
        description: selectedCommunity.description
    });
    setShowEditCommunityModal(true);
  };
  
  const handleUpdateCommunity = async () => {
    if (!editingCommunity) return;
    setIsUpdatingCommunity(true);
    const communityRef = rtdbRef(rtdb, `communities/${editingCommunity.id}`);
    try {
        await rtdbUpdate(communityRef, {
            name: editingCommunity.name,
            description: editingCommunity.description
        });
        toast({ title: "Communauté mise à jour", description: "Les informations ont été enregistrées." });
        setShowEditCommunityModal(false);
        setEditingCommunity(null);
        // Refresh selected community data
        setSelectedCommunity(prev => ({ ...prev, name: editingCommunity.name, description: editingCommunity.description }));
    } catch (error) {
        console.error("Error updating community:", error);
        toast({ title: "Erreur", description: "Impossible de mettre à jour la communauté.", variant: "destructive" });
    } finally {
        setIsUpdatingCommunity(false);
    }
  };
  
  const handleDeleteCommunity = async () => {
    if (!showDeleteCommunityConfirm) return;
    const communityId = showDeleteCommunityConfirm.id;
    
    try {
        const updates: { [key: string]: null } = {};
        updates[`/communities/${communityId}`] = null;
        updates[`/community-messages/${communityId}`] = null;
        updates[`/community-unread-counts/${communityId}`] = null;

        await rtdbUpdate(rtdbRef(rtdb), updates);
        
        toast({ title: "Communauté supprimée", description: "La communauté et tous ses messages ont été supprimés." });
        setSelectedCommunity(null);
    } catch (error) {
        console.error("Error deleting community:", error);
        toast({ title: "Erreur", description: "Impossible de supprimer la communauté.", variant: "destructive" });
    } finally {
        setShowDeleteCommunityConfirm(null);
    }
  };
  
  const handleThemeChange = (themeName: string) => {
    const theme = THEMES.find(t => t.name === themeName) || THEMES[0];
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--ring', theme.ring);
    localStorage.setItem('app-theme', themeName);
    setCurrentTheme(themeName);
  }

  const handleVisibilityChange = async (checked: boolean) => {
    if (!user) return;
    const newVisibility = checked ? 'public' : 'private';
    setProfileVisibility(checked);
    const userRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userRef, { visibility: newVisibility });
        toast({ title: 'Visibilité mise à jour', description: `Votre profil est maintenant ${newVisibility}.`});
    } catch (error) {
        console.error("Error updating visibility:", error);
        toast({ title: 'Erreur', description: 'Impossible de mettre à jour la visibilité.', variant: 'destructive'});
        setProfileVisibility(!checked); // Revert on error
    }
  }

  const totalUnreadDirectMessages = conversations.reduce((acc, conv) => {
      return acc + (conv.unreadCounts?.[user?.uid || ''] || 0);
  }, 0);

  const totalUnreadCommunityMessages = Object.values(communityUnreadCounts).reduce((acc, count) => {
      return acc + count;
  }, 0);

  // Unlock audio on first user interaction to comply with browser autoplay policies
  useEffect(() => {
    const unlockAudio = () => {
        setIsAudioUnlocked(true);
        // This listener is only needed once
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
    };

    // Attach listeners
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // Cleanup
    return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Sound notification for new messages
  useEffect(() => {
    if (user) {
      // Prevent sound on initial load
      if (isInitialLoad.current) {
        prevTotalUnreadDirectMessages.current = totalUnreadDirectMessages;
        prevTotalUnreadCommunityMessages.current = totalUnreadCommunityMessages;
        isInitialLoad.current = false;
        return;
      }

      const hasNewDirectMessage = totalUnreadDirectMessages > prevTotalUnreadDirectMessages.current;
      const hasNewCommunityMessage = totalUnreadCommunityMessages > prevTotalUnreadCommunityMessages.current;

      if ((hasNewDirectMessage || hasNewCommunityMessage) && isAudioUnlocked) {
        notificationSoundRef.current?.play().catch(e => console.error("Error playing notification sound:", e));
      }

      // Always update the previous counts to prevent a backlog of sounds
      prevTotalUnreadDirectMessages.current = totalUnreadDirectMessages;
      prevTotalUnreadCommunityMessages.current = totalUnreadCommunityMessages;
    }
  }, [totalUnreadDirectMessages, totalUnreadCommunityMessages, user, isAudioUnlocked]);


  const filteredConversations = conversations
    .filter(conv => {
        if (messageFilter === 'unread') {
            return (conv.unreadCounts?.[user?.uid || ''] || 0) > 0;
        }
        return true;
    })
    .filter(conv => {
        if (!conversationSearchQuery.trim()) return true;
        const otherParticipantId = conv.participantIds.find((id: string) => id !== user?.uid);
        const otherUser = otherParticipantId ? usersCache[otherParticipantId] : null;
        return otherUser?.displayName?.toLowerCase().includes(conversationSearchQuery.toLowerCase());
    });
  
  const filteredUsersToMessage = usersToMessage.filter(u =>
    u.displayName?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUserQuery.toLowerCase())
  );
  
  const joinedCommunities = communities.filter(c => user && (c.creatorId === user.uid || (c.members && c.members[user.uid])));
  const discoverCommunities = communities.filter(c => !user || (c.creatorId !== user.uid && (!c.members || !c.members[user.uid])));
  
  const filteredJoinedCommunities = joinedCommunities.filter(c => 
    c.name.toLowerCase().includes(communitySearchQuery.toLowerCase())
  );
  const filteredDiscoverCommunities = discoverCommunities.filter(c => 
    c.name.toLowerCase().includes(communitySearchQuery.toLowerCase())
  );

  const renderCommunityCard = (comm: any) => {
    let status: 'creator' | 'member' | 'joinable' = 'joinable';
    if (user) {
        if (comm.creatorId === user.uid) {
            status = 'creator';
        } else if (comm.members && comm.members[user.uid]) {
            status = 'member';
        }
    }
    return (
      <CommunityCard
        key={comm.id}
        name={comm.name}
        memberCount={comm.memberCount || 0}
        status={status}
        unreadCount={communityUnreadCounts[comm.id] || 0}
        onJoin={() => handleJoinCommunity(comm.id)}
        onLeave={() => setShowLeaveConfirm(comm)}
        onClick={() => handleEnterCommunity(comm)}
      />
    );
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 to-indigo-200/20 blur-3xl"></div>
      <div className="absolute top-10 left-1/4 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-1/4 w-48 h-48 bg-indigo-300/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      {/* Audio Element for Notifications */}
      <audio ref={notificationSoundRef} src="/sons.wav" preload="auto" className="hidden" />

      {/* Header */}
      <header className="relative z-10 backdrop-blur-md bg-white/90 border-b border-blue-200/50 shadow-lg">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                FICHE
              </span>
            </div>

            {/* User Avatar */}
            <div className="flex items-center space-x-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-200/50 transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.displayName || user.email?.split('@')[0]}</span>
                      <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowSettingsModal(true)} className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Paramètres</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Déconnexion</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button 
                  onClick={() => setShowLogin(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Connexion
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-hidden">
        {activeTab === 'editor' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 scroll-hover">
            {/* Hero Card */}
            <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-6 text-center">
              <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-3 py-1 text-blue-700 text-xs font-medium mb-3">
                <Sparkles className="h-3 w-3" />
                <span>Assistant IA</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Transformez vos 
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {' '}idées
                </span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Créez du contenu parfait avec l'aide de notre IA
              </p>
            </div>

            {/* Editor Card */}
            <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 overflow-hidden">
              <div className="p-4 border-b border-blue-200/30 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <FileText className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Vos Pensées</h3>
                </div>
              </div>
              <div className="p-4">
                {(isSuggesting || textSuggestions.length > 0) && (
                    <div className="mb-2 p-2 bg-blue-50/50 rounded-lg border border-blue-200/30">
                        <div className="flex items-center gap-2 flex-wrap min-h-[20px]">
                            {isSuggesting && textSuggestions.length === 0 && (
                                <span className="text-xs text-gray-500 flex items-center gap-1 animate-pulse">
                                    <Bot className="h-3 w-3" />
                                    L'IA suggère...
                                </span>
                            )}
                            {textSuggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => setUserText(prev => `${prev.trim()} ${suggestion}`)}
                                    className="text-xs bg-white text-blue-800 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors border border-blue-200/50"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="relative">
                  <textarea
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder="Écrivez ce que vous voulez communiquer... Ne vous souciez pas de la grammaire - notez simplement vos idées."
                    className="w-full h-32 sm:h-40 p-4 pr-12 border-2 border-blue-200/50 rounded-xl focus:border-blue-500 focus:outline-none resize-none text-gray-700 placeholder-gray-400 bg-blue-50/30 backdrop-blur-sm transition-all duration-300 text-sm"
                  />
                  <button
                    onClick={() => handleTextToSpeech(userText, 'user')}
                    disabled={isGeneratingUserTextAudio || !userText.trim()}
                    className="absolute bottom-3 right-3 p-2 rounded-full bg-white/50 hover:bg-white text-gray-600 disabled:opacity-50"
                    aria-label="Écouter le texte"
                  >
                    {isGeneratingUserTextAudio ? <Bot className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
                {userTextAudio && (
                  <div className="mt-2">
                    <audio controls src={userTextAudio} className="w-full h-8">
                      Votre navigateur ne supporte pas l'élément audio.
                    </audio>
                  </div>
                )}
                <div className="flex justify-between items-center mt-3">
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs transition-all duration-300 ${isAnalyzing ? 'bg-blue-100 text-blue-600' : analysisResult ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Bot className="h-3 w-3" />
                    <span>
                      {isAnalyzing ? 'Analyse en cours...' : analysisResult ? 'Analyse terminée' : 'IA en attente'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleResetAI}
                      disabled={isAnalyzing}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Réinitialiser l'analyse"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !userText.trim()}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                          <>
                              <Bot className="h-3 w-3 animate-spin" />
                              <span>Analyse...</span>
                          </>
                      ) : (
                          <>
                              <Sparkles className="h-3 w-3" />
                              <span>Analyser</span>
                          </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Results or Quick Actions */}
            {analysisResult ? (
              <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4 animate-in slide-in-from-bottom duration-500 space-y-4">
                <div>
                  <div className="flex items-center justify-between space-x-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <h3 className="font-semibold text-gray-900 text-sm">Résultats de l'Analyse IA</h3>
                    </div>
                    <button
                      onClick={() => handleTextToSpeech(analysisResult.explanation, 'ai')}
                      disabled={isGeneratingAiAudio}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                      aria-label="Écouter l'explication"
                    >
                      {isGeneratingAiAudio ? <Bot className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 bg-blue-50/50 p-3 rounded-lg border border-blue-200/50">{analysisResult.explanation}</p>
                  {aiExplanationAudio && (
                    <div className="mt-2">
                      <audio controls src={aiExplanationAudio} className="w-full h-8">
                        Votre navigateur ne supporte pas l'élément audio.
                      </audio>
                    </div>
                  )}
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="suggestions">
                    <AccordionTrigger>Suggestions d'amélioration</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        {analysisResult.suggestions.map((item, index) => <li key={`sugg-${index}`}>{item}</li>)}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="ideas">
                    <AccordionTrigger>Idées créatives</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        {analysisResult.ideas.map((item, index) => <li key={`idea-${index}`}>{item}</li>)}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="actions">
                    <AccordionTrigger>Actions possibles</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        {analysisResult.actions.map((item, index) => <li key={`act-${index}`}>{item}</li>)}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ) : (
                <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Actions Rapides</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={() => setActiveTab('mail')} className="relative flex items-center p-3 sm:p-4 rounded-lg bg-blue-100/50 hover:bg-blue-100 transition-colors">
                      <div className="p-2 bg-blue-200 rounded-lg mr-3 sm:mr-4">
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      </div>
                      <span className="font-semibold text-blue-800 text-sm sm:text-base">E-mail</span>
                      {totalUnreadDirectMessages > 0 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {totalUnreadDirectMessages > 9 ? '9+' : totalUnreadDirectMessages}
                        </div>
                      )}
                    </button>
                    <button className="flex items-center p-3 sm:p-4 rounded-lg bg-green-100/50 hover:bg-green-100 transition-colors">
                      <div className="p-2 bg-green-200 rounded-lg mr-3 sm:mr-4">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      </div>
                      <span className="font-semibold text-green-800 text-sm sm:text-base">Document</span>
                    </button>
                    <button onClick={() => setActiveTab('community')} className="relative flex items-center p-3 sm:p-4 rounded-lg bg-purple-100/50 hover:bg-purple-100 transition-colors">
                      <div className="p-2 bg-purple-200 rounded-lg mr-3 sm:mr-4">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                      </div>
                      <span className="font-semibold text-purple-800 text-sm sm:text-base">Communauté</span>
                       {totalUnreadCommunityMessages > 0 && (
                          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {totalUnreadCommunityMessages > 9 ? '9+' : totalUnreadCommunityMessages}
                          </div>
                      )}
                    </button>
                    <button className="flex items-center p-3 sm:p-4 rounded-lg bg-orange-100/50 hover:bg-orange-100 transition-colors">
                      <div className="p-2 bg-orange-200 rounded-lg mr-3 sm:mr-4">
                        <Send className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      </div>
                      <span className="font-semibold text-orange-800 text-sm sm:text-base">Partager</span>
                    </button>
                  </div>
                </div>
            )}
          </div>
        )}

        {activeTab === 'mail' && (
          <div className="h-full flex flex-col">
            {!user ? (
              <div className="flex flex-col items-center justify-center h-full px-4">
                 <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Messages</h2>
                  <p className="text-sm text-gray-600 mb-6">Envoyez et recevez des messages</p>
                  <button 
                    onClick={() => setShowLogin(true)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium"
                  >
                    Se connecter
                  </button>
                </div>
              </div>
            ) : selectedConversation ? (
                <ChatView
                    user={user}
                    conversation={selectedConversation}
                    usersCache={usersCache}
                    messages={messages}
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    onSendMessage={handleSendMessage}
                    onBack={() => setSelectedConversation(null)}
                    suggestions={directMessageSuggestions}
                    isSuggesting={isSuggestingDirect}
                    onSuggestionClick={(suggestion: string) => setNewMessage(prev => `${prev.trim()} ${suggestion} `)}
                />
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex flex-col shrink-0 px-4 pt-6 space-y-4">
                  <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Rechercher des conversations..."
                      value={conversationSearchQuery}
                      onChange={(e) => setConversationSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                    />
                  </div>
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    <button onClick={() => setMessageFilter('all')} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium ${messageFilter === 'all' ? 'bg-primary text-primary-foreground' : 'backdrop-blur-lg bg-white/90 border border-blue-200/50 text-gray-600'}`}>
                      Tous
                    </button>
                    <button onClick={() => setMessageFilter('unread')} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium ${messageFilter === 'unread' ? 'bg-primary text-primary-foreground' : 'backdrop-blur-lg bg-white/90 border border-blue-200/50 text-gray-600'}`}>
                      Non lus
                    </button>
                    <button disabled className="flex-shrink-0 px-4 py-2 backdrop-blur-lg bg-white/90 border border-blue-200/50 text-gray-600 rounded-full text-xs font-medium disabled:opacity-50">
                      Favoris
                    </button>
                    <button disabled className="flex-shrink-0 px-4 py-2 backdrop-blur-lg bg-white/90 border border-blue-200/50 text-gray-600 rounded-full text-xs font-medium disabled:opacity-50">
                      Groupes
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-28 scroll-hover">
                   {filteredConversations.length > 0 ? (
                      filteredConversations.map(conversation => {
                        if (!user || !usersCache) return null;
      
                        const otherParticipantId = conversation.participantIds.find((id: string) => id !== user.uid);
                        if (!otherParticipantId) return null;
                        
                        const otherUser = usersCache[otherParticipantId];
                        const lastMessage = conversation.lastMessage;
                        const isOnline = presenceCache[otherParticipantId]?.state === 'online';
                        const unreadCount = conversation.unreadCounts?.[user.uid] || 0;
                        
                        if (!otherUser) return null;
                  
                        return (
                          <div key={conversation.id} onClick={() => setSelectedConversation(conversation)} className="group backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-4 active:bg-blue-50 transition-all duration-300 cursor-pointer">
                            <div className="flex items-start space-x-3">
                              <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                                  {otherUser.photoURL ? (
                                    <img src={otherUser.photoURL} alt={otherUser.displayName} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    <span className="text-white font-semibold text-sm">{otherUser.displayName?.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                {isOnline && <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-semibold text-gray-900 text-sm truncate">{otherUser.displayName}</h3>
                                  {lastMessage?.timestamp?.toDate && (
                                     <span className="text-xs text-gray-500">
                                      {formatDistanceToNow(lastMessage.timestamp.toDate(), { addSuffix: true, locale: fr })}
                                     </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-600 line-clamp-1 flex-1 pr-2">
                                    {lastMessage ? (
                                        <>
                                         {lastMessage.senderId === user.uid && <span className="mr-1">Vous:</span>}
                                         {lastMessage.content}
                                        </>
                                    ) : (
                                        "Commencez la conversation !"
                                    )}
                                  </p>
                                  <div className="flex items-center space-x-2">
                                    {lastMessage?.senderId === user.uid && (
                                      <Check className="h-4 w-4 text-orange-500" />
                                    )}
                                    {unreadCount > 0 && (
                                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-medium">{unreadCount}</span>
                                      </div>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteConfirm(conversation.id);
                                      }}
                                      className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      aria-label="Supprimer la conversation"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                   ) : (
                     <div className="text-center text-gray-500 py-10">
                        <p>Aucune conversation pour le moment.</p>
                        <p className="text-sm">Commencez une nouvelle discussion !</p>
                     </div>
                   )}
                </div>

                <div className="fixed bottom-24 right-4 z-10">
                  <button onClick={handleOpenNewMessageModal} className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
                    <Plus className="h-6 w-6 text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'community' && (
           <div className="h-full flex flex-col">
            {!user ? (
               <div className="flex flex-col items-center justify-center h-full px-4">
                 <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-6 text-center">
                   <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                     <Users className="h-8 w-8 text-white" />
                   </div>
                   <h2 className="text-xl font-bold text-gray-900 mb-2">Communautés</h2>
                   <p className="text-sm text-gray-600 mb-6">Connectez-vous pour rejoindre ou créer des communautés.</p>
                   <Button onClick={() => setShowLogin(true)} className="bg-gradient-to-r from-purple-500 to-indigo-600">
                     Se connecter
                   </Button>
                 </div>
               </div>
            ) : selectedCommunity ? (
                <CommunityChatView
                    user={user}
                    community={selectedCommunity}
                    messages={communityMessages}
                    newMessage={newCommunityMessage}
                    setNewMessage={setNewCommunityMessage}
                    onSendMessage={handleSendCommunityMessage}
                    onBack={() => setSelectedCommunity(null)}
                    isCreator={user.uid === selectedCommunity.creatorId}
                    onEdit={handleOpenEditCommunityModal}
                    onDelete={() => setShowDeleteCommunityConfirm(selectedCommunity)}
                    suggestions={communityMessageSuggestions}
                    isSuggesting={isSuggestingCommunity}
                    onSuggestionClick={(suggestion: string) => setNewCommunityMessage(prev => `${prev.trim()} ${suggestion} `)}
                />
            ) : (
              <div className="h-full overflow-y-auto p-4 md:p-6 space-y-8 scroll-hover">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Communautés</h2>
                  <div className="w-full max-w-sm">
                    <Input
                      type="text"
                      placeholder="Rechercher une communauté..."
                      value={communitySearchQuery}
                      onChange={(e) => setCommunitySearchQuery(e.target.value)}
                      className="bg-white/80"
                    />
                  </div>
                </div>

                {isLoadingCommunities ? (
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 justify-center py-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center space-y-3">
                        <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {filteredJoinedCommunities.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Mes Communautés</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {filteredJoinedCommunities.map(renderCommunityCard)}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Découvrir</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            <CreateCommunityCard onClick={() => setShowCreateCommunityModal(true)} />
                            {filteredDiscoverCommunities.map(renderCommunityCard)}
                        </div>
                    </div>
                  </>
                )}
              </div>
            )}
           </div>
        )}

        {activeTab === 'ia' && (
          <div className="h-full overflow-y-auto px-4 py-6 scroll-hover">
            <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-xl border border-blue-200/50 p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Assistant IA</h2>
              <p className="text-sm text-gray-600 mb-6">Cette section est en cours de développement.</p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="backdrop-blur-md bg-white/90 border-t border-blue-200/50 shadow-lg z-20">
        <div className="flex justify-around items-center py-2">
          <button 
            className={`relative flex flex-col items-center p-3 rounded-lg transition-all duration-300 ${activeTab === 'editor' ? 'text-primary bg-primary/10' : 'text-gray-500'}`}
            onClick={() => { setActiveTab('editor'); setSelectedConversation(null); setSelectedCommunity(null); }}
          >
            <Home className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Accueil</span>
          </button>
          <button 
            className={`relative flex flex-col items-center p-3 rounded-lg transition-all duration-300 ${activeTab === 'mail' ? 'text-primary bg-primary/10' : 'text-gray-500'}`}
            onClick={() => { setActiveTab('mail'); setSelectedCommunity(null); }}
          >
            <MessageCircle className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Messages</span>
            {totalUnreadDirectMessages > 0 && (
              <div className="absolute top-1 right-3 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {totalUnreadDirectMessages > 9 ? '9+' : totalUnreadDirectMessages}
              </div>
            )}
          </button>
          <button 
            className={`relative flex flex-col items-center p-3 rounded-lg transition-all duration-300 ${activeTab === 'community' ? 'text-primary bg-primary/10' : 'text-gray-500'}`}
            onClick={() => { setActiveTab('community'); setSelectedConversation(null); }}
          >
            <Users className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Communautés</span>
             {totalUnreadCommunityMessages > 0 && (
                <div className="absolute top-1 right-3 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {totalUnreadCommunityMessages > 9 ? '9+' : totalUnreadCommunityMessages}
                </div>
            )}
          </button>
          <button 
            className={`relative flex flex-col items-center p-3 rounded-lg transition-all duration-300 ${activeTab === 'ia' ? 'text-primary bg-primary/10' : 'text-gray-500'}`}
            onClick={() => { setActiveTab('ia'); setSelectedConversation(null); setSelectedCommunity(null); }}
          >
            <Bot className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">IA</span>
          </button>
        </div>
      </nav>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="backdrop-blur-lg bg-white/95 rounded-t-3xl shadow-2xl border-t border-blue-200/50 w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Accès à votre compte</h2>
              <div className="space-y-4">
                <input 
                  type="email" 
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAuthLoading}
                  className="w-full p-4 border-2 border-blue-200/50 rounded-xl focus:border-primary focus:outline-none bg-blue-50/30 backdrop-blur-sm text-sm"
                />
                <input 
                  type="password" 
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthLoading}
                  className="w-full p-4 border-2 border-blue-200/50 rounded-xl focus:border-primary focus:outline-none bg-blue-50/30 backdrop-blur-sm text-sm"
                />
              </div>
              <div className="space-y-3">
                <button 
                  onClick={handleEmailSignIn}
                  disabled={isAuthLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-medium disabled:opacity-50"
                >
                  {isAuthLoading ? "Connexion..." : "Se connecter"}
                </button>
                <button 
                  onClick={handleEmailSignUp}
                  disabled={isAuthLoading}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-4 rounded-xl font-medium disabled:opacity-50"
                >
                  {isAuthLoading ? "Création..." : "Créer un compte"}
                </button>
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-400 text-xs">OU</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isAuthLoading}
                  className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.021,35.596,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                    <span>{isAuthLoading ? "Connexion..." : "Continuer avec Google"}</span>
                </button>
                <button 
                  onClick={() => setShowLogin(false)}
                  disabled={isAuthLoading}
                  className="w-full border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-medium mt-4 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Message Modal */}
      {showNewMessageModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-bold text-center">Nouveau Message</h2>
                </div>
                <div className="p-4 border-b flex items-center space-x-2">
                    <Search className="h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        className="w-full bg-transparent focus:outline-none text-sm"
                    />
                </div>
                <div className="flex-1 overflow-y-auto scroll-hover">
                    {filteredUsersToMessage.length > 0 ? (
                        filteredUsersToMessage.map(u => (
                            <div key={u.id} onClick={() => handleStartConversation(u)} className="flex items-center p-4 space-x-3 hover:bg-gray-100 cursor-pointer">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold">{u.displayName?.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-800">{u.displayName}</h3>
                                    <p className="text-sm text-gray-500">{u.email}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-4 text-sm">Aucun utilisateur trouvé.</p>
                    )}
                </div>
                 <div className="p-4 border-t">
                    <button onClick={() => setShowNewMessageModal(false)} className="w-full border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-medium">
                        Annuler
                    </button>
                 </div>
            </div>
         </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <AlertDialog open={!!showDeleteConfirm} onOpenChange={(isOpen) => !isOpen && setShowDeleteConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous vraiment sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible. La conversation et tous ses messages seront définitivement supprimés.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowDeleteConfirm(null)}>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteConversation(showDeleteConfirm)}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Leave Community Confirmation Dialog */}
      {showLeaveConfirm && (
        <AlertDialog open={!!showLeaveConfirm} onOpenChange={(isOpen) => !isOpen && setShowLeaveConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Quitter la communauté ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Êtes-vous sûr de vouloir quitter la communauté "{showLeaveConfirm?.name}" ? Vous ne pourrez plus participer aux discussions.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowLeaveConfirm(null)}>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleLeaveCommunity(showLeaveConfirm)}>Quitter</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Paramètres</DialogTitle>
            <DialogDescription>
              Personnalisez votre expérience.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
                <Label>Thème de l'application</Label>
                <div className="flex items-center gap-2">
                    {THEMES.map(theme => (
                        <button key={theme.name} onClick={() => handleThemeChange(theme.name)} className={`w-8 h-8 rounded-full border-2 ${currentTheme === theme.name ? 'border-ring' : 'border-transparent'}`} style={{ backgroundColor: `hsl(${theme.primary})`}}/>
                    ))}
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="visibility-mode" checked={profileVisibility} onCheckedChange={handleVisibilityChange} />
                <Label htmlFor="visibility-mode">Profil public</Label>
            </div>
             <div className="space-y-3">
                <Label>Gestion du compte</Label>
                <Button variant="outline" onClick={() => { handleResetAI(); setShowSettingsModal(false); }}>
                    <Trash2 className="mr-2 h-4 w-4"/>
                    Supprimer l'historique IA
                </Button>
            </div>
          </div>
          <DialogFooter>
             <DialogClose asChild>
                <Button type="button">
                    Fermer
                </Button>
             </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Community Modal */}
      <Dialog open={showCreateCommunityModal} onOpenChange={setShowCreateCommunityModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle communauté</DialogTitle>
            <DialogDescription>
              Donnez vie à votre communauté. Choisissez un nom et laissez l'IA vous aider.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right text-sm font-medium">Nom</label>
              <Input
                id="name"
                value={newCommunityName}
                onChange={(e) => setNewCommunityName(e.target.value)}
                className="col-span-3"
                placeholder="Ex: Passionnés de jardinage"
                disabled={isCreatingCommunity}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="description" className="text-right text-sm font-medium pt-2">Description</label>
              <div className="col-span-3">
                <Textarea
                  id="description"
                  value={newCommunityDescription}
                  onChange={(e) => setNewCommunityDescription(e.target.value)}
                  placeholder="Décrivez le but de votre communauté..."
                  disabled={isCreatingCommunity || isGeneratingDescription}
                  className="min-h-[100px]"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleGenerateDescription}
                  disabled={isCreatingCommunity || isGeneratingDescription}
                >
                   {isGeneratingDescription ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                   )}
                   Générer avec l'IA
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
             <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isCreatingCommunity}>
                    Annuler
                </Button>
             </DialogClose>
            <Button type="submit" onClick={handleCreateCommunity} disabled={isCreatingCommunity}>
              {isCreatingCommunity ? (
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Créer la communauté
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
       
      {/* Edit Community Modal */}
      {showEditCommunityModal && editingCommunity && (
        <Dialog open={showEditCommunityModal} onOpenChange={setShowEditCommunityModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Modifier la communauté</DialogTitle>
              <DialogDescription>
                Mettez à jour les informations de votre communauté.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-name" className="text-right text-sm font-medium">Nom</label>
                <Input
                  id="edit-name"
                  value={editingCommunity.name}
                  onChange={(e) => setEditingCommunity({...editingCommunity, name: e.target.value})}
                  className="col-span-3"
                  disabled={isUpdatingCommunity}
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="edit-description" className="text-right text-sm font-medium pt-2">Description</label>
                <Textarea
                  id="edit-description"
                  value={editingCommunity.description}
                  onChange={(e) => setEditingCommunity({...editingCommunity, description: e.target.value})}
                  className="col-span-3 min-h-[100px]"
                  disabled={isUpdatingCommunity}
                />
              </div>
            </div>
            <DialogFooter>
               <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isUpdatingCommunity}>
                      Annuler
                  </Button>
               </DialogClose>
              <Button type="submit" onClick={handleUpdateCommunity} disabled={isUpdatingCommunity}>
                {isUpdatingCommunity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Community Confirmation Dialog */}
      {showDeleteCommunityConfirm && (
        <AlertDialog open={!!showDeleteCommunityConfirm} onOpenChange={(isOpen) => !isOpen && setShowDeleteCommunityConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer la communauté ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible. La communauté "{showDeleteCommunityConfirm?.name}", ses messages et ses membres seront définitivement supprimés.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowDeleteCommunityConfirm(null)}>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCommunity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
};

export default FicheApp;
    
    
