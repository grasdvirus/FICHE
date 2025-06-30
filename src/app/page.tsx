
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { 
  MessageCircle, 
  Users, 
  Mail, 
  Settings, 
  Send, 
  Plus, 
  Search,
  User,
  LogOut,
  Sparkles,
  Brain,
  Volume2,
  Pause,
  Copy,
  ThumbsUp,
  RotateCw,
  ArrowLeft,
  Inbox,
  FileText,
  Trash2,
  PenSquare,
  Image as ImageIcon,
  PlusCircle,
  CheckCircle2,
  File as FileIcon,
  MoreHorizontal,
  LogIn,
  Palette,
  Lock,
  Bell,
  HelpCircle,
  Check,
  CheckCheck
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { analyzeText } from '@/ai/flows/analyze-text';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { generateCommunityDescription } from '@/ai/flows/generate-community-description';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from '@/hooks/use-mobile';

// Firebase
import { auth, db, rtdb, googleProvider, storage } from '@/lib/firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, where, getDocs, Timestamp, arrayUnion, arrayRemove, deleteDoc, writeBatch } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { ref as rtdbRef, onValue, push, serverTimestamp as rtdbServerTimestamp, off, update } from "firebase/database";

// ShadCN UI Components
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';


// --- Data Types ---
type ChatMessage = {
  id: string;
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
  color: string;
  createdAt: Timestamp;
  members: string[];
};

type EmailMessage = {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Timestamp;
  isRead: boolean;
  participantUids: string[];
};

type Conversation = {
  id: string; // The other user's UID
  otherUser: AppUser;
  messages: EmailMessage[];
  lastMessage: EmailMessage | null;
  unreadCount: number;
};

type CommunityMessage = {
  id: string;
  from: string;
  fromName: string;
  content: string;
  timestamp: number;
  readBy?: { [uid: string]: boolean };
};

type AppUser = {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
};

type ActiveTab = 'chat' | 'communities' | 'files' | 'messages' | 'settings';


// --- Community Color Palette ---
const COMMUNITY_COLORS = [
    '#4A90E2', // Blue
    '#50E3C2', // Teal
    '#E67E22', // Dark Orange
    '#D0021B', // Red
    '#9013FE', // Purple
    '#27AE60', // Green
    '#006064', // Dark Cyan
    '#C0392B'  // Dark Red
];
const getRandomColor = () => COMMUNITY_COLORS[Math.floor(Math.random() * COMMUNITY_COLORS.length)];


// --- Helpers ---
const formatFollowerCount = (num: number): string => {
  if (!num) return '0 membres';
  if (num === 1) return '1 membre';
  if (num >= 1000) {
    const formatted = (num / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 });
    return `${formatted} K membres`;
  }
  return `${num} membres`;
};

// --- Global Audio Player ---
const AudioPlayerContext = React.createContext<{
  playAudio: (src: string, id: string) => void;
  stopAudio: () => void;
  currentlyPlaying: string | null;
}>({
  playAudio: () => {},
  stopAudio: () => {},
  currentlyPlaying: null,
});

const AudioPlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      const player = audioRef.current;
      const onEnded = () => setCurrentlyPlaying(null);
      player.addEventListener('ended', onEnded);
      player.addEventListener('pause', onEnded);
      return () => {
        player.removeEventListener('ended', onEnded);
        player.removeEventListener('pause', onEnded);
        player.pause();
      };
    }
  }, []);

  const playAudio = useCallback((src: string, id: string) => {
    const player = audioRef.current;
    if (!player) return;

    if (currentlyPlaying === id) {
      player.pause();
      setCurrentlyPlaying(null);
    } else {
      player.src = src;
      player.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.error("Error playing audio:", e);
        }
      });
      setCurrentlyPlaying(id);
    }
  }, [currentlyPlaying]);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    setCurrentlyPlaying(null);
  }, []);

  return (
    <AudioPlayerContext.Provider value={{ playAudio, stopAudio, currentlyPlaying }}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

const useAudioPlayer = () => {
  const context = React.useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

// --- Authentication ---
const AuthForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      }, { merge: true });

      toast({ title: 'Connexion réussie', description: `Bienvenue, ${user.displayName}!` });
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Sign-In Error:", error);
        toast({ variant: 'destructive', title: 'Erreur de connexion', description: "Une erreur est survenue lors de la connexion avec Google." });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Nom requis', description: 'Veuillez entrer votre nom.' });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: name,
        email: user.email,
        photoURL: null
      }, { merge: true });

      toast({ title: 'Inscription réussie', description: `Bienvenue, ${name}!` });
    } catch (error: any) {
      console.error("Sign-Up Error:", error);
      let description = "Une erreur est survenue lors de la création du compte.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Cette adresse e-mail est déjà utilisée par un autre compte.";
      } else if (error.code === 'auth/weak-password') {
        description = "Le mot de passe doit contenir au moins 6 caractères.";
      }
      toast({ variant: 'destructive', title: 'Erreur d\'inscription', description: description });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Connexion réussie' });
    } catch (error: any)
{
      console.error("Sign-In Error:", error);
      let description = "Une erreur inattendue est survenue.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          description = "L'adresse e-mail ou le mot de passe est incorrect. Veuillez vérifier vos informations.";
      }
      toast({ 
        variant: 'destructive', 
        title: 'Erreur de connexion', 
        description: description 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold font-headline text-primary">FICHE</h1>
            <p className="mt-2 text-lg text-muted-foreground">Votre assistant IA intelligent</p>
        </div>
        
        <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Se connecter</TabsTrigger>
                <TabsTrigger value="signup">S'inscrire</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <Card>
                    <CardHeader>
                        <CardTitle>Connexion</CardTitle>
                        <CardDescription>Accédez à votre compte pour continuer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleEmailSignIn} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="login-email">E-mail</Label>
                                <Input id="login-email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="login-password">Mot de passe</Label>
                                <Input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Connexion...' : 'Se connecter'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="signup">
                <Card>
                    <CardHeader>
                        <CardTitle>Créer un compte</CardTitle>
                        <CardDescription>Inscrivez-vous pour commencer à utiliser FICHE.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleEmailSignUp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="signup-name">Nom</Label>
                                <Input id="signup-name" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-email">E-mail</Label>
                                <Input id="signup-email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-password">Mot de passe</Label>
                                <Input id="signup-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Création...' : 'Créer le compte'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-muted/20 px-2 text-muted-foreground">Ou continuer avec</span>
            </div>
        </div>
        <Button variant="outline" onClick={handleGoogleSignIn} className="w-full" disabled={isGoogleLoading}>
             <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.37 1.62-4.38 1.62-3.82 0-6.94-3.12-6.94-6.94s3.12-6.94 6.94-6.94c2.2 0 3.58.88 4.38 1.62l2.35-2.35C17.48 3.48 15.24 2.4 12.48 2.4 7.22 2.4 3.2 6.42 3.2 11.68s4.02 9.28 9.28 9.28c2.82 0 5.12-1.04 6.8-2.72 1.74-1.68 2.24-4.2 2.24-6.32 0-.6-.05-1.18-.15-1.72H12.48z"></path>
            </svg>
            {isGoogleLoading ? 'Chargement...' : 'Continuer avec Google'}
        </Button>
      </div>
    </div>
  );
};


// --- AI Chat Components ---
const ChatMessageDisplay = React.memo(
  ({
    message,
    onLike,
  }: {
    message: ChatMessage;
    onLike: () => void;
  }) => {
    const { playAudio, currentlyPlaying } = useAudioPlayer();
    const { toast } = useToast();

    const isPlaying = currentlyPlaying === message.id;

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(() => {
          toast({
            title: 'Copié',
            description: 'Le texte a été copié dans le presse-papiers.',
          });
        });
      }, [toast]);
      
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
                  <Button variant="ghost" size="icon" onClick={() => playAudio(message.audioDataUri!, message.id)} className="h-8 w-8">
                      {isPlaying ? <Pause size={16}/> : <Volume2 size={16}/>}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleCopy(message.content)} className="h-8 w-8"> <Copy size={16}/> </Button>
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


const ChatInterface = ({currentUser}: {currentUser: FirebaseUser}) => {
  const [userText, setUserText] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  let messageIdCounter = 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);


  const handleTextSubmit = async () => {
    if (!userText.trim()) return;
    
    setIsLoading(true);
    const currentText = userText;
    const userMessage: ChatMessage = { id: `user-${messageIdCounter++}`, type: 'user', content: currentText, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    setUserText('');

    try {
      const aiData = await analyzeText({ text: currentText });
      const audioResult = await textToSpeech({ text: aiData.explanation });
      
      const aiMessage: ChatMessage = {
        id: `ai-${messageIdCounter++}`,
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
        id: `error-${messageIdCounter++}`,
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

  const handleLike = useCallback((id: string) => {
    setChatHistory(prev =>
      prev.map((message) => {
        if (message.id === id && message.type === 'ai') {
          return { ...message, liked: !message.liked };
        }
        return message;
      })
    );
  }, []);
    return (
    <div className="flex flex-col h-full bg-muted/40 dark:bg-gray-800/20">
       <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {chatHistory.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <div className="p-5 bg-background dark:bg-gray-800 rounded-full mb-4">
                  <Brain size={40} className="text-primary"/>
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Commencez une conversation</h2>
                <p>Tapez votre texte et recevez des suggestions intelligentes.</p>
            </div>
          ) : (
            chatHistory.map((message) => (
              <div key={message.id}>
                <ChatMessageDisplay
                  message={message}
                  onLike={() => handleLike(message.id)}
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
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 bg-background dark:bg-gray-900/50 border-t border-border">
        <div className="flex items-start gap-2">
          <Textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="Tapez votre texte ici..."
            className="flex-1 resize-none bg-muted dark:bg-gray-800"
            rows={1}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
          />
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" onClick={handleNewChat} className="h-9 w-9">
              <RotateCw size={18} />
            </Button>
            <Button onClick={handleTextSubmit} disabled={isLoading || !userText.trim()} className="h-9 w-9" size="icon">
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


// --- Communities Components ---
const CommunitiesTab = ({ currentUser, onEnterCommunity }: { currentUser: FirebaseUser, onEnterCommunity: (community: Community) => void }) => {
    const [communities, setCommunities] = useState<Community[]>([]);
    const [myCommunities, setMyCommunities] = useState<Community[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [communityToEdit, setCommunityToEdit] = useState<Community | null>(null);
    const [communityToDelete, setCommunityToDelete] = useState<Community | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, "communities"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const allCommunities = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Community[];
            setCommunities(allCommunities.filter(c => !c.members.includes(currentUser.uid)));
            setMyCommunities(allCommunities.filter(c => c.members.includes(currentUser.uid)));
        }, (error) => {
            console.error("Erreur de lecture des communautés:", error);
            toast({
                variant: "destructive",
                title: "Erreur de base de données",
                description: "Impossible de charger les communautés.",
            });
        });
        return () => unsubscribe();
    }, [currentUser.uid, toast]);

    const handleSubscription = async (communityId: string, isJoining: boolean) => {
      const communityRef = doc(db, 'communities', communityId);
      try {
        await updateDoc(communityRef, {
          members: isJoining
            ? arrayUnion(currentUser.uid) 
            : arrayRemove(currentUser.uid),
        });
        toast({
          title: isJoining ? 'Abonnement réussi' : 'Désabonnement réussi',
          description: `Vous avez ${isJoining ? 'rejoint' : 'quitté'} la communauté.`
        });
      } catch (error) {
        console.error("Erreur d'abonnement:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: "L'opération a échoué." });
      }
    };

    const handleDeleteCommunity = async () => {
        if (!communityToDelete) return;
        try {
            await deleteDoc(doc(db, 'communities', communityToDelete.id));
            toast({ title: "Succès", description: `La communauté "${communityToDelete.name}" a été supprimée.`});
            setCommunityToDelete(null);
        } catch (error) {
            console.error("Erreur de suppression:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: "La suppression a échoué." });
        }
    };

    const filteredCommunities = communities.filter(community =>
        community.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const CommunityCard = ({ community, onClick, children }: { community: Community, onClick: () => void, children?: React.ReactNode }) => (
      <div className="group relative text-center">
        <div onClick={onClick} className="cursor-pointer flex flex-col items-center">
            <Avatar className="w-24 h-24 mb-2 transition-transform group-hover:scale-105" style={{ backgroundColor: community.color }}>
              <AvatarFallback className="bg-transparent text-white text-4xl font-bold">{community.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          <p className="font-semibold">{community.name}</p>
          <p className="text-xs text-muted-foreground">{formatFollowerCount(community.members.length)}</p>
        </div>
        {children}
      </div>
    );

    return (
        <div className="h-full flex flex-col bg-muted/40 dark:bg-gray-800/20">
             <header className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 p-4 md:p-6 pb-0">
                <h2 className="text-2xl font-bold">Communautés</h2>
                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 w-full bg-background"
                        />
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus size={16} className="mr-2" />
                        <span className="hidden sm:inline">Créer</span>
                    </Button>
                </div>
            </header>
            <ScrollArea className="flex-1">
                <div className="p-4 md:p-6">
                    {myCommunities.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-xl font-semibold mb-4">Mes communautés</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {myCommunities.map(community => (
                                    <CommunityCard key={community.id} community={community} onClick={() => onEnterCommunity(community)}>
                                        {community.ownerId === currentUser.uid && (
                                            <div className="absolute top-0 right-0">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                            <MoreHorizontal size={18} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCommunityToEdit(community); }}>
                                                            <PenSquare size={16} className="mr-2" /> Modifier
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setCommunityToDelete(community); }}>
                                                            <Trash2 size={16} className="mr-2" /> Supprimer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        )}
                                    </CommunityCard>
                                ))}
                            </div>
                            <Separator className="mt-8"/>
                        </div>
                    )}
                    
                    <h3 className="text-xl font-semibold mb-4">Découvrir</h3>
                    {filteredCommunities.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6">
                            {filteredCommunities.map(community => {
                                const isMember = myCommunities.some(mc => mc.id === community.id);
                                return (
                                    <CommunityCard key={community.id} community={community} onClick={() => handleSubscription(community.id, !isMember)}>
                                       <button onClick={(e) => { e.stopPropagation(); handleSubscription(community.id, !isMember); }} className="absolute top-0 right-0 -mt-1 -mr-1 bg-background rounded-full p-1 shadow-md hover:scale-110 transition-transform">
                                          {isMember ? <CheckCircle2 size={24} className="text-green-500" /> : <PlusCircle size={24} className="text-primary"/>}
                                        </button>
                                    </CommunityCard>
                                )
                            })}
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
                </div>
            </ScrollArea>
            <CommunityFormDialog 
              isOpen={isCreateDialogOpen || !!communityToEdit} 
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setIsCreateDialogOpen(false);
                  setCommunityToEdit(null);
                }
              }} 
              currentUser={currentUser} 
              community={communityToEdit}
            />
             <AlertDialog open={!!communityToDelete} onOpenChange={() => setCommunityToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La communauté "{communityToDelete?.name}" et toutes ses données seront supprimées.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCommunityToDelete(null)}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCommunity} className={buttonVariants({ variant: "destructive" })}>
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

const CommunityFormDialog = ({ isOpen, onOpenChange, currentUser, community }: { isOpen: boolean, onOpenChange: (open: boolean) => void, currentUser: FirebaseUser | null, community: Community | null }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!community;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && community) {
        setName(community.name);
        setDescription(community.description);
      } else {
        setName('');
        setDescription('');
      }
    }
  }, [community, isEditMode, isOpen]);
  
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

  const handleSave = async () => {
      if (!name.trim() || !description.trim() || !currentUser) {
          toast({ variant: "destructive", title: "Erreur", description: "Le nom et la description sont requis." });
          return;
      }
      setIsSubmitting(true);
      
      try {
          if (isEditMode && community) {
              const communityRef = doc(db, 'communities', community.id);
              await updateDoc(communityRef, { name, description });
              toast({ title: "Communauté modifiée", description: `La communauté "${name}" a été mise à jour.` });
          } else {
              const newCommunityData = {
                  name,
                  description,
                  ownerId: currentUser.uid,
                  createdAt: serverTimestamp(),
                  color: getRandomColor(),
                  members: [currentUser.uid],
              };
              await addDoc(collection(db, 'communities'), newCommunityData);
              toast({ title: "Communauté créée", description: `La communauté "${name}" a été créée avec succès.` });
          }
          onOpenChange(false);
      } catch (error) {
          console.error("Error saving community:", error);
          toast({ variant: "destructive", title: "Erreur", description: `L'enregistrement de la communauté a échoué.` });
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Modifier la communauté' : 'Créer une nouvelle communauté'}</DialogTitle>
          <DialogDescription>
              {isEditMode ? 'Modifiez les informations de votre communauté.' : 'Donnez un nom à votre communauté et décrivez-la pour attirer des membres.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
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
            <Button onClick={handleSave} disabled={isSubmitting || !name.trim() || !description.trim()}>
                {isSubmitting ? 'Enregistrement...' : (isEditMode ? 'Enregistrer les modifications' : 'Créer la communauté')}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const CommunityChatRoom = ({ community, onBack, currentUser }: { community: Community, onBack: () => void, currentUser: FirebaseUser }) => {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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

    return () => off(messagesRef, 'value', unsubscribe);
  }, [community.id, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!currentUser || messages.length === 0 || !community.members.includes(currentUser.uid)) return;

    const messagesToMarkAsRead = messages.filter(msg => msg.id && (!msg.readBy || !msg.readBy[currentUser.uid]));
    
    if (messagesToMarkAsRead.length > 0) {
        const updates: { [key: string]: any } = {};
        messagesToMarkAsRead.forEach(msg => {
            updates[`/communities/${community.id}/messages/${msg.id}/readBy/${currentUser.uid}`] = true;
        });

        const markAsRead = async () => {
            try {
                await update(rtdbRef(rtdb), updates);
            } catch (error) {
                console.error("Error marking messages as read:", error);
            }
        };

        const timeoutId = setTimeout(markAsRead, 1500);
        return () => clearTimeout(timeoutId);
    }
}, [messages, community.id, community.members, currentUser]);


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const messageData = {
      from: currentUser.uid,
      fromName: currentUser.displayName || 'Anonyme',
      content: newMessage,
      timestamp: rtdbServerTimestamp(),
      readBy: { [currentUser.uid]: true },
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
        <Avatar className="w-10 h-10" style={{backgroundColor: community.color}}>
          <AvatarFallback className="bg-transparent text-white font-semibold">{community.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{community.name}</h2>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Chargement des messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground">Aucun message. Soyez le premier !</div>
          ) : (
            messages.map((msg) => {
              const isMyMessage = msg.from === currentUser?.uid;
              const isRead = msg.readBy ? Object.keys(msg.readBy).length > 1 : false;

              return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                {!isMyMessage && <Avatar className="w-8 h-8 self-start"><AvatarFallback>{msg.fromName.charAt(0)}</AvatarFallback></Avatar>}
                <div className={`max-w-md rounded-xl px-4 py-2 ${isMyMessage ? 'bg-primary text-primary-foreground' : 'bg-background dark:bg-gray-800'}`}>
                  {!isMyMessage && <div className="text-xs font-bold text-primary mb-1">{msg.fromName}</div>}
                  <p>{msg.content}</p>
                  <div className="flex items-center justify-end gap-2 text-xs opacity-70 mt-1">
                    <p>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {isMyMessage && (
                       isRead ? <CheckCheck size={16} className="text-sky-400" /> : <Check size={16} />
                    )}
                  </div>
                </div>
              </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 bg-background dark:bg-gray-900/50 border-t">
        <div className="relative flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrire un message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="bg-muted dark:bg-gray-800"
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()} size="icon" className="h-9 w-9 flex-shrink-0">
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};


// --- Messages (Inbox-style) Components ---
const ConversationListItem = ({ conversation, onSelect, isSelected }: { conversation: Conversation, onSelect: () => void, isSelected: boolean }) => {
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-3 border-b flex items-center gap-3 transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}
        >
            <Avatar className="w-12 h-12">
                <AvatarImage src={conversation.otherUser.photoURL} />
                <AvatarFallback>{conversation.otherUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <p className="font-semibold truncate">{conversation.otherUser.name}</p>
                    {conversation.lastMessage && conversation.lastMessage.timestamp && (
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(conversation.lastMessage.timestamp.toDate(), { addSuffix: true, locale: fr })}
                        </p>
                    )}
                </div>
                <div className="flex justify-between items-start">
                    <p className="text-sm text-muted-foreground truncate flex-1">
                        {conversation.lastMessage?.content || "Aucun message"}
                    </p>
                    {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs rounded-full">
                            {conversation.unreadCount}
                        </Badge>
                    )}
                </div>
            </div>
        </button>
    );
};

const ConversationDetail = ({ conversation, currentUser, onBack }: { conversation: Conversation, currentUser: FirebaseUser, onBack: () => void }) => {
    const { toast } = useToast();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation.messages]);

    useEffect(() => {
        // Mark messages as read when conversation is opened
        const markAsRead = async () => {
            const batch = writeBatch(db);
            let unreadCount = 0;
            conversation.messages.forEach(msg => {
                if (msg.to === currentUser.uid && !msg.isRead) {
                    const msgRef = doc(db, 'messages', msg.id);
                    batch.update(msgRef, { isRead: true });
                    unreadCount++;
                }
            });
            if (unreadCount > 0) {
                try {
                    await batch.commit();
                } catch (error) {
                    console.error("Error marking messages as read:", error);
                }
            }
        };
        if (conversation && currentUser) {
            markAsRead();
        }
    }, [conversation, currentUser]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        setIsSending(true);

        try {
            await addDoc(collection(db, 'messages'), {
                from: currentUser.uid,
                to: conversation.otherUser.uid,
                content: newMessage,
                timestamp: serverTimestamp(),
                isRead: false,
                participantUids: [currentUser.uid, conversation.otherUser.uid]
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: "L'envoi du message a échoué." });
        } finally {
            setIsSending(false);
        }
    };
    
    return (
        <div className="p-0 flex flex-col h-full bg-background">
             <header className="flex items-center gap-4 p-3 border-b bg-background sticky top-0 z-10">
                {isMobile && <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2"><ArrowLeft size={20} /></Button>}
                <Avatar>
                    <AvatarImage src={conversation.otherUser.photoURL} />
                    <AvatarFallback>{conversation.otherUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-bold truncate">{conversation.otherUser.name}</h2>
            </header>
            <ScrollArea className="flex-1">
                <div className="p-4 md:p-6 space-y-4">
                    {conversation.messages.map(msg => (
                         <div key={msg.id} className={`flex items-end gap-2 ${msg.from === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                             {msg.from !== currentUser.uid && <Avatar className="w-8 h-8 self-start"><AvatarFallback>{conversation.otherUser.name.charAt(0)}</AvatarFallback></Avatar>}
                             <div className={`max-w-lg rounded-xl px-4 py-2 ${msg.from === currentUser.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                 <p className="whitespace-pre-wrap">{msg.content}</p>
                                 {msg.timestamp && (
                                    <p className="text-xs opacity-70 mt-1 text-right">{format(msg.timestamp.toDate(), 'HH:mm')}</p>
                                 )}
                             </div>
                         </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>
            <div className="mt-auto p-4 border-t bg-background">
                <div className="relative flex items-center gap-2">
                    <Textarea 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Écrire un message..."
                        rows={1}
                        className="resize-none"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} size="icon" className="h-9 w-9 flex-shrink-0">
                        {isSending ? "..." : <Send size={18} />}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const MessagesTab = ({ currentUser }: { currentUser: FirebaseUser }) => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const isMobile = useIsMobile();
    const { toast } = useToast();

    useEffect(() => {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('uid', '!=', currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUsers(snapshot.docs.map(doc => doc.data() as AppUser));
        }, (error) => {
            console.error("Error fetching users:", error);
        });
        return () => unsubscribe();
    }, [currentUser.uid]);

    useEffect(() => {
        if (!currentUser?.uid) {
            setConversations([]);
            return;
        }

        const messagesRef = collection(db, 'messages');
        const q = query(messagesRef, where('participantUids', 'array-contains', currentUser.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFetchError(null);
            const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailMessage));
            
            const conversationsMap = new Map<string, Conversation>();

            allMessages.forEach(msg => {
                const otherUserId = msg.from === currentUser.uid ? msg.to : msg.from;
                if (!conversationsMap.has(otherUserId)) {
                    const otherUser = users.find(u => u.uid === otherUserId);
                    if (otherUser) {
                        conversationsMap.set(otherUserId, {
                            id: otherUserId,
                            otherUser: otherUser,
                            messages: [],
                            lastMessage: null,
                            unreadCount: 0
                        });
                    }
                }

                const conversation = conversationsMap.get(otherUserId);
                if (conversation) {
                    conversation.messages.push(msg);
                }
            });

            conversationsMap.forEach(convo => {
                convo.messages.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
                convo.lastMessage = convo.messages[convo.messages.length - 1] || null;
                convo.unreadCount = convo.messages.filter(m => m.to === currentUser.uid && !m.isRead).length;
            });
            
            const sortedConversations = Array.from(conversationsMap.values())
              .sort((a,b) => (b.lastMessage?.timestamp?.toMillis() || 0) - (a.lastMessage?.timestamp?.toMillis() || 0));

            setConversations(sortedConversations);

        }, (error: any) => {
            console.error("Error fetching messages:", error);
            if (error.code === 'permission-denied') {
                setFetchError("Permission refusée. Vérifiez vos règles de sécurité Firestore.");
            } else if (error.code === 'failed-precondition') {
                 setFetchError("La requête nécessite un index Firestore. Créez-le via le lien dans la console du navigateur.");
            }
            else {
                setFetchError('Une erreur est survenue lors du chargement des messages.');
            }
        });

        return () => unsubscribe();
    }, [currentUser.uid, users]);

    const handleSelectConversation = (conversationId: string) => {
      setSelectedConversationId(conversationId);
      if (isMobile) {
        // Mobile navigation will handle the view change
      }
    };

    const selectedConversation = conversations.find(c => c.id === selectedConversationId);
    
    // Mobile View
    if (isMobile) {
        if (selectedConversation) {
            return (
                <ConversationDetail 
                    conversation={selectedConversation}
                    currentUser={currentUser} 
                    onBack={() => setSelectedConversationId(null)}
                />
            );
        }

        return (
             <div className="h-full flex flex-col bg-background">
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Messages</h2>
                    <Button size="sm" onClick={() => setIsComposing(true)}><PenSquare size={16} className="mr-2"/>Nouveau</Button>
                </header>
                <ScrollArea className="flex-1">
                    {fetchError ? (
                        <div className="p-4 text-center text-sm text-destructive">{fetchError}</div>
                    ) : conversations.length > 0 ? (
                        conversations.map(convo => (
                            <ConversationListItem 
                                key={convo.id} 
                                conversation={convo}
                                onSelect={() => handleSelectConversation(convo.id)}
                                isSelected={selectedConversationId === convo.id}
                            />
                        ))
                    ) : (
                        <p className="p-4 text-center text-sm text-muted-foreground">Aucune conversation.</p>
                    )}
                </ScrollArea>
                <NewMessageDialog isOpen={isComposing} onOpenChange={setIsComposing} currentUser={currentUser} users={users} onMessageSent={(recipientId) => setSelectedConversationId(recipientId)} />
            </div>
        )
    }

    // Desktop View
    return (
        <div className="h-full flex flex-row bg-muted/20">
            <div className="w-80 border-r flex flex-col bg-background">
                 <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Messages</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsComposing(true)}><PenSquare size={16} /></Button>
                </div>
                <ScrollArea className="flex-1">
                    {fetchError ? (
                        <div className="p-4 text-center text-sm text-destructive">{fetchError}</div>
                    ) : conversations.length > 0 ? (
                        conversations.map(convo => (
                            <ConversationListItem 
                                key={convo.id} 
                                conversation={convo}
                                onSelect={() => handleSelectConversation(convo.id)}
                                isSelected={selectedConversationId === convo.id}
                            />
                        ))
                    ) : (
                        <div className="p-10 text-center text-sm text-muted-foreground">Aucune conversation.</div>
                    )}
                </ScrollArea>
            </div>
            <div className="flex-1">
                {selectedConversation ? (
                    <ConversationDetail conversation={selectedConversation} currentUser={currentUser} onBack={() => {}} />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Mail size={48} className="mx-auto" />
                            <h3 className="mt-4 text-lg font-semibold">Vos messages</h3>
                            <p>Sélectionnez une conversation pour commencer à discuter.</p>
                        </div>
                    </div>
                )}
            </div>
            <NewMessageDialog isOpen={isComposing} onOpenChange={setIsComposing} currentUser={currentUser} users={users} onMessageSent={(recipientId) => setSelectedConversationId(recipientId)} />
        </div>
    );
};

const NewMessageDialog = ({ isOpen, onOpenChange, currentUser, users, onMessageSent }: { isOpen: boolean, onOpenChange: (open: boolean) => void, currentUser: FirebaseUser, users: AppUser[], onMessageSent: (recipientId: string) => void }) => {
    const [recipientUid, setRecipientUid] = useState('');
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    const handleSend = async () => {
        if (!recipientUid || !content.trim()) {
            toast({ variant: 'destructive', title: 'Champs requis', description: 'Veuillez choisir un destinataire et écrire un message.' });
            return;
        }
        setIsSending(true);
        const recipient = users.find(u => u.uid === recipientUid);
        if (!recipient) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Destinataire non trouvé.' });
            setIsSending(false);
            return;
        }

        try {
            await addDoc(collection(db, 'messages'), {
                from: currentUser.uid,
                to: recipientUid,
                content,
                timestamp: serverTimestamp(),
                isRead: false,
                participantUids: [currentUser.uid, recipientUid]
            });
            toast({ title: 'Message envoyé' });
            onOpenChange(false);
            setRecipientUid('');
            setContent('');
            onMessageSent(recipientUid);
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: "L'envoi du message a échoué." });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nouveau Message</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Select onValueChange={setRecipientUid} value={recipientUid}>
                        <SelectTrigger><SelectValue placeholder="À :" /></SelectTrigger>
                        <SelectContent>
                            {users.map(user => (
                                <SelectItem key={user.uid} value={user.uid}>{user.name} ({user.email})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Textarea placeholder="Votre message..." value={content} onChange={e => setContent(e.target.value)} rows={6} />
                </div>
                <DialogFooter>
                    <Button onClick={handleSend} disabled={isSending}>{isSending ? 'Envoi...' : 'Envoyer'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
  
// --- Settings Component ---
const SettingsItem = ({ icon, title, subtitle, onClick, isActive }: { icon: React.ReactNode, title: string, subtitle?: string, onClick: () => void, isActive: boolean }) => (
    <Button
        variant={isActive ? 'secondary' : 'ghost'}
        onClick={onClick}
        className="w-full justify-start h-auto py-3 px-3"
    >
        <div className="flex items-center gap-4">
            <div className="text-muted-foreground">{icon}</div>
            <div className="text-left">
                <p className="font-semibold text-foreground">{title}</p>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
        </div>
    </Button>
);

const SettingsTab = ({theme, setTheme, currentUser, onLogout}: {theme: 'light' | 'dark', setTheme: (theme: 'light' | 'dark') => void, currentUser: FirebaseUser, onLogout: () => void}) => {
    const isMobile = useIsMobile();
    const [activeSection, setActiveSection] = useState('profile');
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
    const { toast } = useToast();

    const handleItemClick = (section: string) => {
        setActiveSection(section);
        if (isMobile) {
            setMobileView('detail');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid));
            toast({ title: 'Compte supprimé', description: 'Vos données ont été supprimées de Firestore.' });
            onLogout();
        } catch (error) {
            console.error("Error deleting account data:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer les données du compte.' });
        }
    };
    
    const renderContent = () => {
        switch (activeSection) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold hidden md:block">Profil</h3>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <Avatar className="w-24 h-24">
                                <AvatarImage src={currentUser.photoURL || undefined} />
                                <AvatarFallback><User size={40}/></AvatarFallback>
                            </Avatar>
                            <div className="flex-1 w-full space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                                    <Input defaultValue={currentUser?.displayName || ''} readOnly className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Adresse e-mail</label>
                                    <Input defaultValue={currentUser?.email || ''} readOnly className="mt-1" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold hidden md:block">Apparence</h3>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
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
                );
            case 'account':
                return (
                     <div className="space-y-6">
                        <h3 className="text-xl font-bold hidden md:block">Compte</h3>
                        <div className="p-4 border border-destructive/50 rounded-lg">
                            <h4 className="font-semibold text-destructive">Zone de danger</h4>
                            <p className="text-sm text-muted-foreground mt-1 mb-4">La suppression de votre compte est une action irréversible.</p>
                            <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)}>
                                Supprimer le compte
                            </Button>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="text-center text-muted-foreground">
                        <h3 className="text-xl font-bold hidden md:block">{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h3>
                        <p>Cette section sera bientôt disponible.</p>
                    </div>
                );
        }
    };

     if (isMobile) {
        return (
            <div className="h-full flex flex-col bg-background">
                {mobileView === 'list' ? (
                     <>
                        <header className="p-4 border-b flex items-center gap-3">
                             <Avatar>
                                <AvatarImage src={currentUser?.photoURL || ''} />
                                <AvatarFallback>{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-bold">Paramètres</h2>
                        </header>
                        <ScrollArea className="flex-1">
                            <nav className="flex flex-col gap-1 p-4">
                                <SettingsItem icon={<User size={20}/>} title="Profil" subtitle="Gérer vos informations" onClick={() => handleItemClick('profile')} isActive={activeSection === 'profile'} />
                                <SettingsItem icon={<Palette size={20}/>} title="Apparence" subtitle="Personnaliser l'interface" onClick={() => handleItemClick('appearance')} isActive={activeSection === 'appearance'} />
                                <SettingsItem icon={<Lock size={20}/>} title="Confidentialité" subtitle="Gérer vos données" onClick={() => handleItemClick('privacy')} isActive={activeSection === 'privacy'} />
                                <SettingsItem icon={<Bell size={20}/>} title="Notifications" subtitle="Ajuster les alertes" onClick={() => handleItemClick('notifications')} isActive={activeSection === 'notifications'} />
                                <SettingsItem icon={<Trash2 size={20}/>} title="Compte" subtitle="Supprimer vos données" onClick={() => handleItemClick('account')} isActive={activeSection === 'account'} />
                            </nav>
                        </ScrollArea>
                        <div className="p-4 mt-auto border-t">
                            <Button variant="ghost" onClick={onLogout} className="w-full justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10">
                                <LogOut size={18} className="mr-3"/> Se déconnecter
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <header className="p-4 border-b flex items-center gap-2">
                             <Button variant="ghost" size="icon" onClick={() => setMobileView('list')} className="-ml-2"><ArrowLeft size={20} /></Button>
                             <h2 className="text-xl font-bold">{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h2>
                        </header>
                        <ScrollArea className="flex-1">
                            <main className="p-6">
                                {renderContent()}
                            </main>
                        </ScrollArea>
                    </>
                )}
                 <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Voulez-vous vraiment supprimer votre compte ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est définitive et irréversible. Toutes vos données (profil, messages, etc.) seront supprimées de nos serveurs.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAccount} className={buttonVariants({ variant: "destructive" })}>
                                Oui, supprimer mon compte
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-row bg-muted/40 dark:bg-gray-800/20">
            <div className="w-1/3 max-w-sm border-r bg-background p-4 flex flex-col">
                <h2 className="text-2xl font-bold p-2 mb-4">Paramètres</h2>
                <ScrollArea className="flex-1 -mx-4">
                    <nav className="flex flex-col gap-1 px-4">
                        <SettingsItem icon={<User size={20}/>} title="Profil" subtitle="Gérer vos informations" onClick={() => handleItemClick('profile')} isActive={activeSection === 'profile'} />
                        <SettingsItem icon={<Palette size={20}/>} title="Apparence" subtitle="Personnaliser l'interface" onClick={() => handleItemClick('appearance')} isActive={activeSection === 'appearance'} />
                        <SettingsItem icon={<Lock size={20}/>} title="Confidentialité" subtitle="Gérer vos données" onClick={() => handleItemClick('privacy')} isActive={activeSection === 'privacy'} />
                        <SettingsItem icon={<Bell size={20}/>} title="Notifications" subtitle="Ajuster les alertes" onClick={() => handleItemClick('notifications')} isActive={activeSection === 'notifications'} />
                        <SettingsItem icon={<Trash2 size={20}/>} title="Compte" subtitle="Supprimer vos données" onClick={() => handleItemClick('account')} isActive={activeSection === 'account'} />
                    </nav>
                 </ScrollArea>
                 <div className="pt-4 border-t mt-4">
                     <Button variant="ghost" onClick={onLogout} className="w-full justify-start text-red-500 hover:text-red-500 hover:bg-red-500/10">
                        <LogOut size={18} className="mr-3"/> Se déconnecter
                     </Button>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <main className="p-8">
                    {renderContent()}
                </main>
            </ScrollArea>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Voulez-vous vraiment supprimer votre compte ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est définitive et irréversible. Toutes vos données (profil, messages, etc.) seront supprimées de nos serveurs.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className={buttonVariants({ variant: "destructive" })}>
                            Oui, supprimer mon compte
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};


// --- Main App Component ---
const FicheApp = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeCommunityChat, setActiveCommunityChat] = useState<Community | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user as FirebaseUser | null);
      if (!user) {
        setActiveCommunityChat(null);
        setActiveTab('chat');
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Déconnexion', description: 'Vous avez été déconnecté.' });
    } catch (error: any) {
      toast({ variant: "destructive", title: 'Erreur', description: error.message });
    }
  };

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
  
  const handleEnterCommunity = (community: Community) => {
    if (community.members.includes(currentUser.uid)) {
      setActiveCommunityChat(community);
    } else {
      toast({
        variant: 'destructive',
        title: 'Accès refusé',
        description: 'Vous devez être membre pour entrer dans ce salon.',
      });
    }
  };
  
  if (activeCommunityChat) {
    return <CommunityChatRoom community={activeCommunityChat} onBack={() => setActiveCommunityChat(null)} currentUser={currentUser} />;
  }
  
  const BottomNav = () => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-10">
        <div className="flex justify-around">
            <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center justify-center h-16 w-full ${activeTab === 'chat' ? 'text-primary' : 'text-muted-foreground'}`}>
                <MessageCircle size={24} />
                <span className="text-xs mt-1">Chat</span>
            </button>
             <button onClick={() => setActiveTab('communities')} className={`flex flex-col items-center justify-center h-16 w-full ${activeTab === 'communities' ? 'text-primary' : 'text-muted-foreground'}`}>
                <Users size={24} />
                <span className="text-xs mt-1">Communautés</span>
            </button>
             <button onClick={() => setActiveTab('messages')} className={`flex flex-col items-center justify-center h-16 w-full ${activeTab === 'messages' ? 'text-primary' : 'text-muted-foreground'}`}>
                <Mail size={24} />
                <span className="text-xs mt-1">Messages</span>
            </button>
             <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center justify-center h-16 w-full ${activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'}`}>
                <Settings size={24} />
                <span className="text-xs mt-1">Paramètres</span>
            </button>
        </div>
    </nav>
);

  return (
    <AudioPlayerProvider>
      <div className="h-screen bg-background text-foreground">
        <div className="flex h-full">
            {/* Desktop Sidebar */}
            <aside className="w-64 flex-col bg-white dark:bg-gray-900 border-r border-border p-4 hidden md:flex">
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

            {/* Main Content */}
            <main className="flex-1 flex flex-col pb-16 md:pb-0">
                {activeTab === 'chat' && <ChatInterface currentUser={currentUser} />}
                {activeTab === 'communities' && <CommunitiesTab currentUser={currentUser} onEnterCommunity={handleEnterCommunity} />}
                {activeTab === 'messages' && <MessagesTab currentUser={currentUser}/>}
                {activeTab === 'settings' && <SettingsTab theme={theme} setTheme={setTheme} currentUser={currentUser} onLogout={handleLogout} />}
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
      </div>
    </AudioPlayerProvider>
  );
};

export default FicheApp;
