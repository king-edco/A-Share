import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookOpen, GraduationCap, ListTree } from "lucide-react";

import { Button } from "@/components/ui/button";

const slides = [
  {
    icon: GraduationCap,
    title: "Révise pour ton examen, jour après jour.",
    description:
      "A-Share t'aide à préparer ton Bac, ton Probatoire ou ton GCE pas à pas, avec un plan clair.",
  },
  {
    icon: ListTree,
    title: "Traverse les chapitres de ta série sans te perdre.",
    description:
      "Choisis ta filière, suis ta progression, et travaille les matières qui comptent vraiment.",
  },
  {
    icon: BookOpen,
    title: "Rassemble tes matières et ton programme au même endroit.",
    description:
      "Centré sur les examens du Cameroun, avec le syllabus organisée pour toi.",
  },
];

export function WelcomeStep({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div className="space-y-8 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <slide.icon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{slide.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {slide.description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition ${
              i === index ? "w-6 bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={isLast ? onNext : () => setIndex(index + 1)}
          size="lg"
          className="w-full"
        >
          Continuer
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Passer
        </Button>
      </div>
    </div>
  );
}
