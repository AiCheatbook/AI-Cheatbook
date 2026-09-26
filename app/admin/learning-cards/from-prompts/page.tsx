import { redirect } from "next/navigation";

// Replaced by the Prompt Style Page editor, which can also edit
// existing galleries.
export default function LearningCardFromPromptsPage() {
  redirect("/admin/learning-cards/gallery/new");
}
