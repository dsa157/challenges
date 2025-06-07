// Data templates for challenges

const challengesData = {
  may: {
    'mermay.txt': `
May 1 - Mermaid
May 2 - Mermaid in a different art style
May 3 - Mermaid with a pet
May 4 - Mermaid with a trident
May 5 - Mermaid in a different culture
May 6 - Mermaid with a friend
May 7 - Mermaid in a different environment
May 8 - Mermaid with a treasure
May 9 - Mermaid with a sea creature
May 10 - Mermaid with a human
May 11 - Mermaid with a ship
May 12 - Mermaid with a sea monster
May 13 - Mermaid with a pearl
May 14 - Mermaid with a crown
May 15 - Mermaid with a seashell
May 16 - Mermaid with a mirror
May 17 - Mermaid with a musical instrument
May 18 - Mermaid with a tail pattern
May 19 - Mermaid with a sea plant
May 20 - Mermaid with a treasure chest
May 21 - Mermaid with a sea horse
May 22 - Mermaid with a dolphin
May 23 - Mermaid with a shark
May 24 - Mermaid with an octopus
May 25 - Mermaid with a jellyfish
May 26 - Mermaid with a turtle
May 27 - Mermaid with a whale
May 28 - Mermaid with a school of fish
May 29 - Mermaid with a coral reef
May 30 - Mermaid with a shipwreck
May 31 - Mermaid with a sunset
`,
    'monai.txt': `
May 1 - Portrait
May 2 - Full body
May 3 - Close-up
May 4 - Profile
May 5 - Back view
May 6 - High angle
May 7 - Low angle
May 8 - Silhouette
May 9 - Action pose
May 10 - Sitting
May 11 - Lying down
May 12 - Jumping
May 13 - Running
May 14 - Dancing
May 15 - Fighting
May 16 - Casting a spell
May 17 - Using a weapon
May 18 - Wielding magic
May 19 - With an animal companion
May 20 - With a pet
May 21 - With a mount
May 22 - With a vehicle
May 23 - With a tool
May 24 - With a musical instrument
May 25 - With a book
May 26 - With a piece of technology
May 27 - With a piece of art
May 28 - With a piece of clothing
May 29 - With a piece of jewelry
May 30 - With a piece of armor
May 31 - With a piece of equipment
`,
    'nick.txt': `
May 1 - Draw a character with a hat
May 2 - Draw a character with glasses
May 3 - Draw a character with a scar
May 4 - Draw a character with a tattoo
May 5 - Draw a character with a piercing
May 6 - Draw a character with a weapon
May 7 - Draw a character with a pet
May 8 - Draw a character with a musical instrument
May 9 - Draw a character with a book
May 10 - Draw a character with a tool
May 11 - Draw a character with a piece of technology
May 12 - Draw a character with a piece of art
May 13 - Draw a character with a piece of clothing
May 14 - Draw a character with a piece of jewelry
May 15 - Draw a character with a piece of armor
May 16 - Draw a character with a piece of equipment
May 17 - Draw a character with a vehicle
May 18 - Draw a character with a mount
May 19 - Draw a character with a familiar
May 20 - Draw a character with a companion
May 21 - Draw a character with a sidekick
May 22 - Draw a character with a rival
May 23 - Draw a character with a nemesis
May 24 - Draw a character with a mentor
May 25 - Draw a character with a student
May 26 - Draw a character with a friend
May 27 - Draw a character with a family member
May 28 - Draw a character with a love interest
May 29 - Draw a character with a pet
May 30 - Draw a character with a magical item
May 31 - Draw a character with a legendary artifact
`
  },
  jun: {
    'nick.txt': `
Jun 01: Woman with glowing hands.
Jun 02: Woman with jellyfish hair.
Jun 03: Woman with flowing dress.
Jun 04: Woman with snake.
Jun 05: Angelic women with halos.
Jun 06: Woman with glowing eyes.
Jun 07: Pirate woman, skeletal figure.
Jun 08: Woman in intricate attire.
Jun 09: Woman with leopard print.
Jun 10: Woman with distorted face.
Jun 11: Fiery figure, strong glow.
Jun 12: Woman with colorful face.
Jun 13: Person with box on head.
Jun 14: People with glowing object.
Jun 15: Woman among koi fish.
Jun 16: Woman with flowing hair.
Jun 17: Woman with fiery hair.
Jun 18: Armored figure, glowing hand.
Jun 19: Woman with small cat.
Jun 20: Person with lion.
Jun 21: Woman in warm light.
Jun 22: Illuminate
Jun 23: Flamingo
Jun 24: Shine
Jun 25: Love
Jun 26: Butterfly
Jun 27: Glow
Jun 28: Celebrate`,
    'monai.txt': `
Jun 1: Coral Reef
Jun 2: Red-Orange
Jun 3: Origami
Jun 4: Odd place for a picnic
Jun 5: Egret
Jun 6: Blacklight
Jun 7: Sailboat
Jun 8: Best Friends
Jun 9: Orange-Yellow
Jun 10: Amigurumi
Jun 11: Unexpected Denim
Jun 12: Tiger
Jun 13: Bokeh Light
Jun 14: Beach Umbrella
Jun 15: Father's Day
Jun 16: Yellow-Green
Jun 17: Kirigami
Jun 18: Alien Visitors to Ancient Egypt
Jun 19: Axolotl
Jun 20: Back Lighting
Jun 21: Summer
Jun 22: Limoncello
Jun 23: Green-Blue
Jun 24: Kintsugi
Jun 25: Cyberpunk Swordsman
Jun 26: Shark
Jun 27: Chiaroscuro
Jun 28: Sand Castle
Jun 29: Mud Day
Jun 30: Blue-Purple
`  }
};

// Get challenges for a specific month and file
function getChallenges(month, filename) {
  const normalizedMonth = month.toLowerCase();
  if (challengesData[normalizedMonth] && challengesData[normalizedMonth][filename]) {
    return challengesData[normalizedMonth][filename];
  }
  return null;
}

// Get all files for a specific month
function getMonthFiles(month) {
  const normalizedMonth = month.toLowerCase();
  if (challengesData[normalizedMonth]) {
    return Object.keys(challengesData[normalizedMonth]).map(filename => ({
      name: filename,
      path: `${normalizedMonth}/${filename}`,
      content: challengesData[normalizedMonth][filename]
    }));
  }
  return [];
}

// Get all available months
function getAvailableMonths() {
  return Object.keys(challengesData);
}

module.exports = {
  getChallenges,
  getMonthFiles,
  getAvailableMonths
};
