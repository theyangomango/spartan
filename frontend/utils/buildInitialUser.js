import makeID from '../../backend/helper/makeID';
import { SPARTAN_ACCOUNT } from '../constants/spartanAccount';

function cloneTemplate(exercises, name) {
  return {
    exercises: exercises.map((exercise) => ({
      muscle: exercise.muscle,
      name: exercise.name,
      sets: exercise.sets.map((set) => ({ ...set })),
    })),
    lastDate: null,
    name,
    tid: makeID(),
  };
}

const TEMPLATE_PRESETS = [
  {
    name: 'Push (Spartan)',
    exercises: [
      { muscle: 'Chest', name: 'Bench Press (Barbell)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Chest', name: 'Incline Bench (Barbell)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Chest', name: 'Chest Fly (Machine)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Shoulders', name: 'Shoulder Press (Machine)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Arms', name: 'Standing Tricep Extension (Dumbbell)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
    ],
  },
  {
    name: 'Pull (Spartan)',
    exercises: [
      { muscle: 'Back', name: 'Pull-Up (Assisted)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Back', name: 'Seated Row (Machine)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Shoulders', name: 'Lateral Raise (Dumbell)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Shoulders', name: 'Front Raise (Dumbell)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Arms', name: 'Preacher Curl (Machine)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
    ],
  },
  {
    name: 'Legs (Spartan)',
    exercises: [
      { muscle: 'Legs', name: 'Leg Press (Machine)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Legs', name: 'Calf Raise on Leg Press (Machine)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Legs', name: 'Glute-Ham Raise', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Legs', name: 'Hip Adduction (Machine)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
      { muscle: 'Legs', name: 'Leg Extension (Machine)', sets: [{ previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }, { previous: null, reps: 0, weight: 0, type: null }] },
    ],
  },
];

export default function buildInitialUser({
  uid,
  handle,
  name,
  email = null,
  phoneNumber = null,
  image = '',
  password = null,
  authProvider = 'password',
  extra = {},
}) {
  const safeImage = image || '';
  const now = Date.now();

  const templates = TEMPLATE_PRESETS.map((preset) => cloneTemplate(preset.exercises, preset.name));

  return {
    bio: '',
    completedWorkouts: [],
    currentWorkout: null,
    email,
    phoneNumber,
    exploreFeedPosts: [],
    feedPosts: [],
    feedStories: [
      {
        handle,
        name,
        pfp: safeImage,
        stories: [],
        uid,
      },
    ],
    followerCount: 0,
    followers: [],
    following: [{ ...SPARTAN_ACCOUNT }],
    followingCount: 1,
    handle,
    pfp: safeImage,
    image: safeImage,
    joined: now,
    lastActive: now,
    messages: [],
    name,
    notificationEvents: [],
    notificationNewComments: 0,
    notificationNewEvents: 0,
    notificationNewLikes: 0,
    password,
    authProvider,
    postCount: 0,
    posts: [],
    progressPhotos: [],
    savedPosts: [],
    statsExercises: {},
    statsHexagon: {
      overall: 0,
      abs: 0,
      legs: 0,
      chest: 0,
      back: 0,
      arms: 0,
      shoulders: 0,
    },
    statsTotalHours: 0,
    statsTotalVolume: 0,
    statsTotalWorkouts: 0,
    templates,
    uid,
    ...extra,
  };
}
