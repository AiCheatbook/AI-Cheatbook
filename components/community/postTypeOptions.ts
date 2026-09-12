import {
  MessageCircle,
  HelpCircle,
  BarChart3,
  Sparkles,
  Palette,
  type LucideIcon,
} from "lucide-react";

export type PostType =
  | "question"
  | "discussion"
  | "prompt"
  | "poll"
  | "work";

export type PostTypeOption = {
  value: PostType;
  label: string;
  icon: LucideIcon;
  color: string;
};

export const TYPE_OPTIONS: PostTypeOption[] = [
  {
    value: "discussion",
    label: "Discussion",
    icon: MessageCircle,
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    value: "question",
    label: "Question",
    icon: HelpCircle,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    value: "poll",
    label: "Poll",
    icon: BarChart3,
    color: "bg-green-500/10 text-green-600",
  },
  {
    value: "prompt",
    label: "Prompt",
    icon: Sparkles,
    color: "bg-brand/10 text-brand-text",
  },
  {
    value: "work",
    label: "Share Work",
    icon: Palette,
    color: "bg-pink-500/10 text-pink-600",
  },
];
