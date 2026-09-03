import { redirect } from "next/navigation";

/*
 * Community became the site's Home page —
 * its content now lives at app/page.tsx.
 * This redirect keeps old /community links
 * (bookmarks, external links, search engine
 * index) working instead of breaking them.
 */

export default function CommunityRedirect() {
  redirect("/");
}
