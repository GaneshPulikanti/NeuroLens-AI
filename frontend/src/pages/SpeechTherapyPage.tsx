import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Volume2,
  CheckCircle2,
  RefreshCw,
  Heart,
  AlertTriangle,
  Lightbulb,
  Music,
  ArrowRight,
  ShieldCheck,
  Smile,
} from 'lucide-react';

export const SpeechTherapyPage: React.FC = () => {
  // Flashcard Drill State
  const flashcards = [
    {
      word: 'Watch / Clock',
      hint: 'Worn on the wrist or hanging on the wall to tell time.',
      firstLetter: 'W',
      category: 'Everyday Objects',
      syllables: 'Watch (1 syllable)',
    },
    {
      word: 'Coffee Cup',
      hint: 'Used in the morning to drink hot tea or coffee.',
      firstLetter: 'C',
      category: 'Kitchen & Dining',
      syllables: 'Cof-fee Cup (3 syllables)',
    },
    {
      word: 'House Keys',
      hint: 'Metal object used to lock or unlock your front door.',
      firstLetter: 'K',
      category: 'Everyday Essentials',
      syllables: 'House Keys (2 syllables)',
    },
    {
      word: 'Eyeglasses',
      hint: 'Worn to see clearly and read small print.',
      firstLetter: 'G',
      category: 'Personal Care',
      syllables: 'Eye-glass-es (3 syllables)',
    },
    {
      word: 'Water Bottle',
      hint: 'Carried during walks to stay hydrated.',
      firstLetter: 'W',
      category: 'Health & Hydration',
      syllables: 'Wa-ter Bot-tle (4 syllables)',
    },
  ];

  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [completedCount, setCompletedCount] = useState<number>(0);

  const card = flashcards[currentCardIndex];

  const handleNextCard = () => {
    setShowHint(false);
    setShowAnswer(false);
    setCompletedCount((c) => c + 1);
    setCurrentCardIndex((i) => (i + 1) % flashcards.length);
  };

  // Repetition practice phrases
  const phrases = [
    { text: 'Good morning, how are you today?', context: 'Daily Greeting', beats: 4 },
    { text: 'I would like a glass of water, please.', context: 'Essential Need', beats: 4 },
    { text: 'Please give me a moment to think.', context: 'Pacing & Patience', beats: 4 },
    { text: 'Can we try again slowly?', context: 'Communication Repair', beats: 4 },
    { text: 'Thank you for helping me today.', context: 'Social Connection', beats: 3 },
  ];

  const [activePhrase, setActivePhrase] = useState<number>(0);
  const [tapCount, setTapCount] = useState<number>(0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Heart className="w-4 h-4 text-rose-500" />
          <span>Patient & Family Recovery Toolkit</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Daily Speech Exercises & Care Guide
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
          Simple, research-backed exercises you can practice at home every day to strengthen neuroplasticity, word recall, and functional conversation.
        </p>
      </div>

      {/* Grid: 2 Interactive Drills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Exercise 1: Word-Finding & Picture Naming Flashcard Drill */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Word Retrieval & Naming Drill
                </h3>
                <span className="text-xs text-slate-500">Card {currentCardIndex + 1} of {flashcards.length}</span>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
              Completed: {completedCount}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Read the clue and try to recall and say the word aloud. Don't rush; saying the first sound helps unlock the word.
          </p>

          {/* Flashcard Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-950 dark:to-blue-950/20 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4 min-h-[220px]">
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800">
              {card.category}
            </span>

            <p className="text-base font-medium text-slate-800 dark:text-slate-200 max-w-sm italic">
              "{card.hint}"
            </p>

            {showHint && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                First letter sound: <strong className="text-sm font-mono uppercase">{card.firstLetter}</strong> • Rhythm: {card.syllables}
              </div>
            )}

            {showAnswer ? (
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase font-semibold">Word:</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {card.word}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                Can you think of the word?
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>{showHint ? 'Hide Clue' : 'Show Clue'}</span>
            </button>

            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="flex-1 py-2.5 px-3 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showAnswer ? 'Hide Word' : 'Reveal Word'}</span>
            </button>

            <button
              onClick={handleNextCard}
              className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Next Card</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Exercise 2: Melodic Repetition Drill (Rhythmic Speech) */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Melodic Rhythm & Repetition Drill
              </h3>
              <span className="text-xs text-slate-500">Taps the right hemisphere to help voice output</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Neuroscientists found that speaking with a gentle rhythm or melody bypasses left-hemisphere stroke damage. Tap the beats as you say each phrase:
          </p>

          {/* Phrase Selector */}
          <div className="space-y-2">
            {phrases.map((p, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setActivePhrase(idx);
                  setTapCount(0);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                  activePhrase === idx
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Music className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>"{p.text}"</span>
                </div>
                <span className="text-[10px] text-slate-400">{p.context}</span>
              </div>
            ))}
          </div>

          {/* Interactive Rhythm Metronome / Tap Box */}
          <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 text-center space-y-3">
            <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
              Say phrase out loud while tapping rhythm:
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              "{phrases[activePhrase].text}"
            </div>

            <div className="flex items-center justify-center space-x-2 pt-1">
              {Array.from({ length: phrases[activePhrase].beats }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    tapCount > i
                      ? 'bg-purple-600 border-purple-600 scale-110'
                      : 'border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() =>
                setTapCount((c) => (c >= phrases[activePhrase].beats ? 1 : c + 1))
              }
              className="py-2 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Tap Rhythm Beat ({tapCount}/{phrases[activePhrase].beats})
            </button>
          </div>
        </div>
      </div>

      {/* Caregiver & Family Communication Rules */}
      <div className="p-8 bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Golden Rules for Family & Communication Partners
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Practical ways to support conversation at home without creating stress or frustration
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              1. Give Extra Time (The 10-Second Rule)
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Resist the urge to finish words or complete sentences for the person. Pauses allow the brain to search and activate vocabulary circuits.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              2. Do Not Speak Loudly
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Aphasia is an impairment of language processing, not hearing loss. Speak in your normal tone of voice, using natural inflection.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              3. Use Multimodal Clues
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Encourage drawing, pointing to objects, gestures, or writing first letters. All communication methods are equally valid and build confidence.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              4. Remember: Intelligence is Preserved
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              The person's memories, thoughts, humor, and dignity remain intact. Talk with them as an adult partner, never speaking down.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Stroke Warning Banner (F.A.S.T) */}
      <div className="p-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-rose-900 dark:text-rose-200 block">
              Emergency Note — If new or sudden stroke symptoms appear, call 911 / emergency services immediately:
            </span>
            <span className="text-rose-700 dark:text-rose-300 mt-0.5 block">
              <strong>F</strong>ace drooping • <strong>A</strong>rm weakness • <strong>S</strong>peech difficulty • <strong>T</strong>ime to call emergency
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
