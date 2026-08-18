export type ConceptKeyword = {
  id: string;
  label: string;
  description?: string;
};

export type Concept = {
  slug: string;
  title: string;
  category: string;

  description: string;

  image: string;

  prompt: string;

  keywords: ConceptKeyword[];

  aiTools: string[];

  author: {
    name: string;
    verified: boolean;
  };

  comments: {
    id: string;
    name: string;
    comment: string;
    type: "compliment" | "improvement";
  }[];
};

export const concepts: Concept[] = [
  {
    slug: "static-shot",

    title: "Static Shot",

    category: "Filmmaking",

    description:
      "A setup where the camera remains completely still, with no panning, tilting, zooming, or tracking. While objects, weather, and actors move inside the frame, the frame itself stays locked off—usually mounted on a tripod—allowing the audience to focus entirely on composition, blocking, and performance.",

    image: "/concepts/static-shot.jpg",

    prompt:
      "Locked-off static shot. Movement: hold one fixed camera position for the full clip. Speed: still and steady. Framing: keep the same angle, height, lens distance and composition. End: finish with the same framing and camera position.",

    keywords: [
      {
        id: "static-shot",
        label: "Static Shot",
        description:
          "Keep the camera completely still throughout the shot.",
      },

      {
        id: "locked-off",
        label: "Locked-off Static Shot",
        description:
          "Lock the camera in one fixed position with no camera movement.",
      },

      {
        id: "fixed-camera-position",
        label: "Fixed Camera Position",
        description:
          "Maintain the same camera position throughout the scene.",
      },

      {
        id: "stable-framing",
        label: "Stable Framing",
        description:
          "Keep the framing consistent from beginning to end.",
      },

      {
        id: "no-camera-movement",
        label: "No Camera Movement",
        description:
          "Prevent panning, tilting, tracking, zooming and other camera movement.",
      },
    ],

    aiTools: [
      "Veo",
      "Runway",
    ],

    author: {
      name: "AI Cheatbook",
      verified: true,
    },

    comments: [
      {
        id: "comment-1",
        name: "Creator",
        comment:
          "I have tried it and it works really well.",
        type: "compliment",
      },

      {
        id: "comment-2",
        name: "Creator",
        comment:
          "Camera movement was still too fast in my result.",
        type: "improvement",
      },
    ],
  },
];