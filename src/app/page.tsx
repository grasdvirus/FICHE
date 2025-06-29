
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
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
  Download,
  Share2,
  Volume2,
  Pause,
  Copy,
  ThumbsUp,
  RotateCw,
  Check,
  Edit,
  Info,
  ArrowLeft,
  Paperclip
} from 'lucide-react';
import { analyzeText } from '@/ai/flows/analyze-text';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { generateCommunityDescription } from '@/ai/flows/generate-community-description';
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { auth, db, rtdb } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, where, getDocs, Timestamp } from "firebase/firestore";
import { ref as rtdbRef, onValue, push, serverTimestamp as rtdbServerTimestamp, off } from "firebase/database";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: Timestamp;
};

type PrivateMessage = {
  id: string;
  type: 'text' | 'file';
  from: string;
  to: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  timestamp: Timestamp;
};

type CommunityMessage = {
  id: string;
  from: string;
  fromName: string;
  content: string;
  timestamp: number;
};

type AppUser = {
  uid: string;
  name: string;
  email: string;
};

type ActiveTab = 'chat' | 'communities' | 'messages' | 'settings';

function isValidFileUrl(url: string) {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === "https:" && (
      newUrl.pathname.endsWith(".pdf") || 
      newUrl.pathname.endsWith(".docx") || 
      newUrl.pathname.endsWith(".xlsx") ||
      newUrl.pathname.endsWith(".doc") ||
      newUrl.pathname.endsWith(".xls") ||
      newUrl.pathname.endsWith(".ppt") ||
      newUrl.pathname.endsWith(".pptx")
    );
  } catch (e) {
    return false;
  }
}

const AuthForm = () => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
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
        uid: userCredential.user.uid,
        name: name,
        email: email,
        createdAt: serverTimestamp(),
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold font-headline text-primary">FICHE</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">Votre assistant IA intelligent</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg bg-gray-200 dark:bg-gray-700 p-1">
              <button
                onClick={() => setAuthMode('login')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${authMode === 'login' ? 'bg-white dark:bg-gray-900 text-primary shadow' : 'text-gray-600 dark:text-gray-300'}`}
              >
                Connexion
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${authMode === 'register' ? 'bg-white dark:bg-gray-900 text-primary shadow' : 'text-gray-600 dark:text-gray-300'}`}
              >
                Inscription
              </button>
            </div>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-6">
            {authMode === 'register' && (
              <div>
                <Input
                  type="text"
                  placeholder="Nom complet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700"
                  required
                />
              </div>
            )}
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Chargement...' : (authMode === 'login' ? 'Se connecter' : 'Créer un compte')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ChatMessageDisplay = React.memo(
  ({
    message,
    isPlaying,
    onPlayAudio,
    onCopy,
    onLike,
  }: {
    message: ChatMessage;
    isPlaying: boolean;
    onPlayAudio: () => void;
    onCopy: (text: string) => void;
    onLike: () => void;
  }) => {
    return (
      <div className={`flex items-start gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
         {message.type === 'ai' && <Avatar className="w-8 h-8"><AvatarFallback><Brain size={18}/></AvatarFallback></Avatar> }
        <div className={`w-full max-w-2xl rounded-xl p-4 ${message.type === 'user' ? 'bg-primary/10' : 'bg-background dark:bg-gray-800'}`}>
          {message.type === 'user' ? (
              <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-none">
                      <AccordionTrigger className="font-semibold text-primary p-0 hover:no-underline">
                          Votre texte soumis
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                          <p className="text-foreground/90">{message.content}</p>
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
          ) : (
            <div className="space-y-4">
                <p className="text-foreground/90">{message.content}</p>
                <Accordion type="single" collapsible className="w-full">
                  {message.suggestions && message.suggestions.length > 0 && (
                    <AccordionItem value="suggestions">
                      <AccordionTrigger className="text-sm font-semibold">
                        <Sparkles className="w-4 h-4 mr-2"/>
                        Suggestions
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-1">
                          {message.suggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {message.ideas && message.ideas.length > 0 && (
                    <AccordionItem value="ideas">
                      <AccordionTrigger className="text-sm font-semibold">
                          💡 Idées créatives
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-1">
                          {message.ideas.map((idea, i) => (
                            <li key={i}>{idea}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {message.actions && message.actions.length > 0 && (
                    <AccordionItem value="actions">
                      <AccordionTrigger className="text-sm font-semibold">
                          🎯 Actions possibles
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-1">
                          {message.actions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              <div className="flex items-center gap-2 mt-2">
                {message.audioDataUri && (
                  <Button variant="ghost" size="icon" onClick={onPlayAudio} className="h-8 w-8">
                      {isPlaying ? <Pause size={16}/> : <Volume2 size={16}/>}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => onCopy(message.content)} className="h-8 w-8"> <Copy size={16}/> </Button>
                <Button variant="ghost" size="icon" onClick={onLike} className={`h-8 w-8 ${message.liked ? 'text-red-500' : ''}`}>
                   <ThumbsUp size={16}/>
                </Button>
              </div>
            </div>
          )}
        </div>
           {message.type === 'user' && <Avatar className="w-8 h-8"><AvatarFallback><User size={18}/></AvatarFallback></Avatar> }
      </div>
    );
  }
);
ChatMessageDisplay.displayName = 'ChatMessageDisplay';


const FicheApp = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [userText, setUserText] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [activeCommunityChat, setActiveCommunityChat] = useState<Community | null>(null);
  const [activePrivateChat, setActivePrivateChat] = useState<AppUser | null>(null);

  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const [audioStatus, setAudioStatus] = useState<{ playingIndex: number }>({ playingIndex: -1 });

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "communities"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const communitiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Community[];
      setCommunities(communitiesData);
    }, (error) => {
      console.error("Erreur de lecture des communautés:", error);
      toast({
        variant: "destructive",
        title: "Erreur de base de données",
        description: "Impossible de charger les communautés. Vérifiez les permissions.",
      });
    });

    return () => unsubscribe();
  }, [currentUser, toast]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        audioPlayer.current = new Audio();
        const player = audioPlayer.current;
        const onEnded = () => setAudioStatus({ playingIndex: -1 });
        player.addEventListener('ended', onEnded);
        player.addEventListener('pause', onEnded);
        return () => {
            player.removeEventListener('ended', onEnded);
            player.removeEventListener('pause', onEnded);
            player.pause();
        };
    }
  }, []);

  const handlePlayAudio = useCallback((index: number, audioDataUri: string) => {
      const player = audioPlayer.current;
      if (!player) return;

      if (audioStatus.playingIndex === index) {
          player.pause();
          setAudioStatus({ playingIndex: -1 });
      } else {
          player.src = audioDataUri;
          player.play().catch(e => {
            if (e.name !== 'AbortError') {
              console.error("Error playing audio:", e)
              toast({ variant: 'destructive', title: "Erreur audio", description: "Impossible de lire le fichier audio."})
            }
          });
          setAudioStatus({ playingIndex: index });
      }
  }, [audioStatus.playingIndex, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user as FirebaseUser | null);
      if (!user) {
        setActiveCommunityChat(null);
        setActivePrivateChat(null);
      }
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
  
  const handleNewChat = () => {
    setChatHistory([]);
    toast({ title: 'Nouvelle discussion', description: 'La conversation a été réinitialisée.' });
  };

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copié',
        description: 'Le texte a été copié dans le presse-papiers.',
      });
    });
  }, [toast]);

  const handleLike = useCallback((index: number) => {
    setChatHistory(prev =>
      prev.map((message, i) => {
        if (i === index && message.type === 'ai') {
          return { ...message, liked: !message.liked };
        }
        return message;
      })
    );
  }, []);

  const ChatInterface = () => (
    <div className="flex flex-col h-full bg-muted/40 dark:bg-gray-800/20">
      <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
        {chatHistory.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <div className="p-5 bg-background dark:bg-gray-800 rounded-full mb-4">
                <Brain size={40} className="text-primary"/>
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Commencez une conversation</h2>
              <p>Tapez votre texte et recevez des suggestions intelligentes.</p>
          </div>
        ) : (
          chatHistory.map((message, index) => (
            <div key={index}>
              <ChatMessageDisplay
                message={message}
                isPlaying={audioStatus.playingIndex === index}
                onPlayAudio={() => {
                  if (message.audioDataUri) {
                      handlePlayAudio(index, message.audioDataUri);
                  }
                }}
                onCopy={() => handleCopy(message.content)}
                onLike={() => handleLike(index)}
              />
            </div>
          ))
        )}
        {isLoading && (
           <div className="flex items-center gap-4 justify-start">
              <Avatar className="w-8 h-8"><AvatarFallback><Brain size={18}/></AvatarFallback></Avatar>
                <div className="bg-background dark:bg-gray-800 p-4 rounded-xl">
                 L'IA réfléchit...
              </div>
            </div>
          
        )}
      </div>
      <div className="p-4 bg-background dark:bg-gray-900/50 border-t border-border">
        <div className="relative flex items-center gap-2">
          <div className="flex-1">
            <Textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Tapez votre texte ici pour recevoir des suggestions..."
              className="pr-12 bg-muted dark:bg-gray-800"
              rows={2}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={handleNewChat} className="h-10 w-10">
            <RotateCw size={18} />
          </Button>
          <Button onClick={handleTextSubmit} disabled={isLoading || !userText.trim()} className="h-10 w-10" size="icon">
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );

  const CommunitiesTab = () => {
    const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
  
    const filteredCommunities = communities.filter(community =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    return (
      <div className="h-full flex flex-col p-6 bg-muted/40 dark:bg-gray-800/20 overflow-y-auto">
        <header className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Communautés</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-64 bg-background"
              />
            </div>
            <Button onClick={() => setIsCreateCommunityOpen(true)}>
              <Plus size={16} className="mr-2" />
              Créer
            </Button>
          </div>
        </header>
  
        {filteredCommunities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCommunities.map(community => (
              <div key={community.id} className="bg-background dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveCommunityChat(community)}>
                <Avatar className="w-20 h-20 mb-4">
                  <AvatarImage src={`https://placehold.co/150x150.png?text=${community.name.charAt(0)}`} data-ai-hint={community.name} />
                  <AvatarFallback>{community.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="font-semibold">{community.name}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{community.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <div className="inline-block p-4 bg-background rounded-full">
              <Users size={32} />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Aucune communauté à découvrir</h3>
            <p className="text-sm">Revenez plus tard ou créez la vôtre !</p>
          </div>
        )}
        <CreateCommunityDialog isOpen={isCreateCommunityOpen} onOpenChange={setIsCreateCommunityOpen} currentUser={currentUser} />
      </div>
    );
  };
  
  const CreateCommunityDialog = ({ isOpen, onOpenChange, currentUser }: { isOpen: boolean, onOpenChange: (open: boolean) => void, currentUser: FirebaseUser | null }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    const handleGenerateDescription = async () => {
      if (!name.trim()) {
        toast({ variant: "destructive", title: "Erreur", description: "Veuillez d'abord donner un nom à votre communauté." });
        return;
      }
      setIsGenerating(true);
      try {
        const result = await generateCommunityDescription({ prompt: name });
        setDescription(result.description);
      } catch (error) {
        console.error("Error generating description:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer la description." });
      } finally {
        setIsGenerating(false);
      }
    };
    
    const handleCreate = async () => {
        if (!name.trim() || !description.trim() || !currentUser) {
            toast({ variant: "destructive", title: "Erreur", description: "Le nom et la description sont requis." });
            return;
        }

        setIsCreating(true);
        try {
            await addDoc(collection(db, 'communities'), {
                name,
                description,
                ownerId: currentUser.uid,
                createdAt: serverTimestamp(),
            });
            
            toast({ title: "Communauté créée", description: `La communauté "${name}" a été créée avec succès.` });
            onOpenChange(false);
            setName('');
            setDescription('');

        } catch (error) {
            console.error("Error creating community:", error);
            toast({ variant: "destructive", title: "Erreur", description: "La création de la communauté a échoué." });
        } finally {
            setIsCreating(false);
        }
    };

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une nouvelle communauté</DialogTitle>
            <DialogDescription>
                Donnez un nom à votre communauté et décrivez-la pour attirer des membres.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                  <label htmlFor="name">Nom</label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                  <label htmlFor="description">Description</label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                  <div className="flex justify-end">
                      <Button onClick={handleGenerateDescription} variant="ghost" size="sm" disabled={isGenerating}>
                          <Sparkles className="w-4 h-4 mr-2"/>
                          {isGenerating ? 'Génération...' : 'Générer avec l\'IA'}
                      </Button>
                  </div>
              </div>
          </div>
          <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating || !name.trim() || !description.trim()}>
                  {isCreating ? 'Création en cours...' : 'Créer la communauté'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const CommunityChatRoom = ({ community, onBack }: { community: Community, onBack: () => void }) => {
    const [messages, setMessages] = useState<CommunityMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      const messagesRef = rtdbRef(rtdb, `communities/${community.id}/messages`);
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        const loadedMessages: CommunityMessage[] = [];
        if (data) {
          for (const key in data) {
            loadedMessages.push({ id: key, ...data[key] });
          }
          loadedMessages.sort((a, b) => a.timestamp - b.timestamp);
        }
        setMessages(loadedMessages);
        setIsLoading(false);
      }, (error) => {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les messages du salon.' });
        setIsLoading(false);
      });
  
      return () => off(messagesRef);
    }, [community.id]);
  
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
  
    const handleSendMessage = async () => {
      if (!newMessage.trim() || !currentUser) return;
  
      const messageData = {
        from: currentUser.uid,
        fromName: currentUser.displayName || 'Anonyme',
        content: newMessage,
        timestamp: rtdbServerTimestamp(),
      };
  
      try {
        const messagesRef = rtdbRef(rtdb, `communities/${community.id}/messages`);
        await push(messagesRef, messageData);
        setNewMessage('');
      } catch (error) {
        console.error("Error sending message:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: "L'envoi du message a échoué." });
      }
    };
  
    return (
      <div className="h-full flex flex-col bg-muted/40 dark:bg-gray-800/20">
        <header className="flex items-center gap-4 p-4 border-b bg-background dark:bg-gray-900/50">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft size={18} /></Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={`https://placehold.co/150x150.png?text=${community.name.charAt(0)}`} data-ai-hint={community.name} />
            <AvatarFallback>{community.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{community.name}</h2>
        </header>
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Chargement des messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground">Aucun message. Soyez le premier !</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.from === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                {msg.from !== currentUser?.uid && <Avatar className="w-8 h-8 self-start"><AvatarFallback>{msg.fromName.charAt(0)}</AvatarFallback></Avatar>}
                <div className={`max-w-md rounded-xl px-4 py-2 ${msg.from === currentUser?.uid ? 'bg-primary text-primary-foreground' : 'bg-background dark:bg-gray-800'}`}>
                  {msg.from !== currentUser?.uid && <div className="text-xs font-bold text-primary mb-1">{msg.fromName}</div>}
                  <p>{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-background dark:bg-gray-900/50 border-t">
          <div className="relative flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="bg-muted dark:bg-gray-800"
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()} size="icon">
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  const PrivateChatRoom = ({ recipient, onBack, currentUser }: { recipient: AppUser, onBack: () => void, currentUser: FirebaseUser }) => {
    const [messages, setMessages] = useState<PrivateMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
        const q = query(
            collection(db, 'messages'),
            where('from', 'in', [currentUser.uid, recipient.uid]),
            where('to', 'in', [currentUser.uid, recipient.uid]),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs: PrivateMessage[] = [];
            querySnapshot.forEach((doc) => {
                // This client-side filter is necessary because Firestore can't do OR queries on different fields.
                if ((doc.data().from === currentUser.uid && doc.data().to === recipient.uid) ||
                    (doc.data().from === recipient.uid && doc.data().to === currentUser.uid)) {
                    msgs.push({ id: doc.id, ...doc.data() } as PrivateMessage);
                }
            });
            setMessages(msgs);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching private messages: ", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les messages.'});
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser.uid, recipient.uid]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        const isFile = isValidFileUrl(newMessage);
        const messageData = {
            from: currentUser.uid,
            to: recipient.uid,
            timestamp: serverTimestamp(),
            type: isFile ? 'file' : 'text',
            ...(isFile ? { fileUrl: newMessage, fileName: new URL(newMessage).pathname.split('/').pop() } : { content: newMessage })
        };
        
        try {
            await addDoc(collection(db, 'messages'), messageData);
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message: ", error);
            toast({ variant: 'destructive', title: 'Erreur', description: "L'envoi du message a échoué."});
        }
    };
    
    return (
        <div className="h-full flex flex-col bg-muted/40 dark:bg-gray-800/20">
            <header className="flex items-center gap-4 p-4 border-b bg-background dark:bg-gray-900/50">
                <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft size={18} /></Button>
                <Avatar><AvatarFallback>{recipient.name.charAt(0)}</AvatarFallback></Avatar>
                <h2 className="text-xl font-bold">{recipient.name}</h2>
            </header>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {isLoading ? (
                    <div className="text-center">Chargement...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground">Commencez la conversation !</div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.from === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md rounded-xl px-4 py-2 ${msg.from === currentUser.uid ? 'bg-primary text-primary-foreground' : 'bg-background dark:bg-gray-800'}`}>
                                {msg.type === 'file' ? (
                                    <a
                                        href={msg.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 hover:underline"
                                    >
                                        <Paperclip size={16} />
                                        <span>{msg.fileName}</span>
                                    </a>
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                                <p className="text-xs opacity-70 mt-1 text-right">{msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-background dark:bg-gray-900/50 border-t">
                <div className="relative flex items-center gap-2">
                    <Input 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Envoyer un message ou un lien..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()} size="icon">
                        <Send size={18} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
  
  const MessagesTab = ({ currentUser }: { currentUser: FirebaseUser }) => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const usersCollection = collection(db, 'users');
          const usersSnapshot = await getDocs(usersCollection);
          const usersList = usersSnapshot.docs
            .map(doc => doc.data() as AppUser)
            .filter(user => user.uid !== currentUser.uid);
          setUsers(usersList);
        } catch (error) {
          console.error("Error fetching users: ", error);
          toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les utilisateurs." });
        } finally {
          setIsLoading(false);
        }
      };
      fetchUsers();
    }, [currentUser.uid]);
  
    return (
      <div className="h-full flex flex-col p-6 bg-muted/40 dark:bg-gray-800/20">
        <header className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Messages</h2>
          {/* Future button for new group chat? */}
        </header>
        {isLoading ? (
          <div className="text-center text-muted-foreground">Chargement des utilisateurs...</div>
        ) : users.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="inline-block p-4 bg-background rounded-full">
                <Mail size={32} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Aucun autre utilisateur</h3>
              <p className="text-sm">Invitez des amis à rejoindre Fiche !</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {users.map(user => (
              <div key={user.uid} onClick={() => setActivePrivateChat(user)} className="flex items-center gap-4 p-3 rounded-lg hover:bg-background cursor-pointer transition-colors">
                <Avatar>
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const SettingsTab = () => (
    <div className="h-full p-6 bg-muted/40 dark:bg-gray-800/20 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Paramètres</h2>
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="bg-background dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Profil</h3>
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Avatar className="w-24 h-24">
                           <AvatarFallback><User size={40}/></AvatarFallback>
                        </Avatar>
                        <Button size="icon" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full">
                           <Edit size={14}/>
                           <span className="sr-only">Changer la photo</span>
                        </Button>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="text-sm font-medium">Nom complet</label>
                            <Input defaultValue={currentUser?.displayName || ''} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Adresse e-mail</label>
                            <Input defaultValue={currentUser?.email || ''} readOnly />
                        </div>
                    </div>
                    <div>
                      <Button>Mettre à jour le profil</Button>
                    </div>
                </div>
            </div>

            <div className="bg-background dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Apparence</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Thème sombre</p>
                        <p className="text-sm text-muted-foreground">Activez le mode sombre pour une expérience visuelle différente.</p>
                    </div>
                    <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                        aria-label="Activer le thème sombre"
                    />
                </div>
            </div>

            <div className="bg-background dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Compte</h3>
                 <div className="space-y-4">
                    <Button variant="outline">
                        Changer le mot de passe
                    </Button>
                     <Button variant="destructive">
                        Supprimer le compte
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );

  if (isAuthenticating) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
            <h1 className="text-5xl font-bold font-headline text-primary">FICHE</h1>
            <p className="mt-2 text-lg text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthForm />;
  }
  
  if (activeCommunityChat) {
    return <CommunityChatRoom community={activeCommunityChat} onBack={() => setActiveCommunityChat(null)} />;
  }

  if (activePrivateChat) {
    return <PrivateChatRoom recipient={activePrivateChat} onBack={() => setActivePrivateChat(null)} currentUser={currentUser} />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-64 flex flex-col bg-white dark:bg-gray-900 border-r border-border p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain size={24} className="text-primary"/>
          </div>
          <h1 className="text-2xl font-bold font-headline text-primary">FICHE</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <Button variant={activeTab === 'chat' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('chat')}>
            <MessageCircle size={18} className="mr-3"/>
            Chat IA
          </Button>
          <Button variant={activeTab === 'communities' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('communities')}>
            <Users size={18} className="mr-3"/>
            Communautés
          </Button>
          <Button variant={activeTab === 'messages' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('messages')}>
            <Mail size={18} className="mr-3"/>
            Messages
          </Button>
          <Button variant={activeTab === 'settings' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('settings')}>
            <Settings size={18} className="mr-3"/>
            Paramètres
          </Button>
        </nav>
        <div className="mt-auto">
          <Separator className="my-4"/>
          <div className="flex items-center gap-3">
             <Avatar>
              <AvatarImage src={currentUser?.photoURL || ''} />
              <AvatarFallback>{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="font-semibold truncate">{currentUser?.displayName || 'Utilisateur'}</p>
              <p className="text-sm text-muted-foreground truncate">{currentUser?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="flex-shrink-0">
                <LogOut size={18}/>
                <span className="sr-only">Déconnexion</span>
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'communities' && <CommunitiesTab />}
        {activeTab === 'messages' && <MessagesTab currentUser={currentUser}/>}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};

export default FicheApp;
