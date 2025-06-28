
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Users, 
  Mail, 
  FileText, 
  Settings, 
  Send, 
  Plus, 
  Search,
  User,
  LogOut,
  Sparkles,
  Brain,
  Upload,
  Download,
  Eye,
  Heart,
  Share2,
  Filter,
  Volume2,
  Pause,
  Copy,
  ThumbsUp
} from 'lucide-react';
import { analyzeText } from '@/ai/flows/analyze-text';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { auth, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type ChatMessage = {
  type: 'user' | 'ai';
  content: string;
  suggestions?: string[];
  ideas?: string[];
  actions?: string[];
  timestamp: Date;
  audioDataUri?: string;
  liked?: boolean;
};

type Community = {
  id: number;
  name: string;
  members: number;
  description: string;
};

type FileInfo = {
  id: number;
  name: string;
  size: string;
  date: string;
  author: string;
};

type ActiveTab = 'chat' | 'communities' | 'files' | 'messages' | 'settings';

const AuthForm = () => {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le nom est requis.' });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: name,
        email: email,
        createdAt: new Date(),
      });

      toast({ title: 'Compte créé', description: 'Vous êtes maintenant connecté.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erreur d'inscription", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Connexion réussie', description: 'Bienvenue !' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur de connexion', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-gray-50 dark:from-blue-900/10 dark:to-gray-900/10 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-gray-800 dark:text-gray-200 mb-2">FICHE</h1>
          <p className="text-gray-600 dark:text-gray-400">Votre assistant IA intelligent</p>
        </div>
        
        <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              authMode === 'login' 
                ? 'bg-white dark:bg-gray-700 text-primary dark:text-gray-100 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              authMode === 'register' 
                ? 'bg-white dark:bg-gray-700 text-primary dark:text-gray-100 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
           {authMode === 'register' && (
            <div>
              <input
                type="text"
                placeholder="Nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-transparent rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
              />
            </div>
          )}
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-transparent rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-transparent rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'Chargement...' : (authMode === 'login' ? 'Se connecter' : 'Créer un compte')}
          </button>
        </form>
      </div>
    </div>
  );
};


const FicheApp = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [userText, setUserText] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([
    { id: 1, name: 'Développeurs', members: 234, description: 'Communauté de développeurs passionnés' },
    { id: 2, name: 'Designers', members: 156, description: 'Partage de créations et conseils design' },
    { id: 3, name: 'Étudiants', members: 89, description: 'Entraide et ressources académiques' }
  ]);
  const [files, setFiles] = useState<FileInfo[]>([
    { id: 1, name: 'Guide React.pdf', size: '2.4 MB', date: '2025-06-25', author: 'Marie Dubois' },
    { id: 2, name: 'Présentation IA.pptx', size: '5.1 MB', date: '2025-06-24', author: 'Jean Martin' }
  ]);
  const [activeAudioIndex, setActiveAudioIndex] = useState<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<Map<number, HTMLAudioElement | null>>(new Map());
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthenticating(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Déconnexion', description: 'Vous avez été déconnecté.' });
    } catch (error: any) {
      toast({ variant: "destructive", title: 'Erreur', description: error.message });
    }
  };

  const handleTextSubmit = async () => {
    if (!userText.trim()) return;
    
    setIsLoading(true);
    const currentText = userText;
    const userMessage: ChatMessage = { type: 'user', content: currentText, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    setUserText('');

    try {
      const aiData = await analyzeText({ text: currentText });
      const audioResult = await textToSpeech({ text: aiData.explanation });
      
      const aiMessage: ChatMessage = {
        type: 'ai',
        content: aiData.explanation,
        suggestions: aiData.suggestions,
        ideas: aiData.ideas,
        actions: aiData.actions,
        timestamp: new Date(),
        audioDataUri: audioResult.media,
        liked: false,
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Erreur IA:', error);
      const errorMessage: ChatMessage = {
        type: 'ai',
        content: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    }
    
    setIsLoading(false);
  };

  const handlePlayAudio = (index: number) => {
    if (activeAudioIndex === index) {
      const audio = audioRefs.current.get(index);
      if (audio) {
        audio.pause();
      }
      setActiveAudioIndex(null);
      return;
    }

    if (activeAudioIndex !== null) {
      const currentAudio = audioRefs.current.get(activeAudioIndex);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    const newAudio = audioRefs.current.get(index);
    if (newAudio) {
       newAudio.play().catch(error => {
          if (error.name !== 'AbortError') {
             console.error("Error playing audio:", error);
             setActiveAudioIndex(null);
          }
       });
       setActiveAudioIndex(index);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copié',
        description: 'Le texte a été copié dans le presse-papiers.',
      });
    });
  };

  const handleLike = (index: number) => {
    setChatHistory(prev => {
      const newHistory = [...prev];
      const message = newHistory[index];
      if (message.type === 'ai') {
        message.liked = !message.liked;
      }
      return newHistory;
    });
  };

  const ChatInterface = () => (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {chatHistory.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center h-full">
            <Brain className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-headline font-semibold text-gray-800 dark:text-gray-200 mb-2">Commencez une conversation</h3>
            <p className="text-gray-600 dark:text-gray-400">Tapez votre texte et recevez des suggestions intelligentes.</p>
          </div>
        ) : (
          chatHistory.map((message, index) => (
            <div key={`${message.timestamp.toISOString()}-${index}`} className={`flex items-end gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
               {message.type === 'ai' && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Brain className="w-5 h-5 text-primary"/></div>}
              <div className={`max-w-2xl rounded-2xl shadow-sm ${
                message.type === 'user' 
                  ? 'bg-gradient-to-r from-primary to-accent text-white rounded-br-none' 
                  : 'bg-white dark:bg-card border border-gray-200 dark:border-gray-700 text-foreground rounded-bl-none'
              }`}>
                {message.type === 'user' ? (
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="user-message" className="border-b-0">
                            <AccordionTrigger className="p-4 font-semibold text-white hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span>Votre texte soumis</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-0">
                                <p className="whitespace-pre-wrap font-normal">{message.content}</p>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                ) : (
                  <div className="p-4">
                    <p className="mb-2 whitespace-pre-wrap">{message.content}</p>
                     <Accordion type="multiple" className="w-full mt-2 -mb-2">
                        {message.suggestions && message.suggestions.length > 0 && (
                          <AccordionItem value="suggestions" className="border-b-0">
                            <AccordionTrigger className="py-2 font-semibold text-primary hover:no-underline">
                              <div className="flex items-center">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Suggestions
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-1 pb-2">
                                {message.suggestions.map((suggestion, i) => (
                                  <div key={i} className="bg-primary/10 p-3 rounded-lg text-sm text-foreground">
                                    {suggestion}
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {message.ideas && message.ideas.length > 0 && (
                          <AccordionItem value="ideas" className="border-b-0">
                            <AccordionTrigger className="py-2 font-semibold text-accent dark:text-yellow-400 hover:no-underline">
                              <div className="flex items-center">💡 Idées créatives</div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-1 pb-2">
                                {message.ideas.map((idea, i) => (
                                  <div key={i} className="bg-accent/10 p-3 rounded-lg text-sm text-foreground">
                                    {idea}
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {message.actions && message.actions.length > 0 && (
                          <AccordionItem value="actions" className="border-b-0">
                            <AccordionTrigger className="py-2 font-semibold text-foreground hover:no-underline">
                              <div className="flex items-center">🎯 Actions possibles</div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-1 pb-2">
                                {message.actions.map((action, i) => (
                                  <div key={i} className="bg-secondary p-3 rounded-lg text-sm text-foreground">
                                    {action}
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
                    <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center space-x-1">
                      {message.audioDataUri && (
                        <>
                           <audio
                            ref={(el) => {
                                if (el) {
                                    audioRefs.current.set(index, el);
                                    el.onended = () => {
                                        if (activeAudioIndex === index) setActiveAudioIndex(null);
                                    };
                                    el.onpause = () => {
                                        if (el.seeking) return;
                                        if (activeAudioIndex === index) setActiveAudioIndex(null);
                                    };
                                }
                            }}
                            src={message.audioDataUri}
                            preload="none"
                          />
                          <button
                            onClick={() => handlePlayAudio(index)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            aria-label={activeAudioIndex === index ? "Mettre en pause" : "Lire l'audio"}
                          >
                            {activeAudioIndex === index ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleCopy(message.content)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        aria-label="Copier le texte"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleLike(index)}
                        className={`p-2 rounded-full transition-colors ${
                          message.liked
                            ? 'text-primary hover:bg-primary/10'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        aria-label="Aimer"
                      >
                        <ThumbsUp className={`w-5 h-5 ${message.liked ? 'fill-primary' : ''}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
                {message.type === 'user' && <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-white"/></div>}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Brain className="w-5 h-5 text-primary"/></div>
            <div className="bg-white dark:bg-card border border-gray-200 dark:border-gray-700 p-4 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                <span className="text-gray-600 dark:text-gray-400">L'IA réfléchit...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-card">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Tapez votre texte ici pour recevoir des suggestions..."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none bg-gray-50 dark:bg-gray-800 text-foreground"
              rows={2}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
            />
          </div>
          <button
            onClick={handleTextSubmit}
            disabled={!userText.trim() || isLoading}
            className="bg-gradient-to-r from-primary to-accent text-white p-3 rounded-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const CommunitiesTab = () => (
    <div className="p-6 overflow-y-auto h-full bg-gray-50/50 dark:bg-gray-900/50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-headline font-bold text-gray-800 dark:text-gray-200">Communautés</h2>
        <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Créer</span>
        </button>
      </div>
      
      <div className="grid gap-4">
        {communities.map(community => (
          <div key={community.id} className="bg-white dark:bg-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-headline font-semibold text-gray-800 dark:text-gray-200">{community.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>{community.members} membres</span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{community.description}</p>
            <div className="flex space-x-3">
              <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-80 transition-colors">
                Rejoindre
              </button>
              <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Voir plus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const FilesTab = () => (
    <div className="p-6 overflow-y-auto h-full bg-gray-50/50 dark:bg-gray-900/50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-headline font-bold text-gray-800 dark:text-gray-200">Fichiers</h2>
        <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 flex items-center space-x-2">
          <Upload className="w-4 h-4" />
          <span>Importer</span>
        </button>
      </div>
      
      <div className="grid gap-4">
        {files.map(file => (
          <div key={file.id} className="bg-white dark:bg-card rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold font-headline text-gray-800 dark:text-gray-200">{file.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{file.size} • {file.date} • {file.author}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Download className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const MessagesTab = () => (
    <div className="p-6 overflow-y-auto h-full bg-gray-50/50 dark:bg-gray-900/50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-headline font-bold text-gray-800 dark:text-gray-200">Messages</h2>
        <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Nouveau</span>
        </button>
      </div>
      
      <div className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">Aucun message</h3>
          <p className="text-gray-500 dark:text-gray-400">Commencez une conversation avec un membre de la communauté</p>
        </div>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="p-6 overflow-y-auto h-full bg-gray-50/50 dark:bg-gray-900/50">
        <h2 className="text-2xl font-headline font-bold text-gray-800 dark:text-gray-200 mb-6">Paramètres</h2>

        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Profile Section */}
            <div className="bg-white dark:bg-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-headline font-semibold text-gray-800 dark:text-gray-200 mb-4">Profil</h3>
                <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                         <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                        </div>
                        <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                            Changer la photo
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Nom complet</label>
                            <input type="text" defaultValue={currentUser?.displayName || ''} className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 bg-transparent text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Adresse e-mail</label>
                            <input type="email" defaultValue={currentUser?.email || ''} className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 bg-transparent text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200">
                            Mettre à jour le profil
                        </button>
                    </div>
                </div>
            </div>

            {/* Appearance Section */}
            <div className="bg-white dark:bg-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-headline font-semibold text-gray-800 dark:text-gray-200 mb-4">Apparence</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-800 dark:text-gray-200 font-medium">Thème sombre</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Activez le mode sombre pour une expérience visuelle différente.</p>
                    </div>
                    <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                        aria-label="Activer le thème sombre"
                    />
                </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-white dark:bg-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-headline font-semibold text-gray-800 dark:text-gray-200 mb-4">Notifications</h3>
                <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="text-gray-800 dark:text-gray-200 font-medium">Notifications par e-mail</p>
                           <p className="text-gray-600 dark:text-gray-400 text-sm">Recevoir des notifications importantes par e-mail.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-800 dark:text-gray-200 font-medium">Notifications push</p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Recevoir des notifications push sur vos appareils.</p>
                        </div>
                        <Switch />
                    </div>
                </div>
            </div>

            {/* Account Section */}
            <div className="bg-white dark:bg-card rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-headline font-semibold text-gray-800 dark:text-gray-200 mb-4">Compte</h3>
                 <div className="space-y-4">
                    <div>
                        <button className="w-full text-left border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Changer le mot de passe
                        </button>
                    </div>
                     <div>
                        <button className="w-full text-left border border-destructive/50 text-destructive px-4 py-2 rounded-lg hover:bg-destructive/10 transition-colors">
                            Supprimer le compte
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  if (isAuthenticating) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthForm />;
  }

  return (
    <div className="h-screen bg-background flex">
      <div className="w-64 bg-white dark:bg-card border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-headline text-gray-800 dark:text-gray-200">FICHE</h1>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {[
              { id: 'chat', label: 'Chat IA', icon: MessageCircle },
              { id: 'communities', label: 'Communautés', icon: Users },
              { id: 'files', label: 'Fichiers', icon: FileText },
              { id: 'messages', label: 'Messages', icon: Mail },
              { id: 'settings', label: 'Paramètres', icon: Settings },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">{currentUser?.displayName || 'Utilisateur'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'communities' && <CommunitiesTab />}
        {activeTab === 'files' && <FilesTab />}
        {activeTab === 'messages' && <MessagesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};

export default FicheApp;

    
