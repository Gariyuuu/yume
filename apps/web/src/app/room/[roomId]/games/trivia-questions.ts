import "server-only";

/**
 * `import "server-only"` makes Next.js fail the build if a Client
 * Component ever imports this file — the only thing stopping the answer
 * key from shipping in the browser bundle (see packages/game-sdk/src/trivia.ts's
 * header comment on why the engine itself never sees this data).
 */
export type TriviaQuestion = {
  id: string;
  text: string;
  category: string;
  choices: string[];
  correctIndex: number;
};

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { id: "q1", text: "What is the largest planet in our solar system?", category: "Science", choices: ["Earth", "Jupiter", "Saturn", "Neptune"], correctIndex: 1 },
  { id: "q2", text: "Which ocean is the largest by surface area?", category: "Geography", choices: ["Atlantic", "Indian", "Arctic", "Pacific"], correctIndex: 3 },
  { id: "q3", text: "How many strings does a standard guitar have?", category: "Music", choices: ["4", "5", "6", "7"], correctIndex: 2 },
  { id: "q4", text: "What is the chemical symbol for gold?", category: "Science", choices: ["Go", "Gd", "Au", "Ag"], correctIndex: 2 },
  { id: "q5", text: "Which country is home to the Great Barrier Reef?", category: "Geography", choices: ["Brazil", "Australia", "Thailand", "Mexico"], correctIndex: 1 },
  { id: "q6", text: "In a standard deck of cards, how many total cards are there?", category: "Games", choices: ["48", "50", "52", "54"], correctIndex: 2 },
  { id: "q7", text: "What is the smallest prime number?", category: "Math", choices: ["0", "1", "2", "3"], correctIndex: 2 },
  { id: "q8", text: "Which planet is known as the Red Planet?", category: "Science", choices: ["Venus", "Mars", "Mercury", "Jupiter"], correctIndex: 1 },
  { id: "q9", text: "How many continents are there on Earth?", category: "Geography", choices: ["5", "6", "7", "8"], correctIndex: 2 },
  { id: "q10", text: "What is the freezing point of water in Celsius?", category: "Science", choices: ["-10", "0", "10", "32"], correctIndex: 1 },
  { id: "q11", text: "Which instrument has 88 keys?", category: "Music", choices: ["Organ", "Piano", "Accordion", "Harpsichord"], correctIndex: 1 },
  { id: "q12", text: "What is the capital of Japan?", category: "Geography", choices: ["Seoul", "Beijing", "Tokyo", "Bangkok"], correctIndex: 2 },
  { id: "q13", text: "How many sides does a hexagon have?", category: "Math", choices: ["5", "6", "7", "8"], correctIndex: 1 },
  { id: "q14", text: "What gas do plants absorb from the atmosphere?", category: "Science", choices: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], correctIndex: 2 },
  { id: "q15", text: "Which sport uses a shuttlecock?", category: "Sports", choices: ["Tennis", "Badminton", "Squash", "Table tennis"], correctIndex: 1 },
  { id: "q16", text: "What is the longest river in the world?", category: "Geography", choices: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctIndex: 1 },
  { id: "q17", text: "How many bones are in the adult human body?", category: "Science", choices: ["186", "206", "226", "246"], correctIndex: 1 },
  { id: "q18", text: "What is the main ingredient in guacamole?", category: "Food", choices: ["Tomato", "Avocado", "Onion", "Lime"], correctIndex: 1 },
  { id: "q19", text: "Which planet has the most moons confirmed as of recent counts?", category: "Science", choices: ["Jupiter", "Saturn", "Uranus", "Neptune"], correctIndex: 1 },
  { id: "q20", text: "What is the currency of the United Kingdom?", category: "General", choices: ["Euro", "Dollar", "Pound", "Franc"], correctIndex: 2 },
  { id: "q21", text: "How many players are on a standard soccer team on the field?", category: "Sports", choices: ["9", "10", "11", "12"], correctIndex: 2 },
  { id: "q22", text: "What is the tallest mountain in the world?", category: "Geography", choices: ["K2", "Kilimanjaro", "Everest", "Denali"], correctIndex: 2 },
  { id: "q23", text: "Which shape has three sides?", category: "Math", choices: ["Square", "Triangle", "Pentagon", "Hexagon"], correctIndex: 1 },
  { id: "q24", text: "What is the closest star to Earth?", category: "Science", choices: ["Proxima Centauri", "The Sun", "Sirius", "Alpha Centauri"], correctIndex: 1 },
  { id: "q25", text: "Which country invented pizza as we know it today?", category: "Food", choices: ["France", "Greece", "Italy", "Spain"], correctIndex: 2 },
  { id: "q26", text: "How many minutes are in a full day?", category: "Math", choices: ["1200", "1440", "1600", "2400"], correctIndex: 1 },
  { id: "q27", text: "What do bees collect from flowers to make honey?", category: "Science", choices: ["Pollen", "Nectar", "Sap", "Dew"], correctIndex: 1 },
  { id: "q28", text: "Which continent is the Sahara Desert located on?", category: "Geography", choices: ["Asia", "Australia", "Africa", "South America"], correctIndex: 2 },
  { id: "q29", text: "What is the primary language spoken in Brazil?", category: "General", choices: ["Spanish", "Portuguese", "French", "Italian"], correctIndex: 1 },
  { id: "q30", text: "How many colors are traditionally listed in a rainbow?", category: "General", choices: ["5", "6", "7", "8"], correctIndex: 2 }
];

export function pickRandomQuestions(count: number, excludeIds: string[]): TriviaQuestion[] {
  const pool = TRIVIA_QUESTIONS.filter((q) => !excludeIds.includes(q.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
