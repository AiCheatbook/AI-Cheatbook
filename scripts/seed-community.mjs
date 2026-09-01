/*
 * One-time script to seed the Community
 * section with realistic starter content so
 * it doesn't look empty to new visitors.
 *
 * SAFETY:
 * - Uses your Supabase SERVICE ROLE KEY,
 *   which bypasses all RLS. Never commit
 *   this key or this script with the key
 *   filled in to a public repo.
 * - Creates 5 REAL accounts (this is
 *   required — Supabase enforces that every
 *   post belongs to a real authenticated
 *   user, there's no way to fake this at
 *   the table level).
 * - Safe to run more than once: existing
 *   accounts are detected and reused rather
 *   than duplicated.
 *
 * HOW TO RUN:
 * 1. In Supabase dashboard: Settings > API
 *    > copy the "service_role" key (NOT the
 *    anon key).
 * 2. In your terminal, in the project
 *    folder, run:
 *
 *    SUPABASE_URL=https://ahtuadjyzohkahunmyqs.supabase.co SUPABASE_SERVICE_ROLE_KEY=paste_key_here node scripts/seed-community.mjs
 *
 * 3. Delete or forget the key from your
 *    terminal history afterward — it's not
 *    stored anywhere by this script.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. See the comment at the top of this file for how to run it."
  );
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const PERSONAS = [
  {
    email: "priya.sharma.seed@aicheatbook.com",
    name: "Priya Sharma",
  },
  {
    email: "marcus.chen.seed@aicheatbook.com",
    name: "Marcus Chen",
  },
  {
    email: "sofia.alves.seed@aicheatbook.com",
    name: "Sofia Alves",
  },
  {
    email: "james.whitfield.seed@aicheatbook.com",
    name: "James Whitfield",
  },
  {
    email: "aisha.rahman.seed@aicheatbook.com",
    name: "Aisha Rahman",
  },
];

async function getOrCreateUser(persona) {
  // Check if a user with this email
  // already exists (safe to re-run).

  const { data: existing } =
    await supabase
      .from("profiles")
      .select("id")
      .eq("email", persona.email)
      .maybeSingle();

  if (existing) {
    console.log(
      `Reusing existing account: ${persona.name}`
    );
    return existing.id;
  }

  const { data, error } =
    await supabase.auth.admin.createUser({
      email: persona.email,
      password: crypto
        .randomUUID()
        .slice(0, 24),
      email_confirm: true,
      user_metadata: {
        full_name: persona.name,
      },
    });

  if (error) {
    throw new Error(
      `Failed to create ${persona.name}: ${error.message}`
    );
  }

  console.log(
    `Created account: ${persona.name}`
  );

  return data.user.id;
}

async function main() {
  console.log(
    "Setting up seed accounts...\n"
  );

  const userIds = {};

  for (const persona of PERSONAS) {
    userIds[persona.name] =
      await getOrCreateUser(persona);
  }

  console.log(
    "\nSeeding discussions & questions...\n"
  );

  const threads = [
    {
      user_id: userIds["Priya Sharma"],
      title:
        "What's the best way to keep character consistency across multiple AI video generations?",
      body: "I keep generating a character in one shot and they look completely different in the next. Anyone found a workflow that actually holds consistency across a sequence?",
      category: "prompt_help",
      content_kind: "question",
    },
    {
      user_id: userIds["Marcus Chen"],
      title:
        "Which AI tool do you find yourself using daily now?",
      body: "Curious what's actually stuck in people's daily workflow vs. what was just a fun experiment for a week.",
      category: "general",
      content_kind: "discussion",
    },
    {
      user_id: userIds["Sofia Alves"],
      title:
        "Sharing my Midjourney lighting cheat sheet",
      body: "Put together a quick reference for lighting terms that actually change the output — golden hour, rim light, volumetric, softbox. Happy to share the full list if people find this useful.",
      category: "showcase",
      content_kind: "discovery",
    },
    {
      user_id: userIds["James Whitfield"],
      title:
        "Anyone found a good workflow for turning a blog post into an AI video script?",
      body: "I write long-form posts and want to repurpose them into short video scripts without losing the original point. Looking for a repeatable process, not a one-off prompt.",
      category: "prompt_help",
      content_kind: "question",
    },
  ];

  const threadIds = {};

  for (const thread of threads) {
    const { data, error } = await supabase
      .from("community_threads")
      .insert(thread)
      .select("id")
      .single();

    if (error) {
      console.error(
        `Failed to insert thread "${thread.title}":`,
        error.message
      );
      continue;
    }

    threadIds[thread.title] = data.id;
    console.log(`Posted: ${thread.title}`);
  }

  console.log(
    "\nSeeding replies...\n"
  );

  const consistencyQuestionId =
    threadIds[
      "What's the best way to keep character consistency across multiple AI video generations?"
    ];

  if (consistencyQuestionId) {
    const { data: acceptedReply } =
      await supabase
        .from("community_replies")
        .insert({
          thread_id:
            consistencyQuestionId,
          user_id:
            userIds["Aisha Rahman"],
          body: "Attach the SAME reference image across every generation and describe it in the prompt as 'the character from the reference image' rather than re-describing their appearance each time. Cut down my inconsistency by a lot.",
        })
        .select("id")
        .single();

    await supabase
      .from("community_replies")
      .insert({
        thread_id: consistencyQuestionId,
        user_id: userIds["Marcus Chen"],
        body: "Adding to this — locking the seed value where the tool supports it helps too, on top of the reference image trick.",
      });

    if (acceptedReply) {
      await supabase
        .from("community_threads")
        .update({
          accepted_reply_id:
            acceptedReply.id,
        })
        .eq(
          "id",
          consistencyQuestionId
        );

      console.log(
        "Marked an accepted answer on the character consistency question"
      );
    }
  }

  const dailyToolThreadId =
    threadIds[
      "Which AI tool do you find yourself using daily now?"
    ];

  if (dailyToolThreadId) {
    await supabase
      .from("community_replies")
      .insert([
        {
          thread_id: dailyToolThreadId,
          user_id:
            userIds["Sofia Alves"],
          body: "Honestly still Claude for anything I need to actually think through, and Midjourney for anything visual.",
        },
        {
          thread_id: dailyToolThreadId,
          user_id:
            userIds[
              "James Whitfield"
            ],
          body: "Veo has fully replaced my stock footage searches for short clips.",
        },
      ]);

    console.log(
      "Added replies to the daily tool discussion"
    );
  }

  console.log(
    "\nSeeding upvotes...\n"
  );

  for (const [
    title,
    threadId,
  ] of Object.entries(threadIds)) {
    // Give each thread 2-4 upvotes from
    // a rotating subset of personas.

    const voters = Object.values(
      userIds
    ).slice(0, 2 + (title.length % 3));

    for (const voterId of voters) {
      await supabase
        .from(
          "community_thread_votes"
        )
        .insert({
          thread_id: threadId,
          user_id: voterId,
        })
        .select()
        .maybeSingle();
    }
  }

  console.log(
    "\nSeeding polls...\n"
  );

  const polls = [
    {
      user_id: userIds["Priya Sharma"],
      question:
        "Which AI video generator gives you the best results?",
      description:
        "Curious what the community is actually reaching for.",
      category: "general",
      options: [
        "Veo",
        "Runway",
        "Kling",
        "Pika",
      ],
    },
    {
      user_id: userIds["James Whitfield"],
      question:
        "How often do you use structured prompt formats (like Filmmaking or JSON)?",
      description: null,
      category: "prompt_help",
      options: [
        "Always",
        "Sometimes",
        "Rarely",
        "Never tried",
      ],
    },
  ];

  for (const poll of polls) {
    const { data: pollRow, error } =
      await supabase
        .from("community_polls")
        .insert({
          user_id: poll.user_id,
          question: poll.question,
          description: poll.description,
          category: poll.category,
          is_multiple_choice: false,
        })
        .select("id")
        .single();

    if (error) {
      console.error(
        `Failed to insert poll "${poll.question}":`,
        error.message
      );
      continue;
    }

    const optionRows = poll.options.map(
      (text, index) => ({
        poll_id: pollRow.id,
        option_text: text,
        sort_order: index,
      })
    );

    const { data: insertedOptions } =
      await supabase
        .from(
          "community_poll_options"
        )
        .insert(optionRows)
        .select("id");

    console.log(
      `Posted poll: ${poll.question}`
    );

    if (insertedOptions) {
      // Distribute a handful of votes
      // across options and personas so
      // the results look real.

      const voterIds = Object.values(
        userIds
      );

      let voterIndex = 0;

      for (
        let i = 0;
        i < insertedOptions.length;
        i++
      ) {
        const votesForThisOption =
          insertedOptions.length - i;

        for (
          let v = 0;
          v < votesForThisOption &&
          voterIndex < voterIds.length;
          v++
        ) {
          await supabase
            .from(
              "community_poll_votes"
            )
            .insert({
              poll_id: pollRow.id,
              option_id:
                insertedOptions[i].id,
              user_id:
                voterIds[voterIndex],
            })
            .select()
            .maybeSingle();

          voterIndex++;
        }

        voterIndex = 0;
      }
    }
  }

  console.log(
    "\n✅ Done seeding the community."
  );
}

main().catch((err) => {
  console.error(
    "Seeding failed:",
    err
  );
  process.exit(1);
});
