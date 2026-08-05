import "server-only";

const WORD_BANK: Record<string, string[]> = {
  Animals: ["elephant", "penguin", "octopus", "giraffe", "kangaroo", "dolphin", "hedgehog", "flamingo"],
  Food: ["pizza", "sushi", "pancake", "watermelon", "taco", "popcorn", "spaghetti", "croissant"],
  Objects: ["umbrella", "guitar", "telescope", "backpack", "lighthouse", "bicycle", "candle", "kite"],
  Places: ["volcano", "waterfall", "castle", "desert", "igloo", "greenhouse", "windmill", "campfire"],
  Actions: ["juggling", "sleeping", "swimming", "sneezing", "dancing", "painting", "climbing", "yawning"]
};

export function pickRandomWord(): { word: string; category: string } {
  const categories = Object.keys(WORD_BANK);
  const category = categories[Math.floor(Math.random() * categories.length)]!;
  const words = WORD_BANK[category]!;
  const word = words[Math.floor(Math.random() * words.length)]!;
  return { word, category };
}

export function checkGuess(guess: string, word: string): boolean {
  return guess.trim().toLowerCase() === word.trim().toLowerCase();
}
